const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

// Trust reverse proxy (Traefik / EKAFY) to correctly identify client IPs in X-Forwarded-For
app.set('trust proxy', 1);

app.set('json replacer', (_, value) => (typeof value === 'bigint' ? value.toString() : value));
app.disable('x-powered-by');

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || env.corsOrigins.length === 0 || env.corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Origin not allowed by CORS'));
    },
    credentials: true
  })
);
app.use(compression());
app.use(morgan('combined', { skip: () => env.nodeEnv === 'test' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use('/uploads', express.static(env.uploadDir));

app.get('/', (req, res) =>
  res.json({
    success: true,
    message: `${env.appName} API is running.`,
    data: { environment: env.nodeEnv, health: '/health' }
  })
);

app.get('/health', (req, res) =>
  res.json({
    success: true,
    message: `${env.appName} API is healthy.`,
    data: { environment: env.nodeEnv }
  })
);

app.use(
  '/api/v1',
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false
  }),
  routes
);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
