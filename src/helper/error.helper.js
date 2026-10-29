export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = Number(err.status) || 500;
  const code = err.code || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR');
  if (status >= 500) {
    console.error(JSON.stringify({ level: 'error', requestId: req.id, path: req.path, code, message: err.message }));
  }
  res.status(status).json({
    success: false,
    error: { code, message: status >= 500 && process.env.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message },
    requestId: req.id
  });
}
