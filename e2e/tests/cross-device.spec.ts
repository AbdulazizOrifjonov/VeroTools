import { devices, expect, test, type Browser, type Page } from '@playwright/test';

/*
 * One customer, one account, three clients: the storefront, the admin panel and the mobile app (web build).
 *
 *   register on the website → search + filter the catalogue → wishlist + cart → 5-step checkout (cash)
 *   → the admin finds the order and confirms it → the website shows the new status without a reload
 *   → the same account in the mobile app sees the order, its status and the wishlist.
 *
 * Everything goes through the real UI and the real API — nothing is mocked. The test creates a real customer
 * and a real order, so run it against a development / staging database only.
 */

const WEB = (process.env.E2E_WEB_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
const ADMIN = (process.env.E2E_ADMIN_URL ?? 'http://localhost:3001').replace(/\/+$/, '');
const MOBILE = process.env.E2E_MOBILE_URL?.replace(/\/+$/, '');
const STAFF = { login: process.env.E2E_ADMIN_LOGIN ?? 'admin@verotools.uz', password: process.env.E2E_ADMIN_PASSWORD ?? 'VeroAdmin2026' };

// a fresh, valid Uzbek mobile number for every run (+998 99 xxx xx xx)
const localPhone = `99${String(Date.now()).slice(-7)}`;
const customer = { firstName: 'Dilnoza', lastName: 'Rahimova', phone: localPhone, password: 'E2eSecret2026' };

async function newPage(browser: Browser, opts: Parameters<Browser['newContext']>[0] = {}, storage: Record<string, string> = {}): Promise<Page> {
  const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Asia/Tashkent', ...opts });
  await context.addInitScript((entries) => {
    for (const [k, v] of Object.entries(entries)) window.localStorage.setItem(k, v);
  }, storage);
  return context.newPage();
}

test('an order placed on the website is confirmed in the admin panel and seen on every device', async ({ browser }) => {
  const shop = await newPage(browser);
  let orderNumber = '';
  let orderUrl = '';
  let productName = '';
  let wishName = '';

  await test.step('customer registers on the website', async () => {
    await shop.goto(`${WEB}/en/register`);
    await shop.getByLabel('First name').fill(customer.firstName);
    await shop.getByLabel('Last name').fill(customer.lastName);
    await shop.getByLabel('Phone number').fill(customer.phone);
    await shop.getByRole('textbox', { name: 'Password', exact: true }).fill(customer.password);
    await shop.getByRole('textbox', { name: 'Repeat password' }).fill(customer.password);
    await shop.getByRole('checkbox', { name: /I accept/ }).check();
    await shop.getByRole('button', { name: 'Sign up' }).click();
    await expect(shop).toHaveURL(/\/en\/account$/);
    await expect(shop.getByRole('heading', { level: 1 })).toHaveText(`Hello, ${customer.firstName}!`);
  });

  await test.step('search and filter the catalogue', async () => {
    await shop.getByRole('combobox', { name: 'Search' }).fill('drill');
    await shop.keyboard.press('Enter');
    await expect(shop).toHaveURL(/\/en\/search\?q=drill/);
    await expect(shop.getByRole('heading', { level: 1 })).toHaveText('Results for “drill”');
    await expect(shop.getByRole('article').first()).toBeVisible();
    const all = await shop.getByRole('article').count();
    expect(all).toBeGreaterThan(1);
    // brand facet → URL state, fewer results, every card from that brand
    await shop.getByRole('checkbox', { name: /^Volkstark \d+$/ }).check();
    await expect(shop).toHaveURL(/brand=volkstark/);
    await expect.poll(async () => shop.getByRole('article').count()).toBeLessThan(all);
    for (const card of await shop.getByRole('article').all()) await expect(card).toContainText('Volkstark');
  });

  await test.step('add to wishlist and cart', async () => {
    const buyable = shop.getByRole('article').filter({ has: shop.getByRole('button', { name: /^Add to cart:/ }) }).first();
    productName = (await buyable.getByRole('heading', { level: 3 }).innerText()).trim();
    await buyable.getByRole('button', { name: `Add to cart: ${productName}` }).click();
    await expect(shop.getByRole('link', { name: '1 item in cart' })).toBeVisible();

    const wish = shop.getByRole('article').filter({ hasNot: shop.getByText(productName, { exact: true }) }).first();
    wishName = (await wish.getByRole('heading', { level: 3 }).innerText()).trim();
    await wish.getByRole('button', { name: `Add to wishlist: ${wishName}` }).click();
    await expect(wish.getByRole('button', { name: `Remove from wishlist: ${wishName}` })).toBeVisible();

    await shop.goto(`${WEB}/en/cart`);
    await expect(shop.getByRole('heading', { name: 'Shopping cart', level: 1 })).toBeVisible();
    await expect(shop.getByRole('link', { name: productName })).toBeVisible();
  });

  await test.step('check out in 5 steps: courier to Tashkent, cash on delivery', async () => {
    await shop.getByRole('link', { name: 'Checkout' }).click();
    await expect(shop.getByRole('navigation', { name: 'Step 1 of 5' })).toBeVisible();
    await expect(shop.getByRole('textbox', { name: 'First name' })).toHaveValue(customer.firstName);
    await shop.getByRole('button', { name: 'Continue' }).click();

    await expect(shop.getByRole('navigation', { name: 'Step 2 of 5' })).toBeVisible();
    await shop.getByRole('radio', { name: /^Courier delivery/ }).check();
    await shop.getByRole('combobox', { name: 'Region' }).selectOption({ label: 'Tashkent city' });
    await shop.getByRole('combobox', { name: 'City / district' }).selectOption({ label: 'Yunusabad district' });
    await shop.getByRole('textbox', { name: 'Street' }).fill("Amir Temur shoh ko'chasi");
    await shop.getByRole('textbox', { name: 'House' }).fill('108');
    // the delivery fee of the zone is quoted by the API
    await expect(shop.getByRole('complementary', { name: 'Order summary' })).toContainText(/Delivery\s*(Free|[\d\s]+UZS)/);
    await shop.getByRole('button', { name: 'Continue' }).click();

    await expect(shop.getByRole('navigation', { name: 'Step 3 of 5' })).toBeVisible();
    await shop.getByRole('radio', { name: /^Cash/ }).check();
    await shop.getByRole('button', { name: 'Continue' }).click();

    await expect(shop.getByRole('navigation', { name: 'Step 4 of 5' })).toBeVisible();
    await expect(shop.getByText('Tashkent city, Yunusabad district')).toBeVisible();
    await shop.getByRole('checkbox', { name: /I accept/ }).check();
    await shop.getByRole('button', { name: /^Place order/ }).click();

    await expect(shop).toHaveURL(/\/en\/checkout\/success\//);
    await expect(shop.getByRole('heading', { level: 1 })).toHaveText('Your order has been placed!');
    orderNumber = (await shop.getByText(/Order number: VT-\d{6}-\d+/).innerText()).match(/VT-\d{6}-\d+/)![0];
    await shop.getByRole('link', { name: 'Track order' }).click();
    await expect(shop.getByRole('heading', { name: `Order #${orderNumber}`, level: 1 })).toBeVisible();
    await expect(orderHeader(shop, orderNumber)).toContainText('Awaiting confirmation');
    orderUrl = shop.url();
  });

  await test.step('the admin panel confirms the order', async () => {
    const panel = await newPage(browser, {}, { 'vt.admin.language': 'en' });
    await panel.goto(`${ADMIN}/login`);
    await panel.getByRole('textbox', { name: 'Email or phone' }).fill(STAFF.login);
    await panel.getByRole('textbox', { name: 'Password', exact: true }).fill(STAFF.password);
    await panel.getByRole('button', { name: 'Sign in' }).click();
    await expect(panel).toHaveURL(`${ADMIN}/`);

    await panel.goto(`${ADMIN}/orders?q=${orderNumber}`);
    const row = panel.getByRole('row').filter({ hasText: orderNumber });
    await expect(row).toContainText(`${customer.firstName} ${customer.lastName}`);
    await expect(row).toContainText('Awaiting confirmation');
    await row.getByRole('link', { name: orderNumber, exact: true }).click();

    await expect(panel.getByRole('heading', { name: new RegExp(`Order #${orderNumber}`), level: 1 })).toBeVisible();
    await expect(panel.getByRole('table')).toContainText(productName);
    await panel.getByRole('button', { name: 'Confirmed', exact: true }).click();
    const dialog = panel.getByRole('dialog', { name: 'Move to “Confirmed”' });
    await dialog.getByRole('textbox').fill('Confirmed by phone (e2e)');
    await dialog.getByRole('button', { name: 'Move to “Confirmed”' }).click();
    await expect(dialog).toBeHidden();
    // the status history keeps the staff note
    await expect(panel.getByText('Confirmed by phone (e2e)')).toBeVisible();
    await panel.context().close();
  });

  await test.step('the website shows the new status in real time (no reload)', async () => {
    expect(shop.url()).toBe(orderUrl);
    await expect(orderHeader(shop, orderNumber)).toContainText('Confirmed', { timeout: 20_000 });
    await expect(shop.getByRole('button', { name: 'Cancel order' })).toBeVisible();
  });

  await test.step('the same account in the mobile app sees the order and the wishlist', async () => {
    test.skip(!MOBILE, 'E2E_MOBILE_URL is not set — mobile (web build) checks skipped');
    const phone = await newPage(browser, { ...devices['Pixel 7'] }, { 'vt.language': 'en' });
    await phone.goto(`${MOBILE}/login`);
    await phone.getByRole('textbox', { name: 'Phone or email' }).fill(`+998${customer.phone}`);
    await phone.getByRole('textbox', { name: 'Password' }).fill(customer.password);
    await phone.getByRole('button', { name: 'Sign in' }).click();
    await expect(phone.getByRole('textbox', { name: 'Phone or email' })).toBeHidden();

    await phone.goto(`${MOBILE}/account/orders`);
    await expect(phone.getByText(orderNumber).first()).toBeVisible();
    await expect(phone.getByText('Confirmed').first()).toBeVisible();

    await phone.goto(`${MOBILE}/wishlist`);
    await expect(phone.getByText(wishName).first()).toBeVisible();
    await phone.context().close();
  });
});

/** Order heading + its status badge on the storefront order page. */
function orderHeader(page: Page, number: string) {
  return page.getByRole('heading', { name: `Order #${number}`, level: 1 }).locator('xpath=..');
}
