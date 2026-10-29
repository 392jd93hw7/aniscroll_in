import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import apiRoutes from './routes/apiRoutes.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './helper/error.helper.js';

const app = express();
app.disable('x-powered-by');

// Codespaces and common hosted deployments sit behind one reverse proxy.
// Set TRUST_PROXY=0 for a directly exposed server, or to the exact trusted
// proxy-hop count for your deployment. Avoid trusting arbitrary X-Forwarded-* headers.
const trustProxySetting = process.env.TRUST_PROXY;
if (trustProxySetting === 'false' || trustProxySetting === '0') {
  app.set('trust proxy', false);
} else if (trustProxySetting === 'true' || trustProxySetting === undefined || trustProxySetting === '') {
  app.set('trust proxy', 1);
} else {
  const hops = Number.parseInt(trustProxySetting, 10);
  if (!Number.isInteger(hops) || hops < 0) throw new Error('TRUST_PROXY must be false, true, or a non-negative proxy-hop count.');
  app.set('trust proxy', hops);
}

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
  max: Math.max(1, Number(process.env.RATE_LIMIT_MAX || 100)),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests; try again later.' } }
}));

app.get('/', (req, res) => res.json({
  name: 'AniScroll AnimePahe API',
  version: '1.1.0',
  status: 'running',
  docs: '/_routes',
  health: '/health',
  note: 'Generic page parsing is best-effort; source-specific selectors require live verification.'
}));
app.use('/', apiRoutes);
app.use((req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found.' }, requestId: req.id }));
app.use(errorHandler);
export default app;
