import { randomUUID } from 'node:crypto';

export function requestLogger(req, res, next) {
  const started = process.hrtime.bigint();
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    console.log(JSON.stringify({
      level: 'info', requestId: req.id, method: req.method, path: req.originalUrl,
      status: res.statusCode, durationMs: Math.round(durationMs * 100) / 100
    }));
  });
  next();
}
