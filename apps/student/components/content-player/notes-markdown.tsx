import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Renders admin-authored notes as Markdown (GitHub flavour: tables, task lists, strikethrough).
// Server component, so no Markdown code ships to the browser. Raw HTML in the notes is NOT rendered
// (react-markdown escapes it unless rehype-raw is added), and only http(s)/mailto links are kept.
// Standard Markdown line handling: a single line break inside a paragraph is a space, a blank line starts
// a new paragraph (no production notes predated this renderer as of 2026-11-26).

const safeHref = (href: string | undefined) => (href && /^(https?:|mailto:|#|\/)/i.test(href) ? href : undefined);

const components: Components = {
  // The page header already shows the title, so the notes' own top heading drops a level.
  h1: ({ children }) => <h2 className="mt-8 text-xl font-semibold tracking-tight text-foreground first:mt-0">{children}</h2>,
  h2: ({ children }) => <h3 className="mt-8 border-b border-border pb-1.5 text-lg font-semibold text-foreground first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-6 text-base font-semibold text-foreground">{children}</h4>,
  h4: ({ children }) => <h5 className="mt-5 text-[15px] font-semibold text-foreground">{children}</h5>,
  p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
  a: ({ href, children }) => {
    const safe = safeHref(href);
    if (!safe) return <span>{children}</span>;
    const external = /^https?:/i.test(safe);
    return (
      <a
        href={safe}
        className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  },
  ul: ({ children, className }) => (
    <ul className={`my-3 space-y-1.5 pl-6 ${className?.includes('contains-task-list') ? 'list-none pl-1' : 'list-disc'}`}>{children}</ul>
  ),
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-6">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed marker:text-muted-foreground">{children}</li>,
  input: ({ checked }) => (
    <input type="checkbox" checked={!!checked} readOnly disabled className="mr-2 h-3.5 w-3.5 translate-y-[1px] accent-primary" />
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-r-md border-l-4 border-primary/60 bg-muted/50 px-4 py-1 text-foreground/90">{children}</blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  th: ({ children }) => <th className="border-b border-border px-3 py-2 font-semibold text-foreground">{children}</th>,
  td: ({ children }) => <td className="border-b border-border px-3 py-2 align-top last:border-b-0">{children}</td>,
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-md border border-border bg-muted/60 p-4 font-mono text-[13px] leading-relaxed">{children}</pre>
  ),
  code: ({ className, children }) =>
    // Fenced blocks carry a language-* class (or contain a newline); inline code gets the pill style.
    className || String(children).includes('\n') ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">{children}</code>
    ),
  img: () => null
};

export function NotesMarkdown({ source }: { source: string }) {
  return (
    <div className="text-[15px] text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
