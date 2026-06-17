import { Router } from 'express';
import { body, query } from 'express-validator';
import multer from 'multer';
import path   from 'path';
import { createWorkLog, getWorkLogs, getFilteredLogs, replyToLog } from '../controllers/workLogController';
import { authenticate, authorize } from '../middleware/auth';
import { validate }                from '../middleware/validate';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, 'uploads/'),
  filename:    (_req, file, cb) => cb(null, `${Date.now()}-${path.basename(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  },
});

const router = Router();
router.use(authenticate);

// Filtered logs endpoint (for Work Logs page with search)
router.get('/',
  [
    query('project_id').optional().isInt(),
    query('user_id').optional().isInt(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('page').optional().isInt(),
    query('limit').optional().isInt(),
  ],
  validate,
  getFilteredLogs
);

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
  authorize('admin','project_manager'),
  [body('message').notEmpty().trim()],
  validate,
  replyToLog
);

export default router;