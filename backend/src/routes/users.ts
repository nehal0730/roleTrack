import { Router }   from 'express';
import { body }     from 'express-validator';
import bcrypt       from 'bcryptjs';
import { Op }       from 'sequelize';
import { User, Role, Task, TaskAssignment } from '../models';
import { authenticate, authorize }          from '../middleware/auth';
import { validate }                         from '../middleware/validate';
import { createAuditLog }                   from '../middleware/auditLogger';
import { AuthRequest }                      from '../middleware/auth';
import { Response } from 'express';

const router = Router();
router.use(authenticate);

// List all users (admin sees all, PM sees employees only)
router.get('/', authorize('admin', 'project_manager'), async (req: AuthRequest, res) => {
  try {
    const where: any = {};
    if (req.user!.role === 'project_manager') where.role_id = 3; // employees only

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expiry'] },
      include: [{ model: Role, as: 'role', attributes: ['name'] }],
      order: [['name', 'ASC']],
    });
    res.json(users);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Get single user
router.get('/:id', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expiry'] },
      include: [{ model: Role, as: 'role', attributes: ['name'] }],
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Create user
router.post('/',
  authorize('admin'),
  [
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role_id').isInt({ min: 1, max: 3 }),
  ],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, email, password, role_id } = req.body;

      const exists = await User.findOne({ where: { email } });
      if (exists) return res.status(409).json({ message: 'Email already in use' });

      const hash = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, password_hash: hash, role_id });

      await createAuditLog(
        req.user!.id, 'CREATE_USER', 'user', user.id,
        null, { name, email, role_id }, req.ip
      );
      res.status(201).json({
        id: user.id, name: user.name, email: user.email, role_id: user.role_id,
      });
    } catch { res.status(500).json({ message: 'Server error' }); }
  }
);

// Update user
router.put('/:id',
  authorize('admin'),
  [
    body('name').optional().notEmpty().trim(),
    body('role_id').optional().isInt({ min: 1, max: 3 }),
    body('is_active').optional().isBoolean(),
  ],
  validate,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const previous = user.toJSON();
      const { name, role_id, is_active } = req.body;
      await user.update({ name, role_id, is_active });

      await createAuditLog(
        req.user!.id, 'UPDATE_USER', 'user', user.id,
        previous, { name, role_id, is_active }, req.ip
      );
      res.json({ message: 'User updated' });
    } catch { res.status(500).json({ message: 'Server error' }); }
  }
);

// Soft-delete user
router.delete('/:id', authorize('admin'), async (req: AuthRequest, res) => {
  try {
    if (Number(req.params.id) === req.user!.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    await createAuditLog(
      req.user!.id, 'DELETE_USER', 'user', user.id,
      user.toJSON(), null, req.ip
    );
    await user.destroy();
    res.json({ message: 'User deactivated' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// Employee workload summary — useful for reports
router.get('/:id/workload', authorize('admin', 'project_manager'), async (req: AuthRequest, res) => {
  try {
    const assignments = await TaskAssignment.findAll({
      where: { assigned_to: req.params.id, unassigned_at: null },
      include: [
        {
          model: Task, as: 'task',
          attributes: ['id','title','status','priority','deadline'],
        },
      ],
      order: [['assigned_at', 'DESC']],
    });
    res.json(assignments);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

export default router;