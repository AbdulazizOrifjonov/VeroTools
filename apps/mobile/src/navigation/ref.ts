import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type Target = { name: keyof RootStackParamList; params?: object };

const queue: Target[] = [];

/** Navigates from outside React components (toasts, push notifications). Queued until the container is ready. */
export function rootNavigate(target: Target): void {
  if (!navigationRef.isReady()) {
    queue.push(target);
    return;
  }
  go(target);
}

/**
 * React Navigation 7: `navigate` no longer goes back to an existing screen — to the tabs we pop,
 * a product opened on top of another product gets its own screen.
 */
function go(target: Target): void {
  if (target.name === 'Tabs') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigationRef.navigate as any)(target.name, target.params, { pop: true });
    return;
  }
  if (target.name === 'Product') {
    navigationRef.dispatch(StackActions.push(target.name, target.params));
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (navigationRef.navigate as any)(target.name, target.params);
}

export function rootPush(target: Target): void {
  if (!navigationRef.isReady()) {
    queue.push(target);
    return;
  }
  navigationRef.dispatch(StackActions.push(target.name, target.params));
}

export function flushNavigationQueue(): void {
  while (queue.length && navigationRef.isReady()) {
    go(queue.shift()!);
  }
}
