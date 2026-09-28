import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import type { Language } from '@vero/config';
import { hasPermission, STAFF_ROLE_KEYS, type Permission } from '@vero/types';
import { ApiClient, type ApiClientConfig, type SessionState } from '../client';
import { createEndpoints, type Endpoints } from '../endpoints';
import { uuid } from '@vero/utils';

export type VeroApi = Endpoints & { client: ApiClient; instanceId: string };

/** Creates the API client + typed endpoints. Create ONE instance per app (module scope). */
export function createVeroApi(config: ApiClientConfig): VeroApi {
  const instanceId = config.instanceId ?? uuid();
  const client = new ApiClient({ ...config, instanceId });
  return { client, instanceId, ...createEndpoints(client) };
}

interface ApiContextValue {
  api: VeroApi;
  language: Language;
}

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({ api, language, children }: { api: VeroApi; language: Language; children: ReactNode }) {
  const value = useMemo(() => ({ api, language }), [api, language]);
  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

function useCtx(): ApiContextValue {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('ApiProvider is missing');
  return ctx;
}

export function useApi(): VeroApi {
  return useCtx().api;
}

/** Current content language (part of every localised query key). */
export function useApiLanguage(): Language {
  return useCtx().language;
}

export interface SessionInfo extends SessionState {
  isAuthenticated: boolean;
  isStaff: boolean;
  isReady: boolean;
  can: (permission: Permission | Permission[], mode?: 'all' | 'any') => boolean;
}

/** Reactive session state backed by the ApiClient session store. */
export function useSession(): SessionInfo {
  const api = useApi();
  const state = useSyncExternalStore(api.client.session.subscribe, api.client.session.get, api.client.session.get);
  return useMemo(
    () => ({
      ...state,
      isReady: state.status !== 'unknown',
      isAuthenticated: state.status === 'authenticated' && !!state.user,
      isStaff: !!state.user && (state.user.isStaff || (STAFF_ROLE_KEYS as readonly string[]).includes(state.user.role)),
      can: (permission: Permission | Permission[], mode: 'all' | 'any' = 'all') =>
        hasPermission(state.user?.permissions, permission, mode),
    }),
    [state],
  );
}
