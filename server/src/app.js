import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { config } from './config.js';
import { errorHandler, notFound } from './middleware/errors.js';
import aiRouter from './routes/ai.js';
import authRouter from './routes/auth.js';
import focusRouter from './routes/focus.js';
import tasksRouter from './routes/tasks.js';
import teamsRouter from './routes/teams.js';

const limiter = (limit) =>
  rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many requests — please slow down.' } });

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', limiter(600));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', ai: config.openaiKey ? 'openai' : 'heuristic' });
  });

  app.use('/api/auth', limiter(30), authRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/teams', teamsRouter);
  app.use('/api/focus', focusRouter);
  app.use('/api/ai', limiter(60), aiRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
