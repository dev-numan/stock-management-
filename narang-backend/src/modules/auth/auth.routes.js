import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { loginValidator, registerValidator } from './auth.validator.js';
import * as authController from './auth.controller.js';

const router = Router();

// Throttle credential endpoints to slow brute-force / credential-stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});

router.post('/login', authLimiter, loginValidator, validate, authController.login);
// Account creation is an admin action — only a signed-in ADMIN may add users.
// Closes the privilege-escalation hole where an anonymous caller could
// self-register with role: 'ADMIN'.
router.post(
  '/register',
  authenticate,
  authorize('ADMIN'),
  registerValidator,
  validate,
  authController.register
);
router.get('/me', authenticate, authController.me);

export default router;
