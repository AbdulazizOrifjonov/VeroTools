import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { User } from '../src/models/user.model';
import { RefreshToken } from '../src/models/token.model';
import { api, auth, login, OWNER, registerCustomer, setupDatabase, teardownDatabase, uniquePhone } from './helpers';

beforeAll(async () => {
  await setupDatabase('auth');
});
afterAll(teardownDatabase);

describe('registration', () => {
  it('validates input and returns field errors as i18n keys', async () => {
    const res = await api().post('/api/auth/register').send({ firstName: 'A', phone: '123', password: 'short', acceptTerms: false });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toMatchObject({
      firstName: expect.stringMatching(/^validation\./),
      phone: 'validation.phone',
      password: 'validation.password',
      acceptTerms: 'validation.acceptTerms',
    });
  });

  it('creates a customer, normalises the phone and never stores the plain password', async () => {
    const phone = uniquePhone();
    const local = phone.slice(4); // "90xxxxxxx" — spaces / missing country code are normalised to +998…
    const ok = await api()
      .post('/api/auth/register')
      .send({ firstName: 'Aziz', lastName: 'Karimov', phone: `${local.slice(0, 2)} ${local.slice(2, 5)}-${local.slice(5, 7)}-${local.slice(7)}`, email: 'Aziz@Example.com', password: 'Secret123', acceptTerms: true });
    expect(ok.status).toBe(201);
    expect(ok.body.data.user).toMatchObject({ phone, role: 'CUSTOMER', isStaff: false, email: 'aziz@example.com' });
    expect(ok.body.data.accessToken).toEqual(expect.any(String));
    // web client: refresh token only as an httpOnly cookie
    expect(ok.body.data.refreshToken).toBeUndefined();
    const cookie = String(ok.headers['set-cookie'] ?? '');
    expect(cookie).toMatch(/vt_rt=/);
    expect(cookie).toMatch(/HttpOnly/i);

    const stored = await User.findOne({ phone }).select('+passwordHash').lean();
    expect(stored?.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(stored?.passwordHash).not.toContain('Secret123');
  });

  it('rejects a duplicate phone number', async () => {
    const s = await registerCustomer();
    const res = await api().post('/api/auth/register').send({ firstName: 'Dup', lastName: 'User', phone: s.phone, password: 'Secret123', acceptTerms: true });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PHONE_TAKEN');
  });
});

describe('login & session', () => {
  it('rejects wrong credentials without revealing which part was wrong', async () => {
    const s = await registerCustomer();
    const wrongPassword = await api().post('/api/auth/login').send({ login: s.phone, password: 'Wrong1234' });
    const unknownUser = await api().post('/api/auth/login').send({ login: '+998999999999', password: 'Wrong1234' });
    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknownUser.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('logs in by phone in any common format and returns the profile', async () => {
    const s = await registerCustomer();
    const local = s.phone.replace('+998', '');
    const token = await login(`${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 7)} ${local.slice(7)}`, 'Secret123', 'web');
    const me = await api().get('/api/auth/me').set(auth(token));
    expect(me.status).toBe(200);
    expect(me.body.data.id).toBe(s.userId);
  });

  it('requires authentication for private endpoints', async () => {
    expect((await api().get('/api/auth/me')).status).toBe(401);
    expect((await api().get('/api/orders')).status).toBe(401);
    const bad = await api().get('/api/auth/me').set('Authorization', 'Bearer not-a-token');
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('TOKEN_INVALID');
  });

  it('rotates refresh tokens and revokes the whole family when an old token is reused', async () => {
    const s = await registerCustomer();
    const first = await api().post('/api/auth/refresh').set('X-Client', 'mobile').send({ refreshToken: s.refreshToken });
    expect(first.status).toBe(200);
    const rotated = first.body.data.refreshToken as string;
    expect(rotated).toBeTruthy();
    expect(rotated).not.toBe(s.refreshToken);

    // replaying the already-used token is treated as theft
    const replay = await api().post('/api/auth/refresh').set('X-Client', 'mobile').send({ refreshToken: s.refreshToken });
    expect(replay.status).toBe(401);
    const afterTheft = await api().post('/api/auth/refresh').set('X-Client', 'mobile').send({ refreshToken: rotated });
    expect(afterTheft.status).toBe(401);
    const active = await RefreshToken.countDocuments({ user: s.userId, revokedAt: null });
    expect(active).toBe(0);
  });

  it('logout revokes the refresh token', async () => {
    const s = await registerCustomer();
    expect((await api().post('/api/auth/logout').set('X-Client', 'mobile').send({ refreshToken: s.refreshToken })).status).toBe(204);
    const res = await api().post('/api/auth/refresh').set('X-Client', 'mobile').send({ refreshToken: s.refreshToken });
    expect(res.status).toBe(401);
  });

  it('password change invalidates existing access tokens (token version)', async () => {
    const s = await registerCustomer();
    const wrong = await api().post('/api/users/me/password').set(auth(s.token)).send({ currentPassword: 'Nope1234', newPassword: 'NewSecret456', newPasswordConfirm: 'NewSecret456' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('INVALID_PASSWORD');
    const change = await api().post('/api/users/me/password').set(auth(s.token)).send({ currentPassword: 'Secret123', newPassword: 'NewSecret456', newPasswordConfirm: 'NewSecret456' });
    expect(change.status).toBe(204);
    const me = await api().get('/api/auth/me').set(auth(s.token));
    expect(me.status).toBe(401);
    expect(await login(s.phone, 'NewSecret456', 'mobile')).toEqual(expect.any(String));
  });
});

describe('admin sign-in', () => {
  it('only staff can sign in to the admin panel', async () => {
    const s = await registerCustomer();
    const res = await api().post('/api/auth/login').set('X-Client', 'admin').send({ login: s.phone, password: 'Secret123' });
    expect(res.status).toBe(403);
    const owner = await api().post('/api/auth/login').set('X-Client', 'admin').send(OWNER);
    expect(owner.status).toBe(200);
    expect(owner.body.data.user).toMatchObject({ role: 'SUPER_ADMIN', isStaff: true });
    expect(String(owner.headers['set-cookie'] ?? '')).toMatch(/vt_art=/);
  });

  it('blocks customers from every admin endpoint', async () => {
    const s = await registerCustomer();
    for (const path of ['/api/admin/dashboard', '/api/admin/orders', '/api/admin/expenses', '/api/admin/users']) {
      const res = await api().get(path).set(auth(s.token));
      expect(res.status, path).toBe(403);
    }
  });
});
