import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { logger } from './src/config/logger.js';
import { ensureDbConnection } from './src/config/db.js';
import { errorHandler } from './src/middleware/error.middleware.js';
import { ApiError } from './src/utils/ApiError.js';

import authRoutes from './src/modules/auth/auth.routes.js';
import supplierRoutes from './src/modules/suppliers/supplier.routes.js';
import customerRoutes from './src/modules/customers/customer.routes.js';
import productRoutes from './src/modules/products/product.routes.js';
import saleRoutes from './src/modules/sales/sale.routes.js';
import purchaseRoutes from './src/modules/purchases/purchase.routes.js';
import expenseRoutes from './src/modules/expenses/expense.routes.js';
import reportRoutes from './src/modules/reports/report.routes.js';
import settingsRoutes from './src/modules/settings/settings.routes.js';
import creditRoutes from './src/modules/credits/credit.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/v1', async (req, res, next) => {
  try {
    await ensureDbConnection();
    next();
  } catch (err) {
    next(err);
  }
});

const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/suppliers', supplierRoutes);
apiRouter.use('/customers', customerRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/sales', saleRoutes);
apiRouter.use('/purchases', purchaseRoutes);
apiRouter.use('/expenses', expenseRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/settings', settingsRoutes);
apiRouter.use('/credits', creditRoutes);

app.use('/api/v1', apiRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', shop: 'Hafeez Zarai Markaz' });
});

app.use((_req, _res, next) => {
  next(new ApiError(404, 'Route not found'));
});

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', async () => {
  try {
    await ensureDbConnection();
    logger.info('Database connected');
  } catch (err) {
    logger.error(`Database connection failed: ${err.message}`);
  }
  logger.info(`Hafeez Zarai Markaz API running on http://0.0.0.0:${PORT}`);

  if (process.env.ENABLE_NGROK === 'true') {
    const { startNgrokTunnel, syncMobileEnv } = await import('./src/config/ngrok.js');
    const publicUrl = await startNgrokTunnel(PORT);
    if (publicUrl) {
      syncMobileEnv(publicUrl);
      logger.info(`ngrok public API: ${publicUrl}`);
    }
  }
});
