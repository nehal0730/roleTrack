import express from 'express';
import cors    from 'cors';
import path    from 'path';
import cron    from 'node-cron';
import dotenv  from 'dotenv';
dotenv.config();

import { sequelize } from './models';
import { Op } from 'sequelize';
import { startScheduler }   from './services/schedulerService';

import authRoutes         from './routes/auth';
import projectRoutes      from './routes/projects';
import taskRoutes         from './routes/tasks';
import workLogRoutes      from './routes/workLogs';
import userRoutes         from './routes/users';
import notificationRoutes from './routes/notifications';
import reportRoutes   from './routes/reports';
import auditLogRoutes from './routes/auditLogs';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth',          authRoutes);
app.use('/api/projects',      projectRoutes);
app.use('/api/tasks',         taskRoutes);
app.use('/api/work-logs',     workLogRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports',    reportRoutes);
app.use('/api/audit-logs', auditLogRoutes);

app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => {
    console.log('Database connected');
    startScheduler();

    // Cleanup expired/revoked refresh tokens daily
    // cron.schedule('0 2 * * *', async () => {
    //   const deleted = await RefreshToken.destroy({
    //     where: {
    //       [Op.or]: [
    //         { expires_at: { [Op.lt]: new Date() } },
    //         { is_revoked: true },
    //       ],
    //     },
    //   });
    //   if (deleted) console.log(`Cleaned up ${deleted} stale refresh tokens`);
    // });

    app.listen(PORT, () => console.log(`Server on :${PORT}`));
  })
  .catch(err => { console.error('DB connection failed:', err); process.exit(1); });