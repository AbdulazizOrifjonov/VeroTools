import { cn } from '@vero/ui';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { assetUrl } from '../../lib/images';

const components: Components = {
  a({ href, children, node: _node, ...props }) {
    const external = !!href && /^https?:\/\//i.test(href);
    return (
      <a href={href} {...props} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  },
  img({ src, alt, node: _node, ...props }) {
    return <img src={typeof src === 'string' ? assetUrl(src) : undefined} alt={alt ?? ''} loading="lazy" decoding="async" {...props} />;
  },
  h1: ({ node: _node, ...props }) => <h2 {...props} />,
};

/**
 * Markdown preview — the same renderer and options as the storefront (GFM tables, no raw HTML),
 * so what staff see here is what customers get.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose-vt', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
