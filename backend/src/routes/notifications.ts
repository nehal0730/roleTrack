import { Router }       from 'express';
import { Op }           from 'sequelize';
import { Notification } from '../models';
import { authenticate } from '../middleware/auth';
import { AuthRequest }  from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: req.user!.id },
      order: [['created_at', 'DESC']],
      limit: 50,
    });
    res.json(notifications);
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.get('/unread-count', async (req: AuthRequest, res) => {
  try {
    const count = await Notification.count({
      where: { user_id: req.user!.id, is_read: false },
    });
    res.json({ count });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

// CRITICAL: /read-all MUST be before /:id/read
// otherwise Express matches 'read-all' as the :id parameter
router.put('/read-all', async (req: AuthRequest, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user!.id, is_read: false } }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

router.put('/:id/read', async (req: AuthRequest, res) => {
  try {
    const updated = await Notification.update(
      { is_read: true },
      { where: { id: req.params.id, user_id: req.user!.id } }
    );
    if (!updated[0]) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Marked as read' });
  } catch { res.status(500).json({ message: 'Server error' }); }
});

export default router;