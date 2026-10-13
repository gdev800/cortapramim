// Utilitários de texto usados pelos desenhos e pela interface.

export function f1(n) { return (Math.round(n * 10) / 10).toString().replace('.', ','); }
export function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
