import { Router }        from 'express';
import { body, query }   from 'express-validator';
import {
  getProjects, getProjectById, createProject,
  updateProject, deleteProject,
} from '../controllers/projectController';
import { authenticate, authorize } from '../middleware/auth';
import { validate }                from '../middleware/validate';

const router = Router();
router.use(authenticate);

/**
 * @swagger
 * /projects:
 *   get:
 *     tags: [Projects]
 *     summary: List projects (role-filtered)
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [planning, active, completed, archived]
 *       - in: query
 *         name: manager_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Paginated project list
 */
router.get('/',
  [
    query('status').optional().isIn(['planning','active','completed','archived']),
    query('manager_id').optional().isInt(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate, getProjects
);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     tags: [Projects]
 *     summary: Get project by ID with tasks
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Project detail
 *       404:
 *         description: Not found
 */
router.get('/:id', getProjectById);

/**
 * @swagger
 * /projects:
 *   post:
 *     tags: [Projects]
 *     summary: Create a new project (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Project'
 *     responses:
 *       201:
 *         description: Project created
 *       403:
 *         description: Forbidden
 */
router.post('/',
  authorize('admin'),
  [
    body('name').notEmpty().trim().isLength({ max: 200 }),
    body('description').optional().trim(),
    body('start_date').isISO8601().toDate(),
    body('end_date').isISO8601().toDate(),
    body('manager_id').isInt({ min: 1 }),
    body('status').optional().isIn(['planning','active','completed','archived']),
  ],
  validate, createProject
);

/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     tags: [Projects]
 *     summary: Update project (Admin or assigned PM)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Updated project
 *       403:
 *         description: Forbidden
 */
router.put('/:id',
  authorize('admin','project_manager'),
  [
    body('name').optional().trim().isLength({ max: 200 }),
    body('description').optional().trim(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('status').optional().isIn(['planning','active','completed','archived']),
    body('manager_id').optional().isInt({ min: 1 }),
  ],
  validate, updateProject
);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     tags: [Projects]
 *     summary: Soft-delete project (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted
 *       403:
 *         description: Forbidden
 */
router.delete('/:id', authorize('admin'), deleteProject);

export default router;