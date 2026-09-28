import { Router } from 'express';
import { requireStaff } from '../../middleware/auth';
import { adminWriteLimiter } from '../../middleware/rate-limit';
import { noStore } from '../../lib/respond';
import { productsAdminRouter } from './products.admin';
import { brandsAdminRouter, categoriesAdminRouter, specsAdminRouter } from './catalog.admin';
import { customersAdminRouter, ordersAdminRouter } from './orders.admin';
import { auditAdminRouter, permissionsAdminRouter, rolesAdminRouter, usersAdminRouter } from './users.admin';
import { inventoryAdminRouter, paymentsAdminRouter, questionsAdminRouter, reviewsAdminRouter } from './operations.admin';
import { bannersAdminRouter, couponsAdminRouter, deliveryAdminRouter, promotionsAdminRouter } from './marketing.admin';
import {
  expenseCategoriesAdminRouter,
  expensesAdminRouter,
  faqAdminRouter,
  mediaAdminRouter,
  messagesAdminRouter,
  notificationsAdminRouter,
  pagesAdminRouter,
  settingsAdminRouter,
  translationsAdminRouter,
} from './finance-content.admin';
import { analyticsAdminRouter, dashboardAdminRouter, reportsAdminRouter } from './analytics.admin';

/**
 * /api/admin — staff only. Every route below additionally checks its own granular permission
 * (requirePermission) so custom roles from the Roles & Permissions screen are enforced server-side.
 */
export const adminRouter = Router();

adminRouter.use(requireStaff);
adminRouter.use((req, res, next) => {
  noStore(res);
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') return adminWriteLimiter(req, res, next);
  next();
});

adminRouter.use('/dashboard', dashboardAdminRouter);
adminRouter.use('/analytics', analyticsAdminRouter);
adminRouter.use('/reports', reportsAdminRouter);

adminRouter.use('/products', productsAdminRouter);
adminRouter.use('/categories', categoriesAdminRouter);
adminRouter.use('/brands', brandsAdminRouter);
adminRouter.use('/specs', specsAdminRouter);

adminRouter.use('/orders', ordersAdminRouter);
adminRouter.use('/customers', customersAdminRouter);
adminRouter.use('/payments', paymentsAdminRouter);
adminRouter.use('/delivery', deliveryAdminRouter);
adminRouter.use('/inventory', inventoryAdminRouter);

adminRouter.use('/reviews', reviewsAdminRouter);
adminRouter.use('/questions', questionsAdminRouter);
adminRouter.use('/messages', messagesAdminRouter);

adminRouter.use('/coupons', couponsAdminRouter);
adminRouter.use('/promotions', promotionsAdminRouter);
adminRouter.use('/banners', bannersAdminRouter);
adminRouter.use('/media', mediaAdminRouter);

adminRouter.use('/expenses', expensesAdminRouter);
adminRouter.use('/expense-categories', expenseCategoriesAdminRouter);

adminRouter.use('/pages', pagesAdminRouter);
adminRouter.use('/faq', faqAdminRouter);
adminRouter.use('/translations', translationsAdminRouter);
adminRouter.use('/settings', settingsAdminRouter);
adminRouter.use('/notifications', notificationsAdminRouter);

adminRouter.use('/users', usersAdminRouter);
adminRouter.use('/roles', rolesAdminRouter);
adminRouter.use('/permissions', permissionsAdminRouter);
adminRouter.use('/audit-logs', auditAdminRouter);
