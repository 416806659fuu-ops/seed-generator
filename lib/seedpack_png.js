// 种子包文件（.seedpack.png）：文件本身就是一张种子包卡片的图片（Finder 里看到的图标每个都不一样），
// 种子包数据（SP1 短码）藏在 PNG 的 tEXt 块（关键字 seedpack）里。需要先载入 SeedBox / packToCode / codeToPack。
(function () {
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = bytes => { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

  // 卡片图：种子按种子生成器里的重力落定后的样子（同一个种子包每次都一样）
  function packIcon(pack, size = 512) {
    const box = document.createElement('canvas'); box.width = box.height = 380;
    const sb = new SeedBox(box), Rm = Math.random; let seed = 1;
    Math.random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; // 让落定的结果固定
    try {
      sb.set(pack.seeds.map(sd => ({ i: sd.id, rs: sd.plant.seed, act: sd.act, base: sd.color.base || '#9aa090' })));
      for (let k = 0; k < 900; k++) { sb.t = performance.now() - 33.4; sb.step(); }
      sb.draw(null);
    } finally { Math.random = Rm; }
    // 卡片铺满整张图（四角透明），不加外边距和阴影，Finder 里看起来就是一个干净的图标
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), m = 0, w = size, r = w * .16;
    x.fillStyle = '#fbfbf9'; x.beginPath(); x.roundRect(m, m, w, w, r); x.fill();
    x.save(); x.beginPath(); x.roundRect(m, m, w, w, r); x.clip(); x.drawImage(box, m, m, w, w); x.restore();
    // 1 行目：持ち主の名前（なければ seed pack）、2 行目：日付・撮影時刻・数、右上：持ち主の色
    const f = w / 190, own = pack.owner || {}, hm = t => (t || '').slice(11, 16), sp = pack.span || [];
    x.fillStyle = '#201e1d'; x.font = `500 ${11 * f}px "IBM Plex Mono", "Noto Sans JP", monospace`; x.fillText(own.name || 'seed pack', m + 18 * f, m + 26 * f);
    x.fillStyle = '#8d8a84'; x.font = `500 ${9.5 * f}px "IBM Plex Mono", monospace`; x.fillText(`${(pack.day || '').replace(/-/g, '.')} ${hm(sp[0])}–${hm(sp[1])} · ${pack.seeds.length}`, m + 18 * f, m + 41 * f);
    if (own.color) { x.fillStyle = own.color; x.beginPath(); x.arc(m + w - 22 * f, m + 22 * f, 5 * f, 0, Math.PI * 2); x.fill(); }
    return c;
  }
  // PNG 里插入 tEXt 块
  async function packToPng(pack) {
    const blob = await new Promise(r => packIcon(pack).toBlob(r, 'image/png')), png = new Uint8Array(await blob.arrayBuffer());
    const code = await packToCode(pack), data = new TextEncoder().encode('seedpack\0' + code);
    const chunk = new Uint8Array(12 + data.length), dv = new DataView(chunk.buffer);
    dv.setUint32(0, data.length); chunk.set([116, 69, 88, 116], 4); chunk.set(data, 8); dv.setUint32(8 + data.length, crc32(chunk.subarray(4, 8 + data.length)));
    const iend = png.length - 12, out = new Uint8Array(png.length + chunk.length);
    out.set(png.subarray(0, iend), 0); out.set(chunk, iend); out.set(png.subarray(iend), iend + chunk.length);
    return new Blob([out], { type: 'image/png' });
  }
  // 读文件：.seedpack.png 或旧的 .seedpack.json 都可以
  async function readPackFile(file) {
    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf[0] === 0x89 && buf[1] === 0x50) {
      const dv = new DataView(buf.buffer); let p = 8;
      while (p + 8 <= buf.length) {
        const len = dv.getUint32(p), type = String.fromCharCode(...buf.subarray(p + 4, p + 8));
        if (type === 'tEXt') { const txt = new TextDecoder().decode(buf.subarray(p + 8, p + 8 + len)), z = txt.indexOf('\0'); if (txt.slice(0, z) === 'seedpack') return codeToPack(txt.slice(z + 1)); }
        p += 12 + len;
      }
      throw new Error('no seedpack chunk');
    }
    return JSON.parse(new TextDecoder().decode(buf));
  }
  Object.assign(window, { packIcon, packToPng, readPackFile });
})();
