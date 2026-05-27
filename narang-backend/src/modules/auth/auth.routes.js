import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { loginValidator, registerValidator } from './auth.validator.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/login', loginValidator, validate, authController.login);
router.post('/register', registerValidator, validate, authController.register);
router.get('/me', authenticate, authController.me);

export default router;
