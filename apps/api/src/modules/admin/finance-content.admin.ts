import { Router } from 'express';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Types } from 'mongoose';
import { LANGUAGES, type Language } from '@vero/config';
import {
  CONTACT_MESSAGE_STATUSES,
  CONTACT_MESSAGE_TYPES,
  EXPENSE_PAYMENT_METHODS,
  EXPENSE_STATUSES,
  MEDIA_FOLDERS,
  PAGE_SLUGS,
  type AdminContactMessage,
  type AdminExpense,
  type AdminExpenseCategory,
  type AdminFaq,
  type AdminPage,
  type AdminTranslationRow,
  type DatePreset,
} from '@vero/types';
import { flattenResources, sharedResources, type ResourceTree } from '@vero/i18n';
import { escapeRegex, resolveDatePreset } from '@vero/utils';
import {
  broadcastSchema,
  contactStatusSchema,
  expenseCategoryInputSchema,
  expenseInputSchema,
  faqInputSchema,
  mediaUpdateSchema,
  objectId,
  pageInputSchema,
  settingsUpdateSchema,
  settingValueSchemas,
  translationUpdateSchema,
  z,
} from '@vero/validation';
import { requirePermission } from '../../middleware/auth';
import { attachmentUpload, imageUpload } from '../../middleware/upload';
import { uploadLimiter } from '../../middleware/rate-limit';
import { validate, body, params, query } from '../../middleware/validate';
import { HttpError, notFound } from '../../lib/http-error';
import { created, noContent, ok, paged } from '../../lib/respond';
import { pageMeta, sortSpec } from '../../lib/pagination';
import { audit } from '../../lib/audit';
import { absoluteUrl, iso } from '../../lib/localize';
import { cache, CacheTags } from '../../lib/cache';
import { Expense, ExpenseCategory, type IExpense, type IExpenseCategory } from '../../models/expense.model';
import { Media, type IMedia } from '../../models/media.model';
import { ContactMessage, Faq, Page, Translation, type IContactMessage, type IFaq, type IPage } from '../../models/content.model';
import { NotificationLog } from '../../models/notification.model';
import { deleteMedia, refreshUsageCount, replaceMedia, toAdminMedia, uploadFile } from '../media/media.service';
import { listSettingsForAdmin, updateSettings } from '../settings/settings.service';
import { broadcast } from '../notifications/notifications.service';

export const expensesAdminRouter = Router();
export const expenseCategoriesAdminRouter = Router();
export const mediaAdminRouter = Router();
export const pagesAdminRouter = Router();
export const faqAdminRouter = Router();
export const messagesAdminRouter = Router();
export const translationsAdminRouter = Router();
export const settingsAdminRouter = Router();
export const notificationsAdminRouter = Router();

const idParams = z.object({ id: objectId });
const actorName = (req: import('express').Request) => `${req.auth!.user.firstName} ${req.auth!.user.lastName}`.trim();

/* -------------------------------- expenses -------------------------------- */

async function categoryMap() {
  const cats = await ExpenseCategory.find().lean();
  return new Map(cats.map((c) => [String(c._id), c]));
}

function toAdminExpense(e: IExpense, cats: Map<string, IExpenseCategory>): AdminExpense {
  const c = cats.get(String(e.category));
  return {
    id: String(e._id),
    title: e.title,
    category: { id: String(e.category), code: e.categoryCode, name: c?.name ?? { uz: e.categoryCode, ru: e.categoryCode, en: e.categoryCode }, color: c?.color ?? '#75757F' },
    description: e.description,
    amount: e.amount,
    currency: e.currency,
    exchangeRate: e.exchangeRate,
    amountUzs: e.amountUzs,
    date: iso(e.date)!,
    paymentMethod: e.paymentMethod,
    responsible: e.responsible,
    attachments: (e.attachments ?? []).map((a) => ({ media: String(a.media), url: absoluteUrl(a.url)!, name: a.name, mime: a.mime })),
    status: e.status,
    notes: e.notes,
    createdBy: e.createdBy ? { id: String(e.createdBy), name: e.createdByName ?? '' } : undefined,
    createdAt: iso(e.createdAt)!,
    updatedAt: iso(e.updatedAt)!,
  };
}

const expenseList = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  q: z.string().trim().max(80).optional(),
  category: objectId.optional(),
  status: z.enum(EXPENSE_STATUSES).optional(),
  paymentMethod: z.enum(EXPENSE_PAYMENT_METHODS).optional(),
  preset: z.enum(['today', 'yesterday', 'last7', 'last30', 'thisMonth', 'lastMonth', 'thisYear', 'custom']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  sort: z.string().max(30).optional(),
});

function expenseFilter(q: z.output<typeof expenseList>) {
  const filter: Record<string, unknown> = {};
  if (q.category) filter.category = new Types.ObjectId(q.category);
  if (q.status) filter.status = q.status;
  if (q.paymentMethod) filter.paymentMethod = q.paymentMethod;
  if (q.q) filter.$or = [{ title: { $regex: escapeRegex(q.q), $options: 'i' } }, { responsible: { $regex: escapeRegex(q.q), $options: 'i' } }, { description: { $regex: escapeRegex(q.q), $options: 'i' } }];
  if (q.preset || q.from || q.to) {
    const range = resolveDatePreset((q.preset ?? 'custom') as DatePreset, new Date(), { from: q.from, to: q.to });
    filter.date = { $gte: range.from, $lt: range.to };
  }
  if (q.min !== undefined || q.max !== undefined) filter.amountUzs = { ...(q.min !== undefined ? { $gte: q.min } : {}), ...(q.max !== undefined ? { $lte: q.max } : {}) };
  return filter;
}

expensesAdminRouter.get('/', requirePermission('expenses.read'), validate({ query: expenseList }), async (req, res) => {
  const q = query<z.output<typeof expenseList>>(req);
  const filter = expenseFilter(q);
  const sort = sortSpec(q.sort, ['date', 'amountUzs', 'title', 'createdAt'], { date: -1, _id: -1 });
  const [rows, total, cats] = await Promise.all([Expense.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Expense.countDocuments(filter), categoryMap()]);
  paged(res, rows.map((e) => toAdminExpense(e, cats)), pageMeta(q.page, q.limit, total));
});

expensesAdminRouter.get('/summary', requirePermission('expenses.read'), validate({ query: expenseList }), async (req, res) => {
  const q = query<z.output<typeof expenseList>>(req);
  const filter = { ...expenseFilter(q), status: q.status ?? { $ne: 'CANCELLED' } };
  const [rows, cats] = await Promise.all([
    Expense.aggregate<{ _id: string; amount: number; count: number }>([{ $match: filter }, { $group: { _id: '$categoryCode', amount: { $sum: '$amountUzs' }, count: { $sum: 1 } } }, { $sort: { amount: -1 } }]),
    ExpenseCategory.find().lean(),
  ]);
  const byCode = new Map(cats.map((c) => [c.code, c]));
  ok(res, {
    total: rows.reduce((s, r) => s + r.amount, 0),
    count: rows.reduce((s, r) => s + r.count, 0),
    byCategory: rows.map((r) => ({ code: r._id, name: byCode.get(r._id)?.name ?? { uz: r._id, ru: r._id, en: r._id }, color: byCode.get(r._id)?.color ?? '#75757F', amount: r.amount, count: r.count })),
  });
});

expensesAdminRouter.get('/:id', requirePermission('expenses.read'), validate({ params: idParams }), async (req, res) => {
  const e = await Expense.findById(params<{ id: string }>(req).id).lean();
  if (!e) throw notFound('Expense');
  ok(res, toAdminExpense(e, await categoryMap()));
});

async function expenseFields(input: z.output<typeof expenseInputSchema>) {
  const category = await ExpenseCategory.findById(input.category).lean();
  if (!category) throw new HttpError(422, 'VALIDATION_ERROR', 'Category not found', { fields: { category: 'errors.NOT_FOUND' } });
  const media = input.attachments.length ? await Media.find({ _id: { $in: input.attachments.map((a) => a.media) } }).lean() : [];
  return {
    ...input,
    categoryCode: category.code,
    amountUzs: Math.round(input.currency === 'UZS' ? input.amount : input.amount * input.exchangeRate),
    exchangeRate: input.currency === 'UZS' ? 1 : input.exchangeRate,
    attachments: media.map((m) => ({ media: m._id, url: m.url, name: m.originalName || m.filename, mime: m.mime })),
  };
}

expensesAdminRouter.post('/', requirePermission('expenses.create'), validate({ body: expenseInputSchema }), async (req, res) => {
  const doc = await Expense.create({ ...(await expenseFields(body(req))), createdBy: req.auth!.id, createdByName: actorName(req) });
  for (const a of doc.attachments) await refreshUsageCount(a.media);
  await audit(req, { action: 'expense.create', target: { type: 'expense', id: String(doc._id), label: doc.title }, meta: { amountUzs: doc.amountUzs, category: doc.categoryCode } });
  created(res, toAdminExpense(doc.toObject() as IExpense, await categoryMap()));
});

expensesAdminRouter.put('/:id', requirePermission('expenses.update'), validate({ params: idParams, body: expenseInputSchema }), async (req, res) => {
  const existing = await Expense.findById(params<{ id: string }>(req).id).lean();
  if (!existing) throw notFound('Expense');
  const fields = await expenseFields(body(req));
  await Expense.updateOne({ _id: existing._id }, { $set: fields });
  await audit(req, { action: 'expense.update', target: { type: 'expense', id: String(existing._id), label: fields.title }, changes: { amountUzs: { from: existing.amountUzs, to: fields.amountUzs }, status: { from: existing.status, to: fields.status } } });
  ok(res, toAdminExpense((await Expense.findById(existing._id).lean())!, await categoryMap()));
});

expensesAdminRouter.delete('/:id', requirePermission('expenses.delete'), validate({ params: idParams }), async (req, res) => {
  const e = await Expense.findByIdAndDelete(params<{ id: string }>(req).id).lean();
  if (!e) throw notFound('Expense');
  for (const a of e.attachments ?? []) await refreshUsageCount(a.media);
  await audit(req, { action: 'expense.delete', target: { type: 'expense', id: String(e._id), label: e.title }, meta: { amountUzs: e.amountUzs } });
  noContent(res);
});

expensesAdminRouter.post('/attachments', requirePermission('expenses.create'), uploadLimiter, attachmentUpload.array('files', 10), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) throw new HttpError(400, 'FILE_REQUIRED', 'Files are required');
  const out = [];
  for (const f of files) out.push(toAdminMedia(await uploadFile(f, 'expenses', { id: req.auth!.id, name: actorName(req) }, { allowDocuments: true })));
  created(res, out);
});

const toCategory = (c: IExpenseCategory): AdminExpenseCategory => ({ id: String(c._id), code: c.code, name: c.name, color: c.color, isActive: c.isActive, isSystem: c.isSystem });

expenseCategoriesAdminRouter.get('/', requirePermission('expenses.read'), async (_req, res) => {
  ok(res, (await ExpenseCategory.find().sort({ isSystem: -1, code: 1 }).lean()).map(toCategory));
});
expenseCategoriesAdminRouter.post('/', requirePermission('expenses.create'), validate({ body: expenseCategoryInputSchema }), async (req, res) => {
  const input = body<z.output<typeof expenseCategoryInputSchema>>(req);
  if (await ExpenseCategory.exists({ code: input.code })) throw new HttpError(409, 'CONFLICT', 'Code already exists', { fields: { code: 'validation.duplicate' } });
  const doc = await ExpenseCategory.create({ ...input, isSystem: false });
  await audit(req, { action: 'expense_category.create', target: { type: 'expense_category', id: String(doc._id), label: doc.code } });
  created(res, toCategory(doc.toObject() as IExpenseCategory));
});
expenseCategoriesAdminRouter.put('/:id', requirePermission('expenses.update'), validate({ params: idParams, body: expenseCategoryInputSchema.partial() }), async (req, res) => {
  const existing = await ExpenseCategory.findById(params<{ id: string }>(req).id).lean();
  if (!existing) throw notFound('Expense category');
  const input = body<Partial<z.output<typeof expenseCategoryInputSchema>>>(req);
  if (existing.isSystem) delete input.code;
  await ExpenseCategory.updateOne({ _id: existing._id }, { $set: input });
  if (input.code && input.code !== existing.code) await Expense.updateMany({ category: existing._id }, { $set: { categoryCode: input.code } });
  await audit(req, { action: 'expense_category.update', target: { type: 'expense_category', id: String(existing._id), label: existing.code } });
  ok(res, toCategory((await ExpenseCategory.findById(existing._id).lean())!));
});
expenseCategoriesAdminRouter.delete('/:id', requirePermission('expenses.delete'), validate({ params: idParams }), async (req, res) => {
  const c = await ExpenseCategory.findById(params<{ id: string }>(req).id).lean();
  if (!c) throw notFound('Expense category');
  if (c.isSystem) throw new HttpError(403, 'SYSTEM_PROTECTED', 'System categories cannot be deleted');
  if (await Expense.exists({ category: c._id })) throw new HttpError(409, 'IN_USE', 'Category is used by expenses');
  await ExpenseCategory.deleteOne({ _id: c._id });
  await audit(req, { action: 'expense_category.delete', target: { type: 'expense_category', id: String(c._id), label: c.code } });
  noContent(res);
});

/* ---------------------------------- media --------------------------------- */

const mediaList = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(120).default(48),
  q: z.string().trim().max(80).optional(),
  folder: z.enum(MEDIA_FOLDERS).optional(),
  type: z.enum(['image', 'document']).optional(),
  unused: z.enum(['1', '0']).optional(),
});

mediaAdminRouter.get('/', requirePermission('media.read'), validate({ query: mediaList }), async (req, res) => {
  const q = query<z.output<typeof mediaList>>(req);
  const filter: Record<string, unknown> = {};
  if (q.folder) filter.folder = q.folder;
  if (q.type === 'image') filter.mime = { $regex: '^image/' };
  if (q.type === 'document') filter.mime = { $not: /^image\// };
  if (q.unused === '1') filter.usageCount = 0;
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ originalName: rx }, { tags: q.q.toLowerCase() }, { 'alt.uz': rx }, { 'alt.ru': rx }, { 'alt.en': rx }];
  }
  const [rows, total] = await Promise.all([Media.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), Media.countDocuments(filter)]);
  paged(res, rows.map(toAdminMedia), pageMeta(q.page, q.limit, total));
});

mediaAdminRouter.post('/', requirePermission('media.upload'), uploadLimiter, imageUpload.array('files', 20), async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  if (!files.length) throw new HttpError(400, 'FILE_REQUIRED', 'Files are required');
  const folder = z.enum(MEDIA_FOLDERS).catch('general').parse((req.body as { folder?: string })?.folder);
  const out: ReturnType<typeof toAdminMedia>[] = [];
  for (const f of files) out.push(toAdminMedia(await uploadFile(f, folder, { id: req.auth!.id, name: actorName(req) })));
  await audit(req, { action: 'media.upload', target: { type: 'media' }, meta: { count: out.length, folder } });
  created(res, out);
});

mediaAdminRouter.patch('/:id', requirePermission('media.upload'), validate({ params: idParams, body: mediaUpdateSchema }), async (req, res) => {
  const m = await Media.findByIdAndUpdate(params<{ id: string }>(req).id, { $set: body(req) }, { new: true }).lean();
  if (!m) throw notFound('Media');
  ok(res, toAdminMedia(m));
});

mediaAdminRouter.post('/:id/replace', requirePermission('media.upload'), uploadLimiter, validate({ params: idParams }), imageUpload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'FILE_REQUIRED', 'File is required');
  const m = await replaceMedia(params<{ id: string }>(req).id, req.file, { id: req.auth!.id, name: actorName(req) });
  await cache.invalidate(CacheTags.home, CacheTags.catalog);
  await audit(req, { action: 'media.replace', target: { type: 'media', id: String(m._id), label: m.originalName } });
  ok(res, toAdminMedia(m));
});

mediaAdminRouter.delete('/:id', requirePermission('media.delete'), validate({ params: idParams, query: z.object({ force: z.enum(['1', '0']).optional() }) }), async (req, res) => {
  const { id } = params<{ id: string }>(req);
  const m = await Media.findById(id).lean();
  if (!m) throw notFound('Media');
  await deleteMedia(id, query<{ force?: string }>(req).force === '1');
  await audit(req, { action: 'media.delete', target: { type: 'media', id, label: (m as IMedia).originalName } });
  noContent(res);
});

/* ---------------------------------- pages --------------------------------- */

const toAdminPage = (p: IPage): AdminPage => ({ id: String(p._id), slug: p.slug, title: p.title, content: p.content, seoTitle: p.seoTitle, seoDescription: p.seoDescription, isPublished: p.isPublished, updatedAt: iso(p.updatedAt)! });

pagesAdminRouter.get('/', requirePermission('content.read'), async (_req, res) => {
  ok(res, (await Page.find().sort({ slug: 1 }).lean()).map(toAdminPage));
});
pagesAdminRouter.get('/:slug', requirePermission('content.read'), validate({ params: z.object({ slug: z.enum(PAGE_SLUGS) }) }), async (req, res) => {
  const p = await Page.findOne({ slug: params<{ slug: string }>(req).slug }).lean();
  if (!p) throw notFound('Page');
  ok(res, toAdminPage(p));
});
pagesAdminRouter.put('/:slug', requirePermission('content.update'), validate({ params: z.object({ slug: z.enum(PAGE_SLUGS) }), body: pageInputSchema }), async (req, res) => {
  const { slug } = params<{ slug: string }>(req);
  const p = await Page.findOneAndUpdate({ slug }, { $set: { ...body(req), slug } }, { new: true, upsert: true }).lean();
  await audit(req, { action: 'page.update', target: { type: 'page', id: String(p!._id), label: slug } });
  ok(res, toAdminPage(p!));
});

/* ----------------------------------- faq ---------------------------------- */

const toAdminFaq = (f: IFaq): AdminFaq => ({ id: String(f._id), category: f.category, question: f.question, answer: f.answer, order: f.order, isActive: f.isActive });

faqAdminRouter.get('/', requirePermission('content.read'), async (_req, res) => {
  ok(res, (await Faq.find().sort({ category: 1, order: 1 }).lean()).map(toAdminFaq));
});
faqAdminRouter.post('/', requirePermission('content.update'), validate({ body: faqInputSchema }), async (req, res) => {
  const f = await Faq.create(body<z.output<typeof faqInputSchema>>(req));
  await cache.invalidate(CacheTags.home);
  await audit(req, { action: 'faq.create', target: { type: 'faq', id: String(f._id) } });
  created(res, toAdminFaq(f.toObject() as IFaq));
});
faqAdminRouter.put('/:id', requirePermission('content.update'), validate({ params: idParams, body: faqInputSchema.partial() }), async (req, res) => {
  const f = await Faq.findByIdAndUpdate(params<{ id: string }>(req).id, { $set: body(req) }, { new: true }).lean();
  if (!f) throw notFound('FAQ');
  await cache.invalidate(CacheTags.home);
  await audit(req, { action: 'faq.update', target: { type: 'faq', id: String(f._id) } });
  ok(res, toAdminFaq(f));
});
faqAdminRouter.delete('/:id', requirePermission('content.update'), validate({ params: idParams }), async (req, res) => {
  const f = await Faq.findByIdAndDelete(params<{ id: string }>(req).id).lean();
  if (!f) throw notFound('FAQ');
  await cache.invalidate(CacheTags.home);
  await audit(req, { action: 'faq.delete', target: { type: 'faq', id: String(f._id) } });
  noContent(res);
});

/* --------------------------------- messages ------------------------------- */

type MessageProduct = { _id: Types.ObjectId; name: { uz: string; ru: string; en: string } } | null;

const toMessage = (m: IContactMessage): AdminContactMessage => {
  const product = m.product as unknown as MessageProduct | Types.ObjectId | undefined;
  return {
    id: String(m._id),
    type: m.type,
    name: m.name,
    phone: m.phone,
    email: m.email,
    subject: m.subject,
    message: m.message,
    product: product && 'name' in product && product.name ? { id: String(product._id), name: product.name } : undefined,
    status: m.status,
    handledBy: m.handledBy,
    createdAt: iso(m.createdAt)!,
  };
};

messagesAdminRouter.get(
  '/',
  requirePermission('content.read'),
  validate({
    query: z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      status: z.enum(CONTACT_MESSAGE_STATUSES).optional(),
      type: z.enum(CONTACT_MESSAGE_TYPES).optional(),
      q: z.string().trim().max(80).optional(),
    }),
  }),
  async (req, res) => {
    const q = query<{ page: number; limit: number; status?: string; type?: string; q?: string }>(req);
    const filter: Record<string, unknown> = {};
    if (q.status) filter.status = q.status;
    if (q.type) filter.type = q.type;
    if (q.q) {
      const rx = { $regex: escapeRegex(q.q), $options: 'i' };
      filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { subject: rx }, { message: rx }];
    }
    const [rows, total] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).populate('product', 'name').lean(),
      ContactMessage.countDocuments(filter),
    ]);
    paged(res, rows.map(toMessage), pageMeta(q.page, q.limit, total));
  },
);
messagesAdminRouter.patch('/:id', requirePermission('content.update'), validate({ params: idParams, body: contactStatusSchema }), async (req, res) => {
  const m = await ContactMessage.findByIdAndUpdate(params<{ id: string }>(req).id, { $set: { status: body<{ status: string }>(req).status, handledBy: actorName(req) } }, { new: true }).lean();
  if (!m) throw notFound('Message');
  await audit(req, { action: 'message.status', target: { type: 'message', id: String(m._id) }, meta: { status: m.status } });
  ok(res, toMessage(m));
});
messagesAdminRouter.delete('/:id', requirePermission('content.update'), validate({ params: idParams }), async (req, res) => {
  const m = await ContactMessage.findByIdAndDelete(params<{ id: string }>(req).id).lean();
  if (!m) throw notFound('Message');
  await audit(req, { action: 'message.delete', target: { type: 'message', id: String(m._id), label: m.name } });
  noContent(res);
});

/* ------------------------------- translations ----------------------------- */

const here = dirname(fileURLToPath(import.meta.url));
function localesDir(): string | null {
  const candidates = [process.env.I18N_LOCALES_DIR, resolve(here, '../../../../../packages/i18n/locales'), resolve(process.cwd(), 'packages/i18n/locales'), resolve(process.cwd(), '../../packages/i18n/locales')].filter(Boolean) as string[];
  return candidates.find((c) => existsSync(c)) ?? null;
}

let bundled: Map<string, Record<Language, Record<string, string>>> | null = null;
let bundledSignature = '';
let signatureCheckedAt = 0;

/** Changes whenever a locale file is added, removed or edited (so a deploy / edit is picked up without a restart). */
function localesSignature(dir: string | null): string {
  if (!dir) return 'none';
  const parts: string[] = [dir];
  for (const lng of LANGUAGES) {
    const d = join(dir, lng);
    if (!existsSync(d)) continue;
    for (const file of readdirSync(d).filter((f) => f.endsWith('.json')).sort()) {
      try {
        const s = statSync(join(d, file));
        parts.push(`${lng}/${file}:${s.mtimeMs}:${s.size}`);
      } catch {
        parts.push(`${lng}/${file}:?`);
      }
    }
  }
  return parts.join('|');
}

/** namespace → language → flat key → value, from the JSON files shipped with the apps. */
function bundledResources() {
  const dir = localesDir();
  // stat the files at most every 5 seconds (the translations screen issues several requests per view)
  if (bundled && Date.now() - signatureCheckedAt < 5_000) return bundled;
  signatureCheckedAt = Date.now();
  const signature = localesSignature(dir);
  if (bundled && signature === bundledSignature) return bundled;
  bundledSignature = signature;
  const out = new Map<string, Record<Language, Record<string, string>>>();
  const put = (ns: string, lng: Language, tree: ResourceTree) => {
    const entry = out.get(ns) ?? { uz: {}, ru: {}, en: {} };
    entry[lng] = { ...entry[lng], ...flattenResources(tree) };
    out.set(ns, entry);
  };
  for (const lng of LANGUAGES) for (const [ns, tree] of Object.entries(sharedResources[lng])) put(ns, lng, tree);
  if (dir) {
    for (const lng of LANGUAGES) {
      const d = join(dir, lng);
      if (!existsSync(d)) continue;
      for (const file of readdirSync(d).filter((f) => f.endsWith('.json'))) {
        try {
          put(file.replace(/\.json$/, ''), lng, JSON.parse(readFileSync(join(d, file), 'utf8')) as ResourceTree);
        } catch {
          /* ignore malformed file */
        }
      }
    }
  }
  bundled = out;
  return out;
}

const translationList = z.object({
  namespace: z.string().max(40).optional(),
  q: z.string().trim().max(100).optional(),
  missing: z.enum(LANGUAGES).optional(),
  edited: z.enum(['1', '0']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

translationsAdminRouter.get('/namespaces', requirePermission('translations.read'), async (_req, res) => {
  ok(res, [...bundledResources().keys()].sort());
});

translationsAdminRouter.get('/', requirePermission('translations.read'), validate({ query: translationList }), async (req, res) => {
  const q = query<z.output<typeof translationList>>(req);
  const res0 = bundledResources();
  const overrides = await Translation.find(q.namespace ? { namespace: q.namespace } : {}).lean();
  const ovMap = new Map(overrides.map((o) => [`${o.namespace}:${o.key}`, o]));
  let rows: AdminTranslationRow[] = [];
  for (const [ns, langs] of res0) {
    if (q.namespace && ns !== q.namespace) continue;
    const keys = new Set([...Object.keys(langs.uz), ...Object.keys(langs.ru), ...Object.keys(langs.en)]);
    for (const key of keys) {
      const ov = ovMap.get(`${ns}:${key}`);
      rows.push({
        namespace: ns,
        key,
        defaults: { uz: langs.uz[key] ?? '', ru: langs.ru[key] ?? '', en: langs.en[key] ?? '' },
        overrides: ov?.values ?? {},
        updatedAt: iso(ov?.updatedAt),
      });
    }
  }
  if (q.q) {
    const needle = q.q.toLowerCase();
    rows = rows.filter((r) => r.key.toLowerCase().includes(needle) || Object.values(r.defaults).some((v) => v.toLowerCase().includes(needle)) || Object.values(r.overrides).some((v) => v?.toLowerCase().includes(needle)));
  }
  if (q.missing) rows = rows.filter((r) => !(r.overrides[q.missing!] || r.defaults[q.missing!]));
  if (q.edited) {
    const wantEdited = q.edited === '1';
    rows = rows.filter((r) => Object.values(r.overrides).some(Boolean) === wantEdited);
  }
  rows.sort((a, b) => a.namespace.localeCompare(b.namespace) || a.key.localeCompare(b.key));
  const total = rows.length;
  paged(res, rows.slice((q.page - 1) * q.limit, q.page * q.limit), pageMeta(q.page, q.limit, total));
});

translationsAdminRouter.put('/', requirePermission('translations.update'), validate({ body: translationUpdateSchema }), async (req, res) => {
  const input = body<z.output<typeof translationUpdateSchema>>(req);
  const values = Object.fromEntries(Object.entries(input.values).filter(([, v]) => v !== undefined));
  const doc = await Translation.findOneAndUpdate(
    { namespace: input.namespace, key: input.key },
    { $set: { values, updatedBy: req.auth!.id } },
    { upsert: true, new: true },
  ).lean();
  await cache.invalidate(CacheTags.translations);
  await audit(req, { action: 'translation.update', target: { type: 'translation', id: `${input.namespace}:${input.key}` }, meta: { values } });
  const langs = bundledResources().get(input.namespace);
  ok(res, {
    namespace: input.namespace,
    key: input.key,
    defaults: { uz: langs?.uz[input.key] ?? '', ru: langs?.ru[input.key] ?? '', en: langs?.en[input.key] ?? '' },
    overrides: doc!.values,
    updatedAt: iso(doc!.updatedAt),
  });
});

translationsAdminRouter.delete('/', requirePermission('translations.update'), validate({ body: z.object({ namespace: z.string().max(40), key: z.string().max(150) }) }), async (req, res) => {
  const { namespace, key } = body<{ namespace: string; key: string }>(req);
  await Translation.deleteOne({ namespace, key });
  await cache.invalidate(CacheTags.translations);
  await audit(req, { action: 'translation.reset', target: { type: 'translation', id: `${namespace}:${key}` } });
  noContent(res);
});

/* --------------------------------- settings ------------------------------- */

settingsAdminRouter.get('/', requirePermission('settings.read'), async (_req, res) => {
  ok(res, await listSettingsForAdmin());
});

settingsAdminRouter.put('/', requirePermission('settings.update'), validate({ body: settingsUpdateSchema }), async (req, res) => {
  const { values: raw } = body<{ values: Record<string, unknown> }>(req);
  // every key is validated with its own schema; unknown keys are refused instead of silently ignored
  const fields: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const schema = (settingValueSchemas as Record<string, z.ZodType>)[key];
    if (!schema) {
      fields[key] = 'validation.oneOf';
      continue;
    }
    const parsed = schema.safeParse(value);
    if (parsed.success) values[key] = parsed.data;
    else {
      const issue = parsed.error.issues[0];
      const path = issue?.path.length ? `${key}.${issue.path.join('.')}` : key;
      fields[path] = issue?.message ?? 'validation.oneOf';
    }
  }
  if (Object.keys(fields).length) throw new HttpError(422, 'VALIDATION_ERROR', 'Invalid settings', { fields });
  if (!Object.keys(values).length) throw new HttpError(422, 'VALIDATION_ERROR', 'No settings to update', { fields: { values: 'validation.required' } });
  const before = Object.fromEntries((await listSettingsForAdmin()).map((s) => [s.key, s.value]));
  const changed = await updateSettings(values, req.auth!.id);
  await audit(req, { action: 'settings.change', target: { type: 'settings' }, changes: Object.fromEntries(changed.map((k) => [k, { from: before[k], to: values[k] }])) });
  ok(res, await listSettingsForAdmin());
});

/* ------------------------------ notifications ----------------------------- */

notificationsAdminRouter.post('/broadcast', requirePermission('notifications.send'), validate({ body: broadcastSchema }), async (req, res) => {
  const input = body<z.output<typeof broadcastSchema>>(req);
  const recipients = await broadcast(input, { id: req.auth!.id, name: actorName(req) });
  await audit(req, { action: 'notification.broadcast', target: { type: 'notification' }, meta: { type: input.type, audience: input.audience, channels: input.channels, recipients } });
  ok(res, { recipients });
});

notificationsAdminRouter.get('/logs', requirePermission('notifications.read'), validate({ query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }) }), async (req, res) => {
  const q = query<{ page: number; limit: number }>(req);
  const [rows, total] = await Promise.all([NotificationLog.find().sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), NotificationLog.countDocuments()]);
  paged(
    res,
    rows.map((r) => ({ id: String(r._id), type: r.type, title: r.title, body: r.body, audience: r.audience, channels: r.channels, recipients: r.recipients, sentBy: r.sentByName, createdAt: iso(r.createdAt)! })),
    pageMeta(q.page, q.limit, total),
  );
});
