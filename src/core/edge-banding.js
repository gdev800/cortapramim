// Metragem de fita de borda.

export function fitaMetros(g) {
  let mm = 0;
  g.sheets.forEach(function (s) { s.pecas.forEach(function (q) { mm += (q.fc || 0) * (q.cf || q.c) + (q.fl || 0) * (q.lf || q.l); }); });
  return mm / 1000;
}
