import { Router } from 'express';
import { body }   from 'express-validator';
import {
  login, refreshToken, logout,
  forgotPassword, resetPassword, getMe,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate }     from '../middleware/validate';

const router = Router();

router.post('/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate, login
);
router.post('/refresh',
  [body('refreshToken').notEmpty()],
  validate, refreshToken
);
router.post('/logout', authenticate, logout);
router.post('/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate, forgotPassword
);
router.post('/reset-password',
  [body('token').notEmpty(), body('password').isLength({ min: 6 })],
  validate, resetPassword
);
router.get('/me', authenticate, getMe);

export default router;