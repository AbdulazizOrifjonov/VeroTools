import { API_HEADERS, type ClientApp, type Language } from '@vero/config';
import type { ApiErrorBody, AuthResult, PageMeta, Paginated, UserDTO } from '@vero/types';
import { hasPermission, type Permission } from '@vero/types';
import { toQueryString } from '@vero/utils';

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.details = details;
  }

  get isNetwork() {
    return this.code === 'NETWORK';
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError || (typeof e === 'object' && e !== null && (e as { name?: string }).name === 'ApiError');
}

/* ------------------------------------------------------------------ */
/* Storage adapters                                                    */
/* ------------------------------------------------------------------ */

export interface TokenStorage {
  /** refresh token persistence (native apps only; web/admin use an httpOnly cookie) */
  getRefreshToken?: () => Promise<string | null> | string | null;
  setRefreshToken?: (token: string | null) => Promise<void> | void;
}

export interface ApiClientConfig {
  /** e.g. "/api" (same origin) or "https://api.ockean.uz/api" */
  baseUrl: string;
  client: ClientApp;
  getLanguage: () => Language;
  /** anonymous visitor id used for guest cart / wishlist / compare */
  getGuestId?: () => string | null | Promise<string | null>;
  tokens?: TokenStorage;
  fetch?: typeof fetch;
  /** "include" for browser apps so the refresh cookie is sent */
  credentials?: RequestCredentials;
  /** called once when the session can no longer be refreshed */
  onSessionExpired?: () => void;
  timeoutMs?: number;
  /** unique id of this app instance; the API echoes it in realtime events so the sender can ignore them */
  instanceId?: string;
}

export interface RequestOptions {
  query?: Record<string, unknown>;
  body?: unknown;
  formData?: FormData;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** skip the automatic refresh-and-retry on 401 */
  noRetry?: boolean;
}

/* ------------------------------------------------------------------ */
/* Session store (framework agnostic; React binds via useSyncExternalStore) */
/* ------------------------------------------------------------------ */

export type SessionStatus = 'unknown' | 'authenticated' | 'guest';

export interface SessionState {
  status: SessionStatus;
  user: UserDTO | null;
}

type Listener = () => void;

class SessionStore {
  private state: SessionState = { status: 'unknown', user: null };
  private listeners = new Set<Listener>();

  get = (): SessionState => this.state;

  set(next: Partial<SessionState>) {
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => l());
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

/* ------------------------------------------------------------------ */
/* Client                                                              */
/* ------------------------------------------------------------------ */

export class ApiClient {
  readonly config: ApiClientConfig;
  readonly session = new SessionStore();
  private accessToken: string | null = null;
  private refreshing: Promise<boolean> | null = null;
  private readonly tokenListeners = new Set<(token: string | null) => void>();

  constructor(config: ApiClientConfig) {
    this.config = { timeoutMs: 30_000, ...config };
  }

  /* ---------- tokens ---------- */

  getAccessToken(): string | null {
    return this.accessToken;
  }

  /** Subscribe to access-token changes (used by the realtime connection). */
  onTokenChange(listener: (token: string | null) => void): () => void {
    this.tokenListeners.add(listener);
    return () => this.tokenListeners.delete(listener);
  }

  private setAccessToken(token: string | null) {
    if (this.accessToken === token) return;
    this.accessToken = token;
    this.tokenListeners.forEach((l) => l(token));
  }

  /** Stores the result of login/register/refresh. */
  async applyAuth(result: AuthResult): Promise<void> {
    this.setAccessToken(result.accessToken);
    if (result.refreshToken && this.config.tokens?.setRefreshToken) {
      await this.config.tokens.setRefreshToken(result.refreshToken);
    }
    this.session.set({ status: 'authenticated', user: result.user });
  }

  /** Clears local credentials (server logout is done separately). */
  async clearAuth(): Promise<void> {
    this.setAccessToken(null);
    if (this.config.tokens?.setRefreshToken) await this.config.tokens.setRefreshToken(null);
    this.session.set({ status: 'guest', user: null });
  }

  setUser(user: UserDTO | null) {
    this.session.set(user ? { status: 'authenticated', user } : { status: 'guest', user: null });
  }

  hasPermission(permission: Permission | Permission[], mode: 'all' | 'any' = 'all'): boolean {
    return hasPermission(this.session.get().user?.permissions, permission, mode);
  }

  /**
   * Refreshes the access token (single flight). Web/admin rely on the httpOnly cookie,
   * native apps send the stored refresh token. Returns false when there is no valid session.
   */
  refresh(): Promise<boolean> {
    if (this.refreshing) return this.refreshing;
    this.refreshing = (async () => {
      try {
        const stored = this.config.tokens?.getRefreshToken ? await this.config.tokens.getRefreshToken() : null;
        if (this.config.client === 'mobile' && !stored) return false;
        const result = await this.rawRequest<{ data: AuthResult } | undefined>('POST', '/auth/refresh', {
          body: stored ? { refreshToken: stored } : {},
          noRetry: true,
        });
        // 204 → there is no session at all (guest visitor)
        if (!result?.data) {
          await this.clearAuth();
          return false;
        }
        await this.applyAuth(result.data);
        return true;
      } catch (e) {
        if (isApiError(e) && e.isNetwork) throw e;
        const hadSession = this.session.get().status === 'authenticated';
        await this.clearAuth();
        if (hadSession) this.config.onSessionExpired?.();
        return false;
      } finally {
        this.refreshing = null;
      }
    })();
    return this.refreshing;
  }

  /** Restores a session on app start. Never throws (network errors leave status "unknown"→"guest"). */
  async bootstrap(): Promise<SessionState> {
    try {
      const ok = await this.refresh();
      if (!ok) this.session.set({ status: 'guest', user: null });
    } catch {
      this.session.set({ status: 'guest', user: null });
    }
    return this.session.get();
  }

  /* ---------- requests ---------- */

  private async buildHeaders(opts: RequestOptions): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      [API_HEADERS.client]: this.config.client,
      [API_HEADERS.language]: this.config.getLanguage(),
      ...(this.config.instanceId ? { 'X-Client-Instance': this.config.instanceId } : {}),
      ...opts.headers,
    };
    if (opts.body !== undefined && !opts.formData) headers['Content-Type'] = 'application/json';
    if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    const guestId = this.config.getGuestId ? await this.config.getGuestId() : null;
    if (guestId) headers[API_HEADERS.guestId] = guestId;
    return headers;
  }

  private url(path: string, query?: Record<string, unknown>): string {
    const base = this.config.baseUrl.replace(/\/+$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}${toQueryString(query)}`;
  }

  private async rawRequest<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const doFetch = this.config.fetch ?? fetch;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const onAbort = () => controller.abort();
    opts.signal?.addEventListener('abort', onAbort);
    let res: Response;
    try {
      res = await doFetch(this.url(path, opts.query), {
        method,
        headers: await this.buildHeaders(opts),
        body: opts.formData ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
        credentials: this.config.credentials,
        signal: controller.signal,
      });
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      throw new ApiError(0, 'NETWORK', e instanceof Error ? e.message : 'Network error');
    } finally {
      clearTimeout(timeout);
      opts.signal?.removeEventListener('abort', onAbort);
    }

    if (res.status === 204) return undefined as T;
    const contentType = res.headers.get('content-type') ?? '';
    const payload: unknown = contentType.includes('application/json') ? await res.json().catch(() => null) : null;
    if (!res.ok) {
      const err = (payload as ApiErrorBody | null)?.error;
      throw new ApiError(
        res.status,
        err?.code ?? (res.status === 404 ? 'NOT_FOUND' : res.status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
        err?.message ?? res.statusText,
        err?.fields,
        err?.details,
      );
    }
    return payload as T;
  }

  /** Performs a request with transparent access-token refresh on 401 TOKEN_EXPIRED. */
  async send<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    try {
      return await this.rawRequest<T>(method, path, opts);
    } catch (e) {
      if (
        !opts.noRetry &&
        isApiError(e) &&
        e.status === 401 &&
        (e.code === 'TOKEN_EXPIRED' || e.code === 'TOKEN_INVALID' || e.code === 'UNAUTHORIZED') &&
        (this.accessToken || this.config.client !== 'mobile')
      ) {
        const hadToken = !!this.accessToken;
        const ok = await this.refresh();
        if (ok && (hadToken || e.code !== 'UNAUTHORIZED')) return this.rawRequest<T>(method, path, { ...opts, noRetry: true });
      }
      throw e;
    }
  }

  /** Unwraps `{ data }`. */
  async request<T>(method: string, path: string, opts?: RequestOptions): Promise<T> {
    const res = await this.send<{ data: T } | undefined>(method, path, opts);
    return (res as { data: T } | undefined)?.data as T;
  }

  /** Unwraps list responses `{ data: T[], meta }` into `{ items, meta }`. */
  async requestPage<T>(path: string, query?: Record<string, unknown>, signal?: AbortSignal): Promise<Paginated<T>> {
    const res = await this.send<{ data: T[]; meta: PageMeta }>('GET', path, { query, signal });
    return { items: res.data, meta: res.meta };
  }

  get<T>(path: string, query?: Record<string, unknown>, signal?: AbortSignal) {
    return this.request<T>('GET', path, { query, signal });
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, { body: body ?? {} });
  }
  put<T>(path: string, body?: unknown) {
    return this.request<T>('PUT', path, { body: body ?? {} });
  }
  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, { body: body ?? {} });
  }
  delete<T = void>(path: string, body?: unknown) {
    return this.request<T>('DELETE', path, body === undefined ? {} : { body });
  }
  upload<T>(path: string, formData: FormData) {
    return this.request<T>('POST', path, { formData });
  }

  /** Binary download (reports export). Returns the blob and the server-provided file name. */
  async download(path: string, query?: Record<string, unknown>): Promise<{ blob: Blob; filename: string }> {
    const doFetch = this.config.fetch ?? fetch;
    const attempt = async () =>
      doFetch(this.url(path, query), { headers: await this.buildHeaders({}), credentials: this.config.credentials });
    let res = await attempt();
    if (res.status === 401 && (await this.refresh())) res = await attempt();
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new ApiError(res.status, body?.error?.code ?? 'BAD_REQUEST', body?.error?.message ?? res.statusText);
    }
    const disposition = res.headers.get('content-disposition') ?? '';
    const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
    const filename = decodeURIComponent(match?.[1] ?? match?.[2] ?? 'report');
    return { blob: await res.blob(), filename };
  }

  /** Absolute URL for API-served assets (uploads) when the base URL is absolute. */
  assetUrl(url: string | undefined | null): string | undefined {
    if (!url) return undefined;
    if (/^https?:\/\//i.test(url) || url.startsWith('data:')) return url;
    const base = this.config.baseUrl;
    if (/^https?:\/\//i.test(base)) {
      const origin = base.replace(/\/api\/?$/, '').replace(/\/+$/, '');
      return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
    }
    return url;
  }
}
