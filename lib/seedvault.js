// 種パックの「写真の金庫」：写真を合言葉で暗号化して種パックに入れておき、持ち主が合言葉を入れたときだけ開く
// pack.vault = { v:1, salt, iter, check:{iv,data}, photos:{ <seed id>: {iv, data} } }   （data は base64）
// 合言葉は種パックの中には入れない。暗号は WebCrypto（PBKDF2-SHA256 → AES-GCM 256）
(function () {
  const b64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  // 「そら・みず・はな」「そら みず はな」「そらみずはな」を同じにする
  const normPass = p => (p || '').normalize('NFKC').replace(/[\s・･,、.。\-ー]/g, '').replace(/[ァ-ン]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  async function deriveKey(pass, salt, iter) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(normPass(pass)), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(key, bytes) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)); return { iv: b64(iv), data: b64(ct) }; }
  async function open(key, box) { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.data))); }
  // 写真を小さく（長辺 720px の JPEG）
  async function shrink(img, max = 720) {
    const k = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height)), c = document.createElement('canvas');
    c.width = Math.round((img.naturalWidth || img.width) * k); c.height = Math.round((img.naturalHeight || img.height) * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return new Uint8Array(await (await new Promise(r => c.toBlob(r, 'image/jpeg', .78))).arrayBuffer());
  }
  // photos: { <seed id>: HTMLImageElement }
  async function vaultSeal(pack, pass, photos) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iter = 150000, key = await deriveKey(pass, salt, iter), out = {};
    for (const [id, img] of Object.entries(photos)) out[id] = await seal(key, await shrink(img));
    pack.vault = { v: 1, salt: b64(salt), iter, check: await seal(key, new TextEncoder().encode('seedvault')), photos: out };
    return pack;
  }
  // 合言葉が合っていれば key を返す（違えば null）
  async function vaultKey(pack, pass) {
    const v = pack && pack.vault; if (!v) return null;
    try { const key = await deriveKey(pass, unb64(v.salt), v.iter); const t = new TextDecoder().decode(await open(key, v.check)); return t === 'seedvault' ? key : null; } catch (e) { return null; }
  }
  async function vaultPhoto(pack, key, seedId) {
    const box = pack.vault && pack.vault.photos[seedId]; if (!box || !key) return null;
    return URL.createObjectURL(new Blob([await open(key, box)], { type: 'image/jpeg' }));
  }
  Object.assign(window, { vaultSeal, vaultKey, vaultPhoto, normPass });
})();
