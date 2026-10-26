window.GARDEN_VERSIONS = [{v: '0.14', file: 'garden.html', note: 'テストプレイ版'}];

// 左下角的版本菜单（向上展开），不占用画面上方
(function(){
  const cur = location.pathname.split('/').pop(), now = GARDEN_VERSIONS.find(x => x.file === cur) || GARDEN_VERSIONS[0];
  const css = document.createElement('style');
  css.textContent = `
  .gv{position:fixed;left:20px;bottom:20px;z-index:100;font-family:"IBM Plex Mono","Noto Sans SC",monospace;color:#201e1d}
  .gv .b{height:36px;padding:0 16px;border-radius:18px;border:1.5px solid #201e1d;background:#f3f2f2;font:500 13px "IBM Plex Mono","Noto Sans SC",monospace;cursor:pointer;display:flex;align-items:center;gap:8px;color:#201e1d}
  .gv .b:after{content:"";width:7px;height:7px;border-right:1.5px solid #201e1d;border-top:1.5px solid #201e1d;transform:rotate(-45deg) translateY(2px)}
  .gv .m{position:absolute;left:0;bottom:44px;min-width:340px;background:#fbfbf9;border-radius:18px;box-shadow:0 1px 2px rgba(0,0,0,.06),0 10px 28px rgba(30,30,25,.14);display:none;flex-direction:column;overflow:hidden}
  .gv.open .m{display:flex}
  .gv .m a{display:grid;gap:2px;padding:10px 16px;text-decoration:none;color:#201e1d;border-top:1px solid rgba(32,30,29,.12)}
  .gv .m a:first-child{border-top:0}
  .gv .m a b{font-size:13px}
  .gv .m a span{font:400 12px "Noto Sans SC",sans-serif;color:#6f6c66}
  .gv .m a.on{background:#ecebea}
  .gv .m a:hover b{color:#ec3013}`;
  document.head.appendChild(css);
  const el = document.createElement('div'); el.className = 'gv';
  el.innerHTML = `<button class="b">種の庭 v${now.v}</button><div class="m">${GARDEN_VERSIONS.map(x => `<a href="${x.file}" class="${x === now ? 'on' : ''}"><b>種の庭 v${x.v}</b><span>${x.note}</span></a>`).join('')}</div>`;
  const mount = () => { document.body.appendChild(el); el.querySelector('.b').onclick = e => { e.stopPropagation(); el.classList.toggle('open'); }; document.addEventListener('click', () => el.classList.remove('open')); };
  document.body ? mount() : document.addEventListener('DOMContentLoaded', mount);
})();
