import { useSession } from '@vero/api-client';
import type { Permission } from '@vero/types';
import { Navigate, Outlet, useLocation, useMatches } from 'react-router';
import ForbiddenPage from '../features/errors/ForbiddenPage';
import { NAV_GROUPS } from './nav';
import type { RouteHandle } from './router';

/** First page of the sidebar the user may open (start page for roles without dashboard access). */
export function useFirstAllowedPath(): string | null {
  const { can } = useSession();
  for (const group of NAV_GROUPS) {
    for (const item of group.items) if (can(item.permission)) return item.path;
  }
  return null;
}

/**
 * Checks the permission declared on the matched route (`handle.permission`) — the API enforces the same
 * permissions, this only avoids showing screens that would fail. Renders a proper "no access" page.
 */
export function PermissionGate() {
  const { can } = useSession();
  const matches = useMatches();
  const location = useLocation();
  const first = useFirstAllowedPath();
  const handle = [...matches].reverse().find((m) => (m.handle as RouteHandle | undefined)?.permission)?.handle as RouteHandle | undefined;
  const required = handle?.permission;

  if (required && !can(required as Permission | Permission[], handle?.mode ?? 'all')) {
    // start page without dashboard access → the first section the role can open
    if (location.pathname === '/' && first && first !== '/') return <Navigate to={first} replace />;
    return <ForbiddenPage permission={Array.isArray(required) ? required.join(', ') : required} noSections={location.pathname === '/' && !first} />;
  }
  return <Outlet />;
}
