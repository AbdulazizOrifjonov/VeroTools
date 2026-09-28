import { Router } from 'express';
import { hasPermission, type ReportType } from '@vero/types';
import { analyticsQuerySchema, reportQuerySchema, reportTypeSchema, z } from '@vero/validation';
import { requirePermission } from '../../middleware/auth';
import { validate, params, query } from '../../middleware/validate';
import { forbidden } from '../../lib/http-error';
import { noStore, ok } from '../../lib/respond';
import { audit } from '../../lib/audit';
import { toCsv, toPdf, toXlsx } from '../../lib/exporters';
import { analytics, dashboard } from '../analytics/analytics.service';
import { buildReport, reportFileName } from '../analytics/reports.service';

export const dashboardAdminRouter = Router();
export const analyticsAdminRouter = Router();
export const reportsAdminRouter = Router();

/** Every figure is computed from the database on request — nothing on the dashboard is static. */
dashboardAdminRouter.get('/', requirePermission('dashboard.read'), async (req, res) => {
  noStore(res);
  const financeVisible = hasPermission(req.auth!.permissions, ['analytics.read', 'expenses.read'], 'any');
  ok(res, await dashboard({ financeVisible, lang: req.ctx.lang }));
});

analyticsAdminRouter.get('/', requirePermission('analytics.read'), validate({ query: analyticsQuerySchema }), async (req, res) => {
  noStore(res);
  ok(res, await analytics(query<z.output<typeof analyticsQuerySchema>>(req), req.ctx.lang));
});

/** Reports touching money outside of sales need the matching finance permission as well. */
const EXTRA_PERMISSION: Partial<Record<ReportType, 'analytics.read' | 'expenses.read'>> = {
  profit: 'analytics.read',
  expenses: 'expenses.read',
};

const CONTENT_TYPES = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
} as const;

reportsAdminRouter.get(
  '/:type',
  requirePermission('reports.read'),
  validate({ params: z.object({ type: reportTypeSchema }), query: reportQuerySchema }),
  async (req, res) => {
    noStore(res);
    const { type } = params<{ type: ReportType }>(req);
    const q = query<z.output<typeof reportQuerySchema>>(req);
    const perms = req.auth!.permissions;
    const extra = EXTRA_PERMISSION[type];
    if (extra && !hasPermission(perms, extra)) throw forbidden();
    if (q.format !== 'json' && !hasPermission(perms, 'reports.export')) throw forbidden();

    const report = await buildReport(type, q, q.lang);
    if (q.format === 'json') return void ok(res, report);

    const file =
      q.format === 'csv' ? toCsv(report) : q.format === 'xlsx' ? await toXlsx(report, q.lang) : await toPdf(report, q.lang);
    await audit(req, {
      action: 'report.export',
      target: { type: 'report', id: type, label: report.title },
      meta: { format: q.format, from: report.range.from, to: report.range.to, rows: report.rows.length },
    });
    res.setHeader('Content-Type', CONTENT_TYPES[q.format]);
    res.setHeader('Content-Disposition', `attachment; filename="${reportFileName(report)}.${q.format}"`);
    res.setHeader('Content-Length', String(file.length));
    res.end(file);
  },
);
