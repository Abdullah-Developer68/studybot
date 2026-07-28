import {
  isValidElement,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import { Check, Copy, WrapText } from "lucide-react";
import type { PreRendererProps } from "@studybot/types";
import {
  getShikiHighlighter,
  getShikiVersion,
  isShikiLanguageReady,
  loadShikiLanguage,
  SHIKI_THEME,
  SHIKI_THEME_BG,
  subscribeShiki,
} from "@/lib/shiki";

// Recursively flattens the children of the inner <code> element into plain
// text — react-markdown passes the code source as (possibly nested) children.
function extractText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (isValidElement(node)) {
    return extractText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

// Custom `pre` renderer for ReactMarkdown. Renders a fenced code block as a
// borderless container with a slim toolbar on top (language label, copy
// button, text-wrap toggle) and the Shiki-highlighted code below it. Until
// the highlighter (or the block's grammar) finishes its async load it shows
// a plain fallback, then re-renders itself with colors once ready.
const ShikiPre = ({ node: _node, children, ...props }: PreRendererProps) => {
  // react-markdown nests block code as <pre><code className="language-x">…
  // </code></pre>, so pull the language and raw source out of that element.
  const codeElement = isValidElement(children)
    ? (children as ReactElement<{ className?: string; children?: ReactNode }>)
    : null;
  const langMatch = /language-(\w+)/.exec(codeElement?.props?.className ?? "");
  const lang = langMatch?.[1]?.toLowerCase() ?? "";
  // Strip the single trailing newline markdown parsers append to code blocks.
  const code = extractText(codeElement?.props?.children).replace(/\n$/, "");

  // Subscribe this block to the shared Shiki store so it re-renders itself
  // when the highlighter or its grammar finishes loading. This must go
  // through useSyncExternalStore — under React Compiler the parent markdown
  // tree is memoized and would never re-render this block otherwise.
  useSyncExternalStore(subscribeShiki, getShikiVersion, getShikiVersion);

  // Every block lazy-loads its own grammar on mount; loads are deduped and
  // shared inside lib/shiki, so dozens of blocks in one language cost one fetch.
  useEffect(() => {
    if (lang) void loadShikiLanguage(lang);
  }, [lang]);

  // Toolbar state: transient "copied" checkmark and the wrap toggle.
  const [copied, setCopied] = useState(false);
  const [wrapped, setWrapped] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy code block:", error);
    }
  };

  // Highlight only when the engine and this grammar have finished loading.
  // codeToHtml is synchronous once both exist; it emits a themed <pre> with
  // inline styles, so no CSS import is needed.
  const highlighter = getShikiHighlighter();
  let html: string | null = null;
  if (highlighter && lang && isShikiLanguageReady(lang)) {
    try {
      html = highlighter.codeToHtml(code, { lang, theme: SHIKI_THEME });
    } catch {
      // Grammar failed at highlight time — fall through to plain rendering.
      html = null;
    }
  }

  return (
    <div className="my-2 overflow-hidden rounded-lg">
      {/* Toolbar: language label on the left, actions on the right. */}
      <div className="flex items-center justify-between bg-zinc-900 px-3 py-1.5">
        <span className="text-xs text-zinc-400 select-none">
          {lang || "text"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copied" : "Copy code"}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setWrapped((w) => !w)}
            title={wrapped ? "Disable text wrapping" : "Enable text wrapping"}
            aria-pressed={wrapped}
            className={`rounded p-1 hover:bg-zinc-700 ${
              wrapped
                ? "text-zinc-100 bg-zinc-700"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <WrapText className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Code area: highlighted HTML once ready, plain fallback until then. */}
      {html ? (
        <div
          className={`overflow-x-auto text-sm [&>pre]:p-3 ${
            // pre-wrap lets long lines soft-wrap instead of scrolling.
            wrapped ? "[&_pre]:whitespace-pre-wrap [&_pre]:break-words" : ""
          }`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        // Render our own <code> (not the children element) so the inline-code
        // pill styling from the markdown `code` override doesn't leak in here.
        <pre
          {...props}
          style={{ backgroundColor: SHIKI_THEME_BG }}
          className={`overflow-x-auto p-3 text-sm text-zinc-200 ${
            wrapped ? "whitespace-pre-wrap break-words" : ""
          }`}
        >
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
};

export default ShikiPre;
