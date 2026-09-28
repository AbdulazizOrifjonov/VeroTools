import { Tooltip as TooltipPrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

const TooltipProviderPresent = React.createContext(false);

/**
 * Wrap the app once (shared open delay + instant switching between neighbouring tooltips).
 * A <Tooltip> rendered outside a provider creates its own, so it also works standalone.
 */
function TooltipProvider({
  delayDuration = 250,
  skipDelayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipProviderPresent value={true}>
      <TooltipPrimitive.Provider
        data-slot="tooltip-provider"
        delayDuration={delayDuration}
        skipDelayDuration={skipDelayDuration}
        {...props}
      />
    </TooltipProviderPresent>
  );
}

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  const hasProvider = React.useContext(TooltipProviderPresent);
  const root = <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
  return hasProvider ? root : <TooltipProvider>{root}</TooltipProvider>;
}

function TooltipTrigger(props: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 6,
  collisionPadding = 8,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          'z-50 w-fit max-w-72 origin-(--radix-tooltip-content-transform-origin) rounded-md bg-graphite px-2.5 py-1.5 text-xs leading-snug font-medium text-balance text-graphite-foreground shadow-md',
          'dark:bg-foreground dark:text-background',
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
          className,
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow width={10} height={5} className="z-50 fill-graphite dark:fill-foreground" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
