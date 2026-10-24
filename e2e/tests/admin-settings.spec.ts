import { expect, test, type Locator, type Page } from '@playwright/test';

/*
 * Admin → Settings: every section is saved through the real API (each key is validated server-side with its own
 * schema) and the storefront picks the change up. Every value is restored afterwards.
 */

const WEB = (process.env.E2E_WEB_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const ADMIN = (process.env.E2E_ADMIN_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
const STAFF = { login: process.env.E2E_ADMIN_LOGIN ?? 'admin@ockean.uz', password: process.env.E2E_ADMIN_PASSWORD ?? 'OckeanAdmin2026' };

let panel: Page;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Asia/Tashkent' });
  await context.addInitScript(() => window.localStorage.setItem('vt.admin.language', 'en'));
  panel = await context.newPage();
  await panel.goto(`${ADMIN}/login`);
  await panel.getByRole('textbox', { name: 'Email or phone' }).fill(STAFF.login);
  await panel.getByRole('textbox', { name: 'Password', exact: true }).fill(STAFF.password);
  await panel.getByRole('button', { name: 'Sign in' }).click();
  await expect(panel).toHaveURL(`${ADMIN}/`);
  await panel.goto(`${ADMIN}/settings`);
});

test.afterAll(async () => {
  await panel?.context().close();
});

async function open(section: string): Promise<Locator> {
  await panel.getByRole('navigation', { name: 'Sections' }).getByRole('button', { name: section, exact: true }).click();
  const region = panel.getByRole('region', { name: section, exact: true });
  await expect(region).toBeVisible();
  return region;
}

/** Saves the open section and waits until the API accepted it (the form is clean again, no error shown). */
async function save(group: string) {
  const button = panel.getByRole('button', { name: 'Save', exact: true });
  await expect(button).toBeEnabled();
  await button.click();
  await expect(panel.getByText(`“${group}” settings saved`).last()).toBeVisible();
  await expect(button).toBeDisabled();
  await expect(panel.getByText('The server did not apply the changes')).toHaveCount(0);
}

async function editAndRestore(field: Locator, group: string, change: (value: string) => string, verify?: (value: string) => Promise<void>) {
  const original = await field.inputValue();
  const changed = change(original);
  await field.fill(changed);
  await save(group);
  await expect(field).toHaveValue(changed);
  if (verify) await verify(changed);
  await field.fill(original);
  await save(group);
  await expect(field).toHaveValue(original);
}

test('store details are saved and shown on the storefront', async () => {
  const store = await open('Store');
  await editAndRestore(store.getByRole('textbox', { name: 'Opening hours' }), 'Store', (v) => `${v} (e2e)`, async (value) => {
    // Uzbek storefront (default language) shows the opening hours in the top bar
    const shop = await panel.context().browser()!.newPage();
    await shop.goto(`${WEB}/`);
    await expect(shop.getByRole('complementary').first()).toContainText(value);
    await shop.close();
  });
  // phone numbers are normalised to +998 and validated on the server
  await editAndRestore(store.getByRole('textbox', { name: 'Second phone (optional)' }), 'Store', () => '90 555 44 33');
});

test('social links, orders & stock, SEO and the home page blocks are saved', async () => {
  const social = await open('Social media');
  await editAndRestore(social.getByRole('textbox', { name: 'TikTok (optional)' }), 'Social media', () => 'https://www.tiktok.com/@verotools_e2e');

  const ops = await open('Orders & stock');
  await editAndRestore(ops.getByRole('textbox', { name: 'Low-stock threshold' }), 'Orders & stock', (v) => String(Number(v) + 1));

  const seo = await open('SEO');
  await editAndRestore(seo.getByRole('textbox', { name: 'Site title' }), 'SEO', (v) => `${v} · e2e`);

  const home = await open('Home page');
  await editAndRestore(home.getByRole('textbox', { name: 'Title' }).first(), 'Home page', (v) => `${v} (e2e)`);
});

test('installment plans are validated and saved', async () => {
  const inst = await open('Installments');
  await editAndRestore(inst.getByRole('textbox', { name: 'Markup, %' }).last(), 'Installments', (v) => String(Number(v) - 1));
  // a duplicate term is refused before anything is sent
  const terms = inst.getByRole('textbox', { name: 'Term (months)' });
  const first = await terms.first().inputValue();
  await terms.last().fill(first);
  await panel.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(inst.getByText(/already|duplicate|twice/i).first()).toBeVisible();
  await panel.getByRole('button', { name: 'Discard' }).click().catch(() => undefined);
});

test('payment methods and notification switches are saved', async () => {
  const pay = await open('Payment methods');
  const card = pay.getByRole('checkbox', { name: /^Card on delivery/ });
  await expect(card).toBeChecked();
  await card.uncheck();
  await save('Payment methods');
  // the storefront no longer offers it
  const methods = await panel.request.get(`${WEB}/api/payments/methods`);
  expect((await methods.json()).data.map((m: { code: string }) => m.code)).not.toContain('card_on_delivery');
  await card.check();
  await save('Payment methods');
  const again = await panel.request.get(`${WEB}/api/payments/methods`);
  expect((await again.json()).data.map((m: { code: string }) => m.code)).toContain('card_on_delivery');

  const notif = await open('Notifications');
  const toggle = notif.getByRole('switch').first();
  const was = await toggle.isChecked();
  await toggle.click();
  await save('Notifications');
  await expect(toggle).toBeChecked({ checked: !was });
  await toggle.click();
  await save('Notifications');
  await expect(toggle).toBeChecked({ checked: was });
});
