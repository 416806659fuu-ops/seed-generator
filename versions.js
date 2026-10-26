window.SEED_VERSIONS = [{v: '1.29', file: 'pc.html', date: '2026-10-26', note: 'テストプレイ版'}];

(function(){
  const me = document.currentScript, actions = me.dataset.actions === '1';
  const cur = location.pathname.split('/').pop() || 'index.html';
  const now = SEED_VERSIONS.find(x => x.file === cur) || SEED_VERSIONS[0];
  const css = document.createElement('style');
  css.textContent = `
  html,body{height:100%;overflow:hidden}
  .vbar{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:12px;height:52px;padding:0 20px;background:#f3f2f2;border-bottom:2px solid #201e1d;font-family:Archivo,"Noto Sans SC",sans-serif;color:#201e1d}
  .vbar .vpick{position:relative}
  .vbar .vbtn{display:flex;align-items:center;gap:10px;height:36px;padding:0 12px;border:2px solid #201e1d;background:#f3f2f2;font:800 15px Archivo,"Noto Sans SC",sans-serif;cursor:pointer;color:#201e1d}
  .vbar .vbtn small{font-weight:600;font-size:12px;color:#605d5d}
  .vbar .vbtn:after{content:"";width:8px;height:8px;border-right:2px solid #201e1d;border-bottom:2px solid #201e1d;transform:rotate(45deg) translateY(-3px)}
  .vbar .vmenu{position:absolute;left:0;top:42px;min-width:320px;background:#f3f2f2;border:2px solid #201e1d;display:none;flex-direction:column}
  .vbar .vpick.open .vmenu{display:flex}
  .vbar .vmenu a{display:grid;gap:2px;padding:10px 14px;border-top:1px solid rgba(32,30,29,.4);text-decoration:none;color:#201e1d}
  .vbar .vmenu a:first-child{border-top:0}
  .vbar .vmenu a b{font-size:15px}
  .vbar .vmenu a span{font-size:12px;color:#605d5d}
  .vbar .vmenu a.on{background:#eae9e9}
  .vbar .vmenu a:hover b{color:#ec3013}
  .vbar .sp{flex:1}
  .vbar .act{height:36px;padding:0 14px;border:2px solid #201e1d;background:#f3f2f2;font:700 14px Archivo,"Noto Sans SC",sans-serif;cursor:pointer;display:flex;align-items:center;color:#201e1d}
  .vbar .act.pri{background:#ec3013;border-color:#ec3013;color:#fff}
  .vbar.busy .act{opacity:.4;pointer-events:none}
  .vbar .act:focus-visible,.vbar .vbtn:focus-visible{outline:2px solid #ec3013;outline-offset:2px}`;
  document.head.appendChild(css);
  const bar = document.createElement('div'); bar.className = 'vbar';
  bar.innerHTML = `<div class="vpick"><button class="vbtn" aria-haspopup="true">種ジェネレーター v${now.v} <small>${SEED_VERSIONS.length} versions</small></button>
    <div class="vmenu">${SEED_VERSIONS.map(x => `<a href="${x.file}" class="${x === now ? 'on' : ''}"><b>種ジェネレーター v${x.v}</b><span>${x.date} · ${x.note}</span></a>`).join('')}</div></div>
    <div class="sp"></div>` + (actions ? `<label class="act pri">写真を入れる<input type="file" accept="image/*" multiple hidden></label><button class="act" id="vSample">サンプル：江戸川の一日</button>` : '');
  const mount = () => {
    document.body.prepend(bar);
    const pick = bar.querySelector('.vpick');
    bar.querySelector('.vbtn').onclick = e => { e.stopPropagation(); pick.classList.toggle('open'); };
    document.addEventListener('click', () => pick.classList.remove('open'));
    if (actions){
      const busy = () => window.__seed && window.__seed.state && window.__seed.state.busy;
      const call = (fn, arg) => { if (busy()) return; window.__seed && window.__seed[fn] && window.__seed[fn](arg); };
      const inp = bar.querySelector('input');
      inp.addEventListener('change', e => { call('onFiles', e); inp.value = ''; });
      window.__setBusy = b => { bar.classList.toggle('busy', b); inp.disabled = b; };
      bar.querySelector('#vSample').onclick = () => call('loadSample');
      document.addEventListener('dragover', e => e.preventDefault());
      document.addEventListener('drop', e => { e.preventDefault(); call('onFiles', {target: {files: e.dataTransfer.files}}); });
    }
  };
  document.body ? mount() : document.addEventListener('DOMContentLoaded', mount);
})();
