// 种子生成器 v1.21 的共用部分（颜色分析、L-system 植物画法 lsys v1、种子形状、种子包编码）。
// 由 v1.21.html 抽出，交流平台等页面共用；修改画法时请另存 seedcore_lsys2.js，旧种子按旧版本画。

const INK = '#201e1d';
const ACTS = {
  nature: { name: '山・草原', form: '蕨类' },
  hike: { name: '徒步', form: '灌木' },
  sea: { name: '海', form: '藻类' },
  animal: { name: '动物', form: '开花植物' },
  food: { name: '饮食', form: '香草' },
  ride: { name: '骑行', form: '倾斜的草本' },
  other: { name: '未分类', form: '草本' }
};
const SAMPLE = [['p1', '13:48', 'animal'], ['p2', '13:48', 'nature'], ['p3', '13:52', 'ride'], ['p4', '15:08', 'food'], ['p5', '16:32', 'ride'], ['p6', '17:03', 'animal'], ['p7', '17:21', 'sea'], ['p8', '17:27', 'ride']]
  .map(r => ({ src: 'photos/' + r[0] + '.jpg', name: r[0], time: r[1], act: r[2] }));
const h2r = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const r2h = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = h2r(a), y = h2r(b); return r2h(x.map((v, i) => v + (y[i] - v) * t)); };
const rgba = (h, a) => { const [r, g, b] = h2r(h); return `rgba(${r},${g},${b},${a})`; };
const hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return [0, 0, l]; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [(h * 60 + 360) % 360, s, l]; };
const tone = (hex, k, lo, hi) => { const [h, s, l] = hsl(h2r(hex)), S = Math.min(1, s * k), L = Math.min(hi, Math.max(lo, l)); const C = (1 - Math.abs(2 * L - 1)) * S, X = C * (1 - Math.abs((h / 60) % 2 - 1)), m = L - C / 2; const [r, g, b] = h < 60 ? [C, X, 0] : h < 120 ? [X, C, 0] : h < 180 ? [0, C, X] : h < 240 ? [0, X, C] : h < 300 ? [X, 0, C] : [C, 0, X]; return r2h([(r + m) * 255, (g + m) * 255, (b + m) * 255]); };
const lum = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const rng = s => { let a = s >>> 0 || 1; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const fmt = v => { v = ((Math.round(v) % 1440) + 1440) % 1440; return String(Math.floor(v / 60)).padStart(2, '0') + ':' + String(v % 60).padStart(2, '0'); };
const mixB = (a, b, t) => a.map((c, i) => mix(c, b[i], t));
const ease = x => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const SKY_N = 5;

// k-means（按亮度百分位初始化）。点是 [r,g,b, ...附加值]，附加值只求平均不参与距离
function kmeans(px, k) {
  const sorted = px.slice().sort((a, b) => lum(a) - lum(b));
  let C = Array.from({ length: k }, (_, i) => sorted[Math.floor((i + .5) / k * (sorted.length - 1))].slice(0, 3));
  let S;
  for (let it = 0; it < 10; it++) {
    S = C.map(() => new Array(px[0].length + 1).fill(0));
    px.forEach(p => { let bi = 0, bd = 1e9; C.forEach((c, i) => { const dd = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (dd < bd) { bd = dd; bi = i; } }); const s = S[bi]; p.forEach((v, q) => s[q] += v); s[p.length]++; });
    C = C.map((c, i) => S[i][px[0].length] ? S[i].slice(0, 3).map(v => v / S[i][px[0].length]) : c);
  }
  return C.map((c, i) => { const n = S[i][px[0].length]; return { c, n, extra: n ? S[i].slice(3, px[0].length).map(v => v / n) : [] }; });
}

function analyze(img) {
  const W = 64, H = Math.max(8, Math.round(64 * img.naturalHeight / img.naturalWidth));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data, px = [], grid = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
  const KM = kmeans(px, 5), C = KM.map(o => o.c).sort((a, b) => lum(a) - lum(b));
  // 基础色调：照片里面积最大的颜色（太暗、太亮的不算）
  const baseC = (KM.filter(o => lum(o.c) > 45 && lum(o.c) < 235).sort((a, b) => b.n - a.n)[0] || KM.sort((a, b) => b.n - a.n)[0]).c;
  let ai = 0, best = -1; C.forEach((c, i) => { const [, s, l] = hsl(c); const sc = s * (1 - Math.abs(l - 0.55) * 1.3); if (sc > best) { best = sc; ai = i; } });
  for (let gy = 0; gy < 12; gy++) for (let gx = 0; gx < 12; gx++) { const X = Math.floor((gx + .5) / 12 * W), Y = Math.floor((gy + .5) / 12 * H), k = (Y * W + X) * 4; grid.push({ u: (gx + .5) / 12, v: (gy + .5) / 12, c: [d[k], d[k + 1], d[k + 2]] }); }
  // 天空 5 色：画面上半部分里，去掉太暗、过曝和植物绿的像素 → 5 色 k-means → 按在画面里的高度从上到下排
  const sp = [];
  for (let r = 0; r < Math.floor(H * .5); r++) for (let q = 0; q < W; q++) {
    const p = px[r * W + q], L = lum(p); if (L > 248 || L < 45) continue;
    const [h, sa] = hsl(p); if (h > 60 && h < 170 && sa > .12) continue;
    sp.push([p[0], p[1], p[2], r / H, q / W]);
  }
  let sky = null, skyPos = null;
  if (sp.length > W * H * .5 * .06) {
    let cl = kmeans(sp, SKY_N).filter(o => o.n > 0).sort((a, b) => a.extra[0] - b.extra[0]);
    while (cl.length < SKY_N) cl.push(cl[cl.length - 1]);
    sky = cl.map(o => r2h(o.c));
    const big = cl.slice().sort((a, b) => b.n - a.n)[0];
    skyPos = { v: big.extra[0], u: big.extra[1] };
  }
  // 照片指纹：用像素算一个种子，同一张照片永远长出同一株，不同照片各不相同
  let hash = 2166136261; for (let i = 0; i < d.length; i += 3) { hash ^= d[i]; hash = Math.imul(hash, 16777619); }
  return { hash: hash >>> 0, base: r2h(baseC), pal: C.map(r2h), sky, skyPos, acc: r2h(C[ai]), accRGB: C[ai], grid, iw: img.naturalWidth, ih: img.naturalHeight };
}

// 一张照片 → 一株：花色只从这张照片里取
function flowerColors(a) {
  if (a.obj && a.objPal && Math.max(...a.objPal.map(c => hsl(h2r(c))[1])) < .16) {
    const light = a.objPal.slice().sort((x, y) => lum(h2r(y)) - lum(h2r(x)));
    return [tone(light[0], 1, .78, .92), tone(light[1], 1, .68, .85), tone(light[2], 1, .6, .8)];
  }
  const cols = a.obj && a.objPal ? [a.objAcc].concat(a.objPal) : [a.acc].concat(a.pal);
  const ranked = cols.map(c => { const [h, s, l] = hsl(h2r(c)), cool = h >= 170 && h <= 260 ? .25 : 1; return { c, s: s * (1 - Math.abs(l - .55)) * cool }; }).filter(o => o.s > .02).sort((x, y) => y.s - x.s).map(o => o.c);
  const uniq = []; ranked.forEach(c => { if (!uniq.some(u => h2r(u).reduce((s, v, q) => s + (v - h2r(c)[q]) ** 2, 0) < 900)) uniq.push(c); });
  let cl = (uniq.length ? uniq : [a.acc]).slice(0, 5).map(c => tone(c, 1.8, .5, .62));
  while (cl.length < 3) cl.push(mix(cl[0], '#ffffff', .25 + cl.length * .1));
  return cl;
}
function pickHue(pal, lo, hi, fb) { let b = null, bs = -1; pal.map(h2r).forEach(c => { const [h, s, l] = hsl(c); if (h >= lo && h <= hi && l > .2 && l < .75 && s > bs) { bs = s; b = c; } }); return b ? tone(r2h(b), 1.3, .45, .62) : fb; }

// 物体识别（COCO-SSD，在浏览器里运行）：活动 → 要找的物体
const OBJ = {
  ride: ['bicycle', 'motorcycle'],
  animal: ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'bear', 'zebra', 'giraffe', 'elephant'],
  food: ['pizza', 'sandwich', 'cake', 'donut', 'hot dog', 'bowl', 'cup', 'bottle', 'wine glass', 'banana', 'apple', 'orange', 'broccoli', 'carrot', 'dining table']
};
const OBJ_ZH = { person: '人', bicycle: '自行车', motorcycle: '摩托车', bird: '鸟', cat: '猫', dog: '狗', horse: '马', sheep: '羊', cow: '牛', bear: '熊', zebra: '斑马', giraffe: '长颈鹿', elephant: '象', pizza: '披萨', sandwich: '三明治', cake: '蛋糕', donut: '甜甜圈', 'hot dog': '热狗', bowl: '碗', cup: '杯子', bottle: '瓶子', 'wine glass': '酒杯' };
let detP = null;
const getDetector = () => detP || (detP = (window.cocoSsd ? cocoSsd.load({ base: 'mobilenet_v2', modelUrl: 'models/coco-ssd/model.json' }) : Promise.reject()).catch(() => null));
// 小物体（远处的自行车、树上的鸟）整张图里容易漏：整张 + 2×2 重叠切块各识别一次，再合并
async function detectTiled(det, img) {
  const W = img.naturalWidth, H = img.naturalHeight, out = [];
  const tiles = [[0, 0, W, H]];
  for (let gy = 0; gy < 2; gy++) for (let gx = 0; gx < 2; gx++) tiles.push([gx * W * .4, gy * H * .4, W * .6, H * .6]);
  const wanted = [].concat(OBJ.ride, OBJ.animal, OBJ.food);
  for (const [ti, [tx, ty, tw, th]] of tiles.entries()) {
    if (ti === 1 && out.some(p => wanted.includes(p.class))) break; // 整张就找到了，不用切块
    const c = document.createElement('canvas'), k = Math.min(1, 640 / Math.max(tw, th)); c.width = Math.round(tw * k); c.height = Math.round(th * k);
    c.getContext('2d').drawImage(img, tx, ty, tw, th, 0, 0, c.width, c.height);
    let ps = []; try { ps = await det.detect(c, 20, .3); } catch (e) {}
    ps.forEach(p => out.push({ ...p, bbox: [tx + p.bbox[0] / k, ty + p.bbox[1] / k, p.bbox[2] / k, p.bbox[3] / k] }));
  }
  return out;
}
// 场景识别（MobileNet / ImageNet 类别）：海、山・草原
const SCENE_K = { sea: ['seashore', 'sandbar', 'breakwater', 'promontory', 'pier', 'dock'], nature: ['alp', 'valley', 'volcano', 'cliff', 'lakeside', 'mountain', 'hay', 'rapeseed', 'daisy', 'geyser', 'yellow lady'] };
let sceneP = null;
const getScene = async () => null; // MobileNet 已由 CLIP 代替
async function classifyScene(net, img) {
  if (!net) return null;
  let r = []; try { r = await net.classify(img, 5); } catch (e) { return null; }
  const sum = k => r.filter(o => SCENE_K[k].some(w => o.className.toLowerCase().includes(w))).reduce((a, o) => a + o.probability, 0);
  const sea = sum('sea'), nat = sum('nature');
  return sea > .15 && sea >= nat ? 'sea' : nat > .15 ? 'nature' : null;
}
// CLIP（零样本图像分类，浏览器本地运行）：比 MobileNet 更准地认出场景和天气；第一次要下载约 90MB 模型，之后浏览器会缓存
const CLIP_SCENE = [['the sea', '海', 'sea'], ['a river bank', '河边', 'nature'], ['a pond or lake', '池塘', 'nature'], ['a grassy field', '草地', 'nature'], ['mountains', '山', 'nature'], ['a forest', '树林', 'nature'], ['a park', '公园', 'nature'], ['a city street', '街道', null], ['a bicycle', '自行车', 'ride'], ['a bird', '鸟', 'animal'], ['an animal', '动物', 'animal'], ['food on a table', '食物', 'food'], ['a picnic', '野餐', 'food']];
const CLIP_WEATHER = [['a clear blue sky', '晴'], ['a cloudy overcast sky', '阴'], ['a sunset sky', '黄昏'], ['a night sky', '夜']];
let clipP = null;
// 模型和运行库都放在本地文件夹 app/lib、app/models（不再从网上下载）
const getClip = () => clipP || (clipP = import('./lib/transformers/transformers.min.js').then(T => { T.env.allowRemoteModels = false; T.env.allowLocalModels = true; T.env.localModelPath = new URL('models/', location.href).href; T.env.backends.onnx.wasm.wasmPaths = new URL('lib/transformers/', location.href).href; return T.pipeline('zero-shot-image-classification', 'Xenova/clip-vit-base-patch32', { dtype: 'q8' }); }).catch(e => { console.warn('CLIP', e); return null; }));
window.getClip = () => getClip();
// 天气：CLIP 分不清晴和阴，所以先看照片天空的颜色——天空是饱和的蓝就是「晴」；暖色的天空或 CLIP 很确定是黄昏/夜时用那个；其余为「阴」
// 天气：只看照片天空的颜色（上面 3 色）
function weatherOf(a) {
  const sk = (a.sky || []).slice(0, 3).map(h => hsl(h2r(h))); if (!sk.length) return '';
  const L = sk.reduce((t, x) => t + x[2], 0) / sk.length;
  const all5 = (a.sky || []).map(h => hsl(h2r(h))), blue = sk.filter(([h, s, l]) => h >= 190 && h <= 235 && s > .22 && l > .35 && l < .9).length, warm = all5.filter(([h, s, l]) => (h < 50 || h > 330) && s > .25 && l > .5).length; // 暖色看全部 5 色（夕阳常在天空下部）
  if (L < .28) return '夜';
  if (warm >= 1) return '黄昏';
  if (blue >= 2) return '晴';
  return '阴';
}
async function clipTags(clf, img) {
  if (!clf) return null;
  const c = document.createElement('canvas'), k = 336 / Math.max(img.naturalWidth, img.naturalHeight); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/jpeg', .9);
  try {
    const sc = await clf(url, CLIP_SCENE.map(x => 'a photo of ' + x[0]));
    const s0 = CLIP_SCENE.find(x => 'a photo of ' + x[0] === sc[0].label);
    return { scene: s0[1], sceneAct: s0[2], sceneP: sc[0].score };
  } catch (e) { console.warn(e); return null; }
}
const best = (preds, list) => preds.filter(p => list.includes(p.class)).sort((x, y) => y.score - x.score)[0];
// 没有预设活动的照片：按识别结果定活动
function decideAct(preds, scene) {
  if (best(preds, OBJ.ride)) return 'ride';
  if (best(preds, OBJ.animal)) return 'animal';
  if (best(preds, OBJ.food)) return 'food';
  if (scene === 'sea') return 'sea';
  if (scene === 'nature') return best(preds, ['person']) ? 'hike' : 'nature';
  return 'other';
}
// 连线要连到的物体
const TARGET = { ride: [OBJ.ride, ['person']], animal: [OBJ.animal], food: [OBJ.food, ['person']], hike: [['person']] };
function pickObject(preds, act) {
  for (const list of TARGET[act] || []) { const c = best(preds, list); if (c) return { cls: c.class, score: c.score, bbox: c.bbox }; }
  return null;
}
function objColors(img, bb) {
  const c = document.createElement('canvas'); c.width = c.height = 40; const x = c.getContext('2d');
  x.drawImage(img, bb[0], bb[1], Math.max(1, bb[2]), Math.max(1, bb[3]), 0, 0, 40, 40);
  const d = x.getImageData(0, 0, 40, 40).data, px = []; for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
  const C = kmeans(px, 4).map(o => o.c).sort((a, b) => lum(a) - lum(b));
  let ai = 0, best = -1; C.forEach((c, i) => { const [, s, l] = hsl(c); const sc = s * (1 - Math.abs(l - 0.55) * 1.3) + .001 * l; if (sc > best) { best = sc; ai = i; } });
  return { objPal: C.map(r2h), objAcc: r2h(C[ai]) };
}

// 导出用的模糊：浏览器支持 ctx.filter 就用它，否则（Safari）用逐级缩小再放大
const CAN_FILTER = (() => { try { const x = document.createElement('canvas').getContext('2d'); x.filter = 'blur(2px)'; return x.filter === 'blur(2px)'; } catch (e) { return false; } })();
function softBlur(src, sigma) {
  const out = document.createElement('canvas'); out.width = src.width; out.height = src.height; const o = out.getContext('2d');
  if (CAN_FILTER) { o.filter = `blur(${sigma}px)`; o.drawImage(src, 0, 0); return out; }
  let cur = src, w = src.width, h = src.height; const steps = [];
  let f = 1; while (f * 2 <= sigma * 1.2) { f *= 2; w = Math.max(1, Math.round(src.width / f)); h = Math.max(1, Math.round(src.height / f)); const t = document.createElement('canvas'); t.width = w; t.height = h; const x = t.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, w, h); steps.push(t); cur = t; }
  for (let i = steps.length - 2; i >= 0; i--) { const t = steps[i], x = t.getContext('2d'); x.clearRect(0, 0, t.width, t.height); x.drawImage(cur, 0, 0, t.width, t.height); cur = t; }
  o.imageSmoothingQuality = 'high'; o.drawImage(cur, 0, 0, out.width, out.height); return out;
}

// ===== 植物形态的 f：活动 → L-system（公式出自 ABOP, Prusinkiewicz & Lindenmayer 1990） =====
// 模块写成数组：['F'] 或带参数 ['A', d]。P('F[+X]') 把字符串拆成单字符模块
const P = s => Array.from(s).map(c => [c]);
function derive(axiom, rules, n, cap = 90000) {
  let s = axiom;
  for (let i = 0; i < n; i++) {
    const o = [];
    for (const m of s) { const r = rules[m[0]]; const out = r ? r(m) : null; if (out) for (const x of out) o.push(x); else o.push(m); }
    if (o.length > cap) break;
    s = o;
  }
  return s;
}
// 随机 L-system（ABOP 1.7 节）：每次改写都可能镜像、或少长一个侧枝 → 每株的拓扑结构都不同
function vary(str, R, drop = .3, flip = .3) {
  let s = str;
  if (R() < flip) s = s.replace(/[+-]/g, c => c === '+' ? '-' : '+');
  if (R() < drop) {
    const gs = []; let dep = 0, st = -1;
    for (let i = 0; i < s.length; i++) { if (s[i] === '[') { if (!dep) st = i; dep++; } else if (s[i] === ']') { dep--; if (!dep) gs.push([st, i]); } }
    if (gs.length > 1) { const [a, b] = gs[Math.floor(R() * gs.length)]; s = s.slice(0, a) + s.slice(b + 1); }
  }
  return P(s);
}
const v3 = {
  add: (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k],
  rot: (v, ax, an) => { const c = Math.cos(an), s = Math.sin(an), d = v[0] * ax[0] + v[1] * ax[1] + v[2] * ax[2]; const cr = [ax[1] * v[2] - ax[2] * v[1], ax[2] * v[0] - ax[0] * v[2], ax[0] * v[1] - ax[1] * v[0]]; return [0, 1, 2].map(i => v[i] * c + cr[i] * s + ax[i] * d * (1 - c)); }
};
// 海龟解释：F 前进画线 / f 前进不画 / + − 左右转 / & ∧ 俯仰 / \ / 翻滚 / | 掉头 / [ ] 分枝 / ! 变细 / ' 换色 / { } 叶片多边形 / Q 之后的多边形算花
function turtle(mods, deltaDeg, opt = {}) {
  const Rj = opt.R || (() => .5), J = a => a * (1 + (Rj() - .5) * .4);
  const d = deltaDeg * Math.PI / 180, segs = [], polys = [], apex = [], st = [];
  let s = { p: [0, 0, 0], H: [0, 1, 0], L: [-1, 0, 0], U: [0, 0, 1], w: 1, ci: 0, fl: false, dep: 0 }, poly = null;
  const turn = (ax, an, a, b) => { s[a] = v3.rot(s[a], s[ax], an); s[b] = v3.rot(s[b], s[ax], an); };
  for (const m of mods) {
    const c = m[0];
    if (c === 'F' || c === 'f') {
      const len = (m.length > 1 ? m[1] : 1) * (poly ? 1 : 1 + (Rj() - .5) * .3), q = v3.add(s.p, s.H, len);
      if (poly) poly.push(q); else if (c === 'F') segs.push({ a: s.p, b: q, w: s.w, dep: s.dep });
      s.p = q;
    }
    else if (c === '+') turn('U', poly ? d : J(d), 'H', 'L'); else if (c === '-') turn('U', poly ? -d : -J(d), 'H', 'L');
    else if (c === '&') turn('L', poly ? d : J(d), 'H', 'U'); else if (c === '^') turn('L', poly ? -d : -J(d), 'H', 'U');
    else if (c === '\\') turn('H', J(d), 'L', 'U'); else if (c === '/') turn('H', -J(d), 'L', 'U');
    else if (c === '|') turn('U', Math.PI, 'H', 'L');
    else if (c === '!') s.w *= .72; else if (c === "'") s.ci++; else if (c === 'Q') s.fl = true;
    else if (c === '[') { st.push(s); s = { ...s, dep: s.dep + 1 }; }
    else if (c === ']') { s = st.pop() || s; }
    else if (c === '{') poly = [s.p];
    else if (c === '}') { if (poly && poly.length > 2) polys.push({ pts: poly, fl: s.fl, ci: s.ci }); poly = null; }
    else if (opt.apex && opt.apex.includes(c)) apex.push({ p: s.p, H: s.H });
  }
  return { segs, polys, apex, cells: [] };
}
// 藻类：Anabaena catenula 的细胞分裂（式 1.1），三条丝沿着波浪排开
function anabaena(R) {
  // 每条丝从一个细胞开始分裂；每一代每个细胞有 12% 的机会这一代不分裂（随机延迟），所以每条丝长度和排列都不同
  const cells = [], RULE = { ar: ['al', 'br'], al: ['bl', 'ar'], br: ['ar'], bl: ['al'] }, nf = 2 + Math.floor(R() * 3);
  for (let k = 0; k < nf; k++) {
    let s = ['ar']; const gen = 8 + Math.floor(R() * 4);
    for (let i = 0; i < gen; i++) s = s.flatMap(c => R() < .88 ? RULE[c] : [c]);
    let y = 0; const lean = (R() - .5) * .6 + (k - (nf - 1) / 2) * .22, ph = R() * 6, amp = 1.5 + R() * 2;
    s.forEach(c => { const len = c[0] === 'a' ? 1.7 : 1.05; const yy = y + len / 2; cells.push({ x: Math.sin(yy * .09 + ph) * amp * Math.min(1, yy / 30) + lean * yy * .35, y: yy, len, a: c[0] === 'a', k }); y += len + .12; });
  }
  return { segs: [], polys: [], apex: [], cells };
}
// 每张照片都从公理（ω）开始重新推导：照片指纹 → 随机数 → 迭代次数、分枝角度、每次改写的随机变化都由这张照片决定
const nOf = (R, n) => n - (R() < .5 ? 1 : 0);
const LSYS = {
  // 山・草原 → 蕨类：图 5.11 复叶（参数 L-system，D 顶端延迟，R 节间伸长率）；D 每张照片取 1–3
  nature: { name: '山・草原', form: '蕨类', src: 'ABOP 图 5.11', tip: 'leaflet', make: R => {
    const D = 1 + Math.floor(R() * 3), RR = [1.5, 1.25, 1.16][D - 1], n = [13, 19, 25][D - 1] - Math.floor(R() * 3);
    const A = m => m[1] > 0 ? [['A', m[1] - 1]] : R() < .12 ? [['F', 1], ['['], ['+'], ['A', D], [']'], ['F', 1], ['A', 0]] : [['F', 1], ['['], ['+'], ['A', D], [']'], ['['], ['-'], ['A', D], [']'], ['F', 1], ['A', 0]];
    return turtle(derive([['A', 0]], { A, F: m => [['F', m[1] * RR]] }, n), 45 * (.8 + R() * .4), { apex: 'A', R }); } },
  // 徒步 → 灌木：图 1.25
  hike: { name: '徒步', form: '灌木', src: 'ABOP 图 1.25', view: true, make: R => turtle(derive(P('A'), { A: () => vary("[&FL!A]/////'[&FL!A]///////'[&FL!A]", R, .3, 0), F: () => P('S/////F'), S: () => P('FL'), L: () => P("['''^^{-f+f+f-|-f+f+f}]") }, nOf(R, 5)), 22.5 * (.8 + R() * .4), { R }) },
  // 海 → 藻类：式 1.1 Anabaena catenula
  sea: { name: '海', form: '藻类', src: 'ABOP 式 1.1', make: R => anabaena(R) },
  // 动物 → 开花植物：图 1.26
  animal: { name: '动物', form: '开花植物', src: 'ABOP 图 1.26', view: true, make: R => turtle(derive(P('P'), { P: () => vary('I+[P+K]--//[--L]I[++L]-[PK]++PK', R, .25, .3), I: () => P('FS[//&&L][//^^L]FS'), S: () => P('SFS'), L: () => P("['{+f-ff-f+|+f-ff-f}]"), K: () => P("[Q&&&D'/W////W////W////W////W]"), D: () => P('FF'), W: () => P("['^F][{&&&&-f+f|-f+f}]") }, nOf(R, 5)), 18 * (.8 + R() * .4), { R }) },
  // 饮食 → 香草（迷迭香代用）：图 1.24e
  food: { name: '饮食', form: '香草', src: 'ABOP 图 1.24e', tip: 'bud', needles: true, make: R => turtle(derive(P('X'), { X: () => vary('F[+X][-X]FX', R, .25, .2), F: () => P('FF') }, nOf(R, 6)), 25.7 * (.8 + R() * .4), { apex: 'X', R }) },
  // 骑行 → 倾斜的草本：图 1.24f
  ride: { name: '骑行', form: '倾斜的草本', src: 'ABOP 图 1.24f', tip: 'bud', make: R => turtle(derive(P('X'), { X: () => vary('F-[[X]+X]+F[+FX]-X', R, .3, .25), F: () => P('FF') }, nOf(R, 5)), 22.5 * (.8 + R() * .4), { apex: 'X', R }) },
  // 未分类：图 1.24d
  other: { name: '未分类', form: '草本', src: 'ABOP 图 1.24d', tip: 'bud', make: R => turtle(derive(P('X'), { X: () => vary('F[+X]F[-X]+X', R, .3, .3), F: () => P('FF') }, nOf(R, 6)), 20 * (.8 + R() * .4), { apex: 'X', R }) }
};
// 把一株画成三张图层底图（茎 / 叶 / 花），只在投入后算一次，之后每帧只贴图
function plantSprite(g, W, H) {
  const def = LSYS[g.act] || LSYS.other, R = rng(g.rs), geo = def.make(R);
  const yaw = def.view ? R() * Math.PI * 2 : 0, cy = Math.cos(yaw), sy = Math.sin(yaw);
  const pr = p => [p[0] * cy + p[2] * sy, p[1]];
  const pts = [];
  geo.segs.forEach(s => { pts.push(pr(s.a), pr(s.b)); }); geo.polys.forEach(q => q.pts.forEach(p => pts.push(pr(p)))); geo.apex.forEach(a => pts.push(pr(a.p)));
  geo.cells.forEach(c => pts.push([c.x, c.y]));
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
  const bw = Math.max(1e-6, x1 - x0), bh = Math.max(1e-6, y1 - y0), sc = Math.min(g.H / bh, (W * (g.H > 250 ? .5 : .4)) / bw);
  const baseY = H + 4; let ox = g.x;
  const lo = g.x + (x0 - 0) * sc, hi = g.x + (x1 - 0) * sc; if (lo < 4) ox += 4 - lo; if (hi > W - 4) ox -= hi - (W - 4);
  const T = ([x, y]) => [ox + x * sc, baseY - (y - Math.min(0, y0)) * sc];
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.lineCap = x.lineJoin = 'round'; return [c, x]; };
  const [stem, sx] = mk(), [leaf, lx] = mk(), [flower, fx] = mk();
  const heads = [];
  // 茎
  sx.strokeStyle = rgba(g.stemCol, .9);
  geo.segs.forEach(s => { const a = T(pr(s.a)), b = T(pr(s.b)); sx.lineWidth = Math.max(.55, 2.2 * s.w * Math.pow(.8, s.dep)); sx.beginPath(); sx.moveTo(a[0], a[1]); sx.lineTo(b[0], b[1]); sx.stroke(); });
  // 迷迭香的针叶：每段两侧各一根
  if (def.needles) { lx.strokeStyle = rgba(g.leafCol, .9); lx.lineWidth = .9; geo.segs.forEach((s, i) => { if (i % 2) return; const a = T(pr(s.a)), b = T(pr(s.b)), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * 3.2, ny = dx / l * 3.2; [-1, 1].forEach(k => { lx.beginPath(); lx.moveTo(b[0], b[1]); lx.lineTo(b[0] + nx * k + dx / l * 1.5, b[1] + ny * k + dy / l * 1.5); lx.stroke(); }); }); }
  // 叶片和花瓣（多边形）
  geo.polys.forEach(q => {
    const ctx = q.fl ? fx : lx; ctx.fillStyle = q.fl ? rgba(g.cl[q.ci % g.cl.length], .95) : rgba(q.ci ? mix(g.leafCol, g.cl[q.ci % g.cl.length], .4) : g.leafCol, .85);
    ctx.beginPath(); q.pts.forEach((p, i) => { const t = T(pr(p)); i ? ctx.lineTo(t[0], t[1]) : ctx.moveTo(t[0], t[1]); }); ctx.closePath(); ctx.fill();
    if (q.fl) { const t = T(pr(q.pts[0])); heads.push(t); }
  });
  // 枝端：蕨的小叶 / 花苞
  geo.apex.forEach((a, i) => {
    const t = T(pr(a.p)), hd = pr(a.H), ang = Math.atan2(-hd[1], hd[0]);
    if (def.tip === 'leaflet') { lx.save(); lx.translate(t[0], t[1]); lx.rotate(ang); lx.fillStyle = rgba(mix(g.leafCol, g.cl[0], .45), .9); lx.beginPath(); lx.ellipse(1.5, 0, 3.2, 1.3, 0, 0, Math.PI * 2); lx.fill(); lx.restore(); }
    else { fx.fillStyle = rgba(g.cl[i % g.cl.length], .95); fx.beginPath(); fx.arc(t[0], t[1], 1.6, 0, Math.PI * 2); fx.fill(); }
    heads.push(t);
  });
  // 藻类的细胞链
  geo.cells.forEach((c, i) => {
    const t = T([c.x, c.y]), r = c.len * sc * .5;
    const ctx = c.a ? fx : lx; ctx.fillStyle = c.a ? rgba(g.cl[c.k % g.cl.length], .9) : rgba(g.leafCol, .9);
    ctx.beginPath(); ctx.ellipse(t[0], t[1], Math.max(2.4, r * 1.3), Math.max(1.6, r * 1.05), 0, 0, Math.PI * 2); ctx.fill();
    if (c.a) heads.push(t);
  });
  // 连线和光晕落在植物上部的「头」：上部 40% 里花 / 枝端的中心
  const top = baseY - g.H * .55;
  const up = heads.filter(h => h[1] < top); const use = up.length ? up : heads;
  let hx = ox, hy = baseY - bh * sc * .85;
  if (use.length) { hx = use.reduce((s, h) => s + h[0], 0) / use.length; hy = use.reduce((s, h) => s + h[1], 0) / use.length; }
  return { stem, leaf, flower, hx, hy, gr: Math.max(14, Math.min(40, bw * sc * .28)), baseX: g.x, baseY };
}

// ===== 种子：每株一颗平面轮廓的种子，形状来自它的植物种类，颜色来自那张照片 =====
// 形状画在以 (0,0) 为中心、半径约 r 的范围里；R 是这张照片的随机数，所以同一种类每颗也不一样
function blobPath(ctx, pts) { // 闭合的平滑曲线（经过各点中点的二次曲线）
  const n = pts.length; ctx.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
  ctx.closePath();
}
const SEED_SHAPE = {
  // 蕨类：边缘起伏的长叶
  nature: (c, r, R) => { const k = 7 + Math.floor(R() * 4), pts = []; for (let i = 0; i < k * 2; i++) { const a = i / (k * 2) * Math.PI * 2, w = i % 2 ? .78 : 1; pts.push([Math.cos(a) * r * .62 * w, Math.sin(a) * r * w]); } blobPath(c, pts); },
  // 灌木：几个圆聚成一团（像树冠）
  hike: (c, r, R) => { const k = 4 + Math.floor(R() * 3); c.moveTo(r * .55, 0); c.arc(0, 0, r * .55, 0, Math.PI * 2); for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2 + R(), d = r * .5, rr = r * (.36 + R() * .12); c.moveTo(Math.cos(a) * d + rr, Math.sin(a) * d); c.arc(Math.cos(a) * d, Math.sin(a) * d, rr, 0, Math.PI * 2); } },
  // 藻类：一串圆珠
  sea: (c, r, R) => { const k = 3 + Math.floor(R() * 2); for (let i = 0; i < k; i++) { const y = (i - (k - 1) / 2) * r * .62, x = Math.sin(i * 1.7 + R()) * r * .18, rr = r * (.34 + (i % 2) * .08); c.moveTo(x + rr, y); c.arc(x, y, rr, 0, Math.PI * 2); } },
  // 开花植物：四瓣（或五瓣）的花形
  animal: (c, r, R) => { const k = R() < .6 ? 4 : 5, pts = []; for (let i = 0; i < k * 2; i++) { const a = i / (k * 2) * Math.PI * 2, w = i % 2 ? .52 : 1.08; pts.push([Math.cos(a) * r * w, Math.sin(a) * r * w]); } blobPath(c, pts); },
  // 香草：一根细枝两侧长着椭圆小叶
  food: (c, r, R) => { c.rect(-r * .09, -r, r * .18, r * 2); const k = 3 + Math.floor(R() * 2); for (let i = 0; i < k; i++) { const y = -r * .75 + i * r * 1.5 / (k - 1 || 1), s = i % 2 ? 1 : -1; c.moveTo(s * r * .1, y); c.ellipse(s * r * .38, y - r * .12, r * .32, r * .17, s * -.5, 0, Math.PI * 2); } },
  // 倾斜的草本：水滴 / 瓶形
  ride: (c, r, R) => { const t = .25 + R() * .2; c.moveTo(0, -r); c.bezierCurveTo(r * t, -r * .4, r * .78, r * .2, r * .62, r * .7); c.quadraticCurveTo(0, r * 1.15, -r * .62, r * .7); c.bezierCurveTo(-r * .78, r * .2, -r * t, -r * .4, 0, -r); c.closePath(); },
  // 未分类：一颗圆滚滚的种子
  other: (c, r, R) => { const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; pts.push([Math.cos(a) * r * (.82 + R() * .2), Math.sin(a) * r * (.9 + R() * .2)]); } blobPath(c, pts); }
};
// 种子颜色：花色压平成扁平的色块（参考图那种不透明、略带粉彩的颜色）
const seedColor = col => col; // 直接用照片的基础色调，不再加工

class SeedBox {
  constructor(cv) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.W = cv.width; this.H = cv.height; this.seeds = []; this.g = [0, 1]; this.drag = null; this.sensor = false; this.off = [0, 0]; this.ov = [0, 0]; this.rot = 0; this.rv = 0; this.pv = [0, 0]; this.po = [0, 0];
    window.addEventListener('deviceorientation', e => { if (e.gamma == null) return; this.sensor = true; const gx = Math.sin((e.gamma || 0) * Math.PI / 180), gy = Math.sin((e.beta || 0) * Math.PI / 180); this.g = [gx, Math.max(-1, Math.min(1, gy))]; });
    window.addEventListener('devicemotion', e => { const a = e.acceleration; if (!a || a.x == null) return; const k = Math.hypot(a.x, a.y); if (k > 6) this.kick(-a.x * .6, a.y * .6); });
  }
  // 每株一颗；已有的种子保留位置，新的从上方落下
  set(plants) {
    const old = new Map(this.seeds.map(s => [s.key, s])), out = [];
    plants.forEach((p, k) => {
      const key = p.rs + '|' + p.act, o = old.get(key); if (o) { o.col = seedColor(p.base); o.i = p.i; out.push(o); return; }
      const R = rng(p.rs ^ 0x9e3779b9), r = (17 + R() * 8) * 2 * Math.min(1, Math.sqrt(8 / Math.max(8, plants.length)));
      out.push({ key, i: p.i, act: p.act, R: p.rs, r, col: seedColor(p.base), x: 50 + R() * (this.W - 100), y: -r * 2 - k * 50, vx: (R() - .5) * 2, vy: 0, a0: (R() - .5) * .5, a: 0 }); out[out.length - 1].a = out[out.length - 1].a0;
    });
    this.seeds = out;
  }
  kick(dx, dy) { this.seeds.forEach(s => { s.vx += dx * (.6 + Math.random() * .8); s.vy += dy * (.6 + Math.random() * .8); }); }
  // 时间步长按真实时间算（不受帧率影响）；不自由旋转：只随横向速度轻轻倾斜，停下后回正
  step() {
    const now = performance.now(), dt = Math.min(2, ((now - (this.t || now)) / 16.67) || 1); this.t = now;
    const gw = this.sensor ? this.g : [0, 1], g = [gw[0] * Math.cos(-this.rot) - gw[1] * Math.sin(-this.rot), gw[0] * Math.sin(-this.rot) + gw[1] * Math.cos(-this.rot)], G = .9 * .8 * dt, W = this.W, H = this.H, air = Math.pow(.982, dt), tt = now / 1000; // 浮力 0.2g：有效重力只剩 0.8g，空气阻力更大
    // 包本身的运动：放手后像弹簧一样回到原位；包的加速度反向作用在种子上（惯性）
    if (!this.cardDrag) { this.ov = this.ov.map((v, i) => (v - this.off[i] * .09 * dt) * Math.pow(.8, dt)); this.off = this.off.map((o, i) => o + this.ov[i] * dt); this.rv = (this.rv - this.rot * .09 * dt) * Math.pow(.8, dt); this.rot += this.rv * dt; }
    const v = this.off.map((o, i) => (o - this.po[i]) / dt), acc = v.map((x, i) => x - this.pv[i]); this.po = this.off.slice(); this.pv = v;
    const cr = Math.cos(-this.rot), sr = Math.sin(-this.rot), la = [acc[0] * cr - acc[1] * sr, acc[0] * sr + acc[1] * cr];
    if (Math.hypot(la[0], la[1]) > .05) for (const s of this.seeds) { s.vx -= la[0] * 2.2; s.vy -= la[1] * 2.2; }
    if (this.onMove) this.onMove(this.off, this.rot);
    for (const s of this.seeds) {
      const d = this.drag && this.drag.s === s;
      if (d) { // 拖着的种子用弹簧跟手，比直接贴着鼠标柔和
        const tx = this.drag.px + this.drag.dx, ty = this.drag.py + this.drag.dy;
        s.vx = (tx - s.x) * .35; s.vy = (ty - s.y) * .35;
      } else { if (s.ph == null) s.ph = Math.random() * 6.28; s.vx = (s.vx + g[0] * G + Math.sin(tt * .9 + s.ph) * .09 * dt) * air; s.vy = (s.vy + g[1] * G + Math.sin(tt * .7 + s.ph * 1.7) * .14 * dt) * air; }
      s.x += s.vx * dt; s.y += s.vy * dt;
      const r = s.r * 1.08; s.ground = false;
      if (s.x < r) { s.x = r; s.vx = Math.abs(s.vx) * .3; } if (s.x > W - r) { s.x = W - r; s.vx = -Math.abs(s.vx) * .3; }
      if (s.y < r && s.vy < 0) { s.y = r; s.vy = Math.abs(s.vy) * .3; }
      if (s.y > H - r) { s.y = H - r; s.vy = s.vy > 2 ? -s.vy * .45 : -.6 - Math.random() * .4; s.vx *= Math.pow(.86, dt); s.ground = true; }
      // 倾斜角：跟着横向速度，平滑过去
      const target = s.a0 + Math.max(-.5, Math.min(.5, s.vx * .025));
      s.a += (target - s.a) * .12;
    }
    for (let it = 0; it < 4; it++) for (let i = 0; i < this.seeds.length; i++) for (let j = i + 1; j < this.seeds.length; j++) {
      const a = this.seeds[i], b = this.seeds[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || .01, min = (a.r + b.r) * .85;
      if (d >= min) continue;
      const nx = dx / d, ny = dy / d, ia = this.drag && this.drag.s === a ? 0 : 1, ib = this.drag && this.drag.s === b ? 0 : 1, tot = ia + ib || 1, push = (min - d);
      a.x -= nx * push * ia / tot; a.y -= ny * push * ia / tot; b.x += nx * push * ib / tot; b.y += ny * push * ib / tot;
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) { const k = rv * .6 / tot; a.vx += k * nx * ia; a.vy += k * ny * ia; b.vx -= k * nx * ib; b.vy -= k * ny * ib; }
    }
  }
  draw(hl) {
    const c = this.ctx; c.clearRect(0, 0, this.W, this.H);
    for (const s of this.seeds) {
      c.save(); c.translate(s.x, s.y); c.rotate(s.a); c.globalAlpha = hl != null && hl !== s.i ? .35 : 1;
      c.fillStyle = s.col; c.beginPath(); (SEED_SHAPE[s.act] || SEED_SHAPE.other)(c, s.r, rng(s.R)); c.fill('nonzero'); c.restore();
    }
  }
  hit(x, y) { for (let i = this.seeds.length - 1; i >= 0; i--) { const s = this.seeds[i]; if (Math.hypot(x - s.x, y - s.y) < s.r) return s; } return null; }
}

window.plantSprite = plantSprite; // 调试用
// 版面（1600×936）：左 照片框｜中 植物｜右 种子包
const PX = 760, PY = 123, PS = 0.7971 * 2, PACK = { x: 1290, y: 628, s: 190 }; // 种子包底边与植物框对齐，间距 90
// 照片放进格子时的裁切：以识别到的物体为中心（没有物体就取画面中心），尽量不把物体裁掉
function cropOffset(cell, dw, dh, a) {
  let fx = .5, fy = .5;
  if (a && a.obj) { const [x, y, w, h] = a.obj.bbox; fx = (x + w / 2) / a.iw; fy = (y + h / 2) / a.ih; }
  const cl = (v, lo) => Math.min(0, Math.max(lo, v));
  return [cl(cell.w / 2 - fx * dw, cell.w - dw), cl(cell.h / 2 - fy * dh, cell.h - dh)];
}
// ===== 种子包（seedpack）编码：之后交流平台等所有展开都读这个格式。规则见「种子包编码规则_v1.md」 =====
const SEEDPACK_FORMAT = 'seedpack', SEEDPACK_V = 1, LSYS_V = 1;
const hex8 = n => (n >>> 0).toString(16).padStart(8, '0');
function fnv(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const isoLocal = ms => { const d = new Date(ms), z = -d.getTimezoneOffset(), p = n => String(Math.abs(n)).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${z >= 0 ? '+' : '-'}${p(z / 60 | 0)}:${p(z % 60)}`; };
async function buildPack(st, m, comp) {
  const seeds = m.plants.map(p => {
    const it = st.items[p.i], a = st.an[p.i] || {}, ms = it.date || new Date('2026-10-03T' + it.time + ':00').getTime(), ct = a.clip;
    return {
      id: hex8(p.rs), t: isoLocal(ms), act: p.act,
      plant: { rule: (LSYS[p.act] || LSYS.other).src.replace('ABOP 图 ', 'ABOP-fig').replace('ABOP 式 ', 'ABOP-eq'), seed: p.rs >>> 0, h: +(p.H / 330).toFixed(3) },
      color: { base: a.base || null, flower: p.cl.slice(0, 5), stem: p.stemCol, leaf: p.leafCol },
      sky: a.sky || null,
      tags: { weather: a.sky ? weatherOf(a) : null, scene: ct ? ct.scene : null, object: a.obj && a.obj.cls !== 'person' ? a.obj.cls : null }
    };
  });
  const times = seeds.map(x => x.t).sort();
  const body = { day: times[0] ? times[0].slice(0, 10) : null, span: [times[0] || null, times[times.length - 1] || null], seeds };
  return { format: SEEDPACK_FORMAT, v: SEEDPACK_V, lsys: LSYS_V, id: 'sp-' + hex8(fnv(seeds.map(x => x.id).join('') + body.day)), created: isoLocal(Date.now()), generator: 'seed-generator v1.18', sample: !!st.sample, ...body };
}
// 短码：pack JSON → deflate → base64url，前缀 SP1.（以后可放进二维码或链接）
async function packToCode(pack) { const bytes = new TextEncoder().encode(JSON.stringify(pack)), cs = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw')), buf = new Uint8Array(await new Response(cs).arrayBuffer()); let b = ''; buf.forEach(x => b += String.fromCharCode(x)); return 'SP1.' + btoa(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
async function codeToPack(code) { const b = atob(code.replace(/^SP1\./, '').replace(/-/g, '+').replace(/_/g, '/')), u = Uint8Array.from(b, c => c.charCodeAt(0)), ds = new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw')); return JSON.parse(await new Response(ds).text()); }
// 只用种子包就能重新画出植物（交流平台要用的就是这个）
function plantFromSeed(sd, x, W, H) { return plantSprite({ act: sd.act, x, H: sd.plant.h * 330, rs: sd.plant.seed, cl: sd.color.flower, stemCol: sd.color.stem, leafCol: sd.color.leaf }, W, H); }
Object.assign(window, { buildPack, packToCode, codeToPack, plantFromSeed });
