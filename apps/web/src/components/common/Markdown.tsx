import { cn } from '@vero/ui';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LocaleLink } from '../../hooks/use-lang';
import { isInternalHref } from '../../lib/paths';

const components: Components = {
  a({ href, children, node: _node, ...props }) {
    if (href && isInternalHref(href)) {
      return <LocaleLink to={href}>{children}</LocaleLink>;
    }
    const external = !!href && /^https?:\/\//i.test(href);
    return (
      <a href={href} {...props} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {children}
      </a>
    );
  },
  img({ src, alt, node: _node, ...props }) {
    return <img src={typeof src === 'string' ? src : undefined} alt={alt ?? ''} loading="lazy" decoding="async" {...props} />;
  },
  // headings inside content never compete with the page <h1>
  h1: ({ node: _node, ...props }) => <h2 {...props} />,
};

/**
 * Markdown from the admin panel (product descriptions, content pages). Raw HTML is not rendered and
 * URLs are sanitised by react-markdown; internal links keep the language prefix.
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
