import * as React from 'react';

import { cn } from '../lib/utils';
import { fieldBaseClasses } from './input';

export interface TextareaProps extends React.ComponentProps<'textarea'> {
  /** Grow with the content (CSS `field-sizing: content`, falls back to `rows` where unsupported). */
  autoResize?: boolean;
}

function Textarea({ className, autoResize = true, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(
        fieldBaseClasses,
        'flex min-h-24 px-3 py-2.5 leading-relaxed',
        autoResize ? 'field-sizing-content resize-none' : 'resize-y',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
