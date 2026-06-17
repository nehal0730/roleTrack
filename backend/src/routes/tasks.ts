import { Router } from 'express';
import { body, query }   from 'express-validator';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskHistory,
  getTaskAssignments,
} from '../controllers/taskController';
import { authenticate, authorize } from '../middleware/auth';
import { validate }                from '../middleware/validate';

const router = Router();
router.use(authenticate);

router.get('/', [
    query('status').optional().isIn(['todo','in_progress','in_review','completed','blocked']),
    query('priority').optional().isIn(['low','medium','high','critical']),
    query('assigned_to').optional().isInt(),
    query('project_id').optional().isInt(),
    query('deadline_from').optional().isISO8601(),
    query('deadline_to').optional().isISO8601(),
    query('page').optional().isInt(),
    query('limit').optional().isInt(),
  ],
  validate,                       getTasks);
router.get('/:id',                getTaskById);
router.get('/:id/history',        getTaskHistory);
router.get('/:id/assignments',    getTaskAssignments);

router.post('/',
  authorize('admin', 'project_manager'),
  [
    body('title').notEmpty().trim(),
    body('project_id').isInt({ min: 1 }),
    body('deadline').isISO8601(),
    body('priority').optional().isIn(['low','medium','high','critical']),
    body('estimated_hours').optional().isFloat({ min: 0 }),
    body('assigned_to').optional().isInt({ min: 1 }),
  ],
  validate,
  createTask
);

router.put('/:id',
  [
    body('status').optional().isIn(['todo','in_progress','in_review','completed','blocked']),
    body('priority').optional().isIn(['low','medium','high','critical']),
    body('deadline').optional().isISO8601(),
    body('assigned_to').optional().isInt({ min: 1 }),
  ],
  validate,
  updateTask
);

router.delete('/:id', authorize('admin','project_manager'), deleteTask);

export default router;