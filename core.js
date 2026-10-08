(function (root) {
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function circleRect(x, y, radius, box) {
    const dx = x - clamp(x, box.x, box.x + box.w), dy = y - clamp(y, box.y, box.y + box.h);
    return dx * dx + dy * dy < radius * radius;
  }
  function segmentCircle(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1, dy = y2 - y1, fx = x1 - cx, fy = y1 - cy;
    const a = dx * dx + dy * dy, c = fx * fx + fy * fy - r * r;
    if (c <= 0) return 0;
    if (a === 0) return null;
    const b = 2 * (fx * dx + fy * dy), disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    const t = (-b - Math.sqrt(disc)) / (2 * a);
    return t >= 0 && t <= 1 ? t : null;
  }
  function segmentRect(x1, y1, x2, y2, box) {
    let lo = 0, hi = 1;
    for (const [origin, delta, min, max] of [[x1, x2-x1, box.x, box.x+box.w], [y1, y2-y1, box.y, box.y+box.h]]) {
      if (Math.abs(delta) < 1e-9) { if (origin < min || origin > max) return null; }
      else { const a = (min-origin)/delta, b = (max-origin)/delta; lo = Math.max(lo, Math.min(a,b)); hi = Math.min(hi, Math.max(a,b)); if (lo > hi) return null; }
    }
    return lo;
  }
  const blastDamage = (distance, radius = 190, damage = 180) => distance >= radius ? 0 : damage * (1 - distance / radius);
  const api = {clamp, circleRect, segmentCircle, segmentRect, blastDamage};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
