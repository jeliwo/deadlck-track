// tiny in-memory limiter (no extra package). Stops password guessing once the server is public.
// Counts per IP; resets after the window. Resets too if the server restarts, which is fine for this project.
function rateLimit({ windowMs = 15 * 60 * 1000, max = 20, message = 'Too many attempts, try again later' } = {}) {
  const hits = new Map();
  setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset < now) hits.delete(k); }, windowMs).unref();
  return (req, res, next) => {
    const now = Date.now();
    const rec = hits.get(req.ip);
    if (!rec || rec.reset < now) { hits.set(req.ip, { count: 1, reset: now + windowMs }); return next(); }
    if (++rec.count > max) {
      res.set('Retry-After', Math.ceil((rec.reset - now) / 1000));
      return res.status(429).json({ error: message });
    }
    next();
  };
}
module.exports = rateLimit;
