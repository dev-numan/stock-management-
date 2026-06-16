import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import * as syncController from './sync.controller.js';

const router = Router();

router.use(authenticate);
router.get('/bootstrap', syncController.getBootstrap);

export default router;
