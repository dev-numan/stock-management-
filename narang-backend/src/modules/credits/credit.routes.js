import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import * as creditController from './credit.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', creditController.listCredits);

export default router;
