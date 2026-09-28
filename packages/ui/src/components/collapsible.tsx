import { Collapsible as CollapsiblePrimitive } from 'radix-ui';
import * as React from 'react';

import { cn } from '../lib/utils';

function Collapsible(props: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger(props: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
  return <CollapsiblePrimitive.CollapsibleTrigger data-slot="collapsible-trigger" {...props} />;
}

/** Animated content (height transition). Pass `animated={false}` to show / hide instantly. */
function CollapsibleContent({
  className,
  animated = true,
  ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent> & { animated?: boolean }) {
  return (
    <CollapsiblePrimitive.CollapsibleContent
      data-slot="collapsible-content"
      className={cn(
        animated &&
          'overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
        className,
      )}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
