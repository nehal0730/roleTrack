import { Router } from 'express';
import { body } from 'express-validator';
import { getProjects, createProject, updateProject, getProjectById, deleteProject } from '../controllers/projectController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
router.use(authenticate);

router.get('/', getProjects);
router.get('/:id', getProjectById);
router.post('/',
  authorize('admin'),
  [body('name').notEmpty(), body('start_date').isDate(), body('end_date').isDate(), body('manager_id').isInt()],
  validate, createProject
);
router.put('/:id', authorize('admin', 'project_manager'), updateProject);
router.delete('/:id', authorize('admin'), deleteProject);

export default router;