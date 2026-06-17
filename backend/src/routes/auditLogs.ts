import { Router }   from 'express';
import { AuditLog, User } from '../models';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate, authorize('admin'));

router.get('/', async (req, res) => {
  try {
    const { entity_type, user_id, page = 1, limit = 50 } = req.query;
    const where: any = {};
    if (entity_type) where.entity_type = entity_type;
    if (user_id)     where.user_id     = user_id;

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id','name','email'] }],
      order:   [['created_at', 'DESC']],
      limit:   Number(limit),
      offset:  (Number(page) - 1) * Number(limit),
    });

    res.json({ logs: rows, total: count, page: Number(page), totalPages: Math.ceil(count / Number(limit)) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;