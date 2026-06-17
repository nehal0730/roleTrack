import { Router } from 'express';
import { body }   from 'express-validator';
import multer     from 'multer';
import path       from 'path';
import { createWorkLog, getWorkLogs, replyToLog } from '../controllers/workLogController';
import { authenticate, authorize } from '../middleware/auth';
import { validate }                from '../middleware/validate';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/'),
  filename:    (_req, file, cb) =>
    cb(null, `${Date.now()}-${path.basename(file.originalname)}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

const router = Router();
router.use(authenticate);

router.get('/task/:task_id', getWorkLogs);

router.post('/',
  upload.single('attachment'),
  [
    body('task_id').isInt({ min: 1 }),
    body('description').notEmpty().trim(),
    body('hours_worked').isFloat({ min: 0.1, max: 24 }),
  ],
  validate,
  createWorkLog
);

router.post('/:log_id/reply',
  authorize('admin', 'project_manager'),
  [body('message').notEmpty().trim()],
  validate,
  replyToLog
);

export default router;