import express from 'express';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import apiRoutes from './routes/apiRoutes.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './helper/error.helper.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use(requestLogger);
app.use(compression());
app.use(express.json({ limit: '100kb' }));

const corsSetting = String(process.env.CORS_ORIGINS || '*').trim();
app.use(cors({
  origin: corsSetting === '*' ? '*' : corsSetting.split(',').map(origin => origin.trim()).filter(Boolean),
  methods: ['GET', 'HEAD', 'OPTIONS'],
  optionsSuccessStatus: 204
}));

app.use(rateLimit({
  windowMs: Math.max(1000, Number(process.env.RATE_LIMIT_WINDOW_MS || 60000)),
  limit: Math.max(1, Number(process.env.RATE_LIMIT_MAX || 100)),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests; try again later.' } }
}));

app.get('/', (req, res) => res.json({
  name: 'AniScroll AnimePahe API',
  version: '1.0.0',
  status: 'running',
  docs: '/_routes',
  health: '/health',
  note: 'Source-specific data extraction is enabled only where the upstream interface has been verified.'
}));
app.use('/', apiRoutes);
app.use((req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found.' }, requestId: req.id }));
app.use(errorHandler);
export default app;
