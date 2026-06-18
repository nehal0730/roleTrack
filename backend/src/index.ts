import express    from 'express';
import cors       from 'cors';
import helmet     from 'helmet';
import path       from 'path';
import cron       from 'node-cron';
import http       from 'http';
import dotenv     from 'dotenv';
dotenv.config();

import swaggerUi            from 'swagger-ui-express';
import { swaggerSpec }      from './config/swagger';
import { sequelize }        from './models';
import { startScheduler }   from './services/schedulerService';
import { initSocket }       from './services/socketService';
import { errorHandler }     from './middleware/errorHandler';
import { apiLimiter }       from './middleware/rateLimiter';

import authRoutes         from './routes/auth';
import projectRoutes      from './routes/projects';
import taskRoutes         from './routes/tasks';
import workLogRoutes      from './routes/workLogs';
import userRoutes         from './routes/users';
import notificationRoutes from './routes/notifications';
import reportRoutes       from './routes/reports';
import auditLogRoutes     from './routes/auditLogs';

const app        = express();
const httpServer = http.createServer(app);

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Static ────────────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Swagger docs ─────────────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Task Manager API',
  customCss: '.swagger-ui .topbar { display: none }',
}));
app.get('/api/docs.json', (_, res) => res.json(swaggerSpec));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api',                   apiLimiter);
app.use('/api/auth',              authRoutes);
app.use('/api/projects',          projectRoutes);
app.use('/api/tasks',             taskRoutes);
app.use('/api/work-logs',         workLogRoutes);
app.use('/api/users',             userRoutes);
app.use('/api/notifications',     notificationRoutes);
app.use('/api/reports',           reportRoutes);
app.use('/api/audit-logs',        auditLogRoutes);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ── Boot ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => {
    console.log('Database connected');
    initSocket(httpServer);
    startScheduler();
    httpServer.listen(PORT, () => console.log(`Server on :${PORT}`));
  })
  .catch(err => { console.error('DB connection failed:', err); process.exit(1); });