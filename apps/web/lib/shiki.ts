// Shared Shiki highlighter singleton for chat markdown rendering. The
// highlighter is created lazily on the client (loading the WASM engine and
// theme is async); individual language grammars are then lazy-loaded one by
// one as fenced code blocks appear in messages, mirroring the lazy-loading
// approach previously used for highlight.js.
import {
  createHighlighter,
  type BundledLanguage,
  type Highlighter,
} from "shiki";

// Matches the dark theme previously provided by highlight.js' github-dark.css.
export const SHIKI_THEME = "github-dark";

// Background color of the github-dark theme — used for the plain fallback so
// it blends in before highlighting kicks in.
export const SHIKI_THEME_BG = "#24292e";

// core shiki engine and theme, created lazily once per page load and shared by all code blocks.
let highlighter: Highlighter | null = null;
// caches the promise for highlighter creation so concurrent callers share one WASM/theme load.
let highlighterPromise: Promise<Highlighter> | null = null;

// Once a grammar loads, it's marked here so isShikiLanguageReady() returns true.
const loadedLanguages = new Set<string>();
// If two code blocks with the same language mount simultaneously, they share one grammar fetch.
const languagePromises = new Map<string, Promise<void>>();
// Names that failed to load (not real Shiki languages) so we never retry them.
const failedLanguages = new Set<string>();

// Languages Shiki renders without a grammar (themed, but no token colors).
const PLAIN_LANGUAGES = new Set(["text", "txt", "plain", "plaintext"]);

// Due to React compiler Parent (ReactMarkdown) is memoized, so props don't change,
// and the child has no internal state change to trigger a re-render. The useSyncExternalStore hook directly
// triggers a re-render on the child component when the grammar/highlighter finishes 
// loading, bypassing the parent entirely.
const listeners = new Set<() => void>();
let shikiVersion = 0;

// Bumps the snapshot version and notifies every subscribed code block.
function notifyShikiListeners() {
  shikiVersion += 1;
  for (const listener of listeners) listener();
}

// useSyncExternalStore subscribe function — returns the unsubscribe cleanup.
export function subscribeShiki(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// useSyncExternalStore snapshot — a monotonically increasing version.
export function getShikiVersion(): number {
  return shikiVersion;
}

// Kicks off highlighter creation exactly once and always returns the same
// promise, so concurrent callers share a single WASM/theme load.
export function ensureShikiHighlighter(): Promise<Highlighter> {
  if (highlighter) return Promise.resolve(highlighter);
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [SHIKI_THEME],
      langs: [],
    })
      .then((h) => {
        highlighter = h;
        notifyShikiListeners();
        return h;
      })
      .catch((error) => {
        // Reset so the next code block mount retries creation, and log so
        // a broken WASM load is visible instead of silently unhighlighted.
        highlighterPromise = null;
        console.error("Failed to initialize the Shiki highlighter:", error);
        throw error;
      });
  }
  return highlighterPromise;
}

// Returns the highlighter only once fully created; null during the initial
// async load so renderers can fall back to plain, unhighlighted code.
export function getShikiHighlighter(): Highlighter | null {
  return highlighter;
}

// Whether codeToHtml can run synchronously for this language right now.
export function isShikiLanguageReady(lang: string): boolean {
  return PLAIN_LANGUAGES.has(lang) || loadedLanguages.has(lang);
}

// Lazy-loads a single grammar into the shared highlighter. Never rejects —
// unknown language names are remembered in failedLanguages and the code block
// simply keeps rendering without highlighting.
export function loadShikiLanguage(lang: string): Promise<void> {
  if (isShikiLanguageReady(lang) || failedLanguages.has(lang)) {
    return Promise.resolve();
  }

  const existing = languagePromises.get(lang);
  if (existing) return existing;

  const promise = ensureShikiHighlighter()
    .then(async (h) => {
      // Re-check: another caller may have loaded it while we awaited.
      if (loadedLanguages.has(lang)) return;
      try {
        // Cast: shiki types language names as a union of bundled literals,
        // but at runtime any bundled grammar name resolves dynamically.
        await h.loadLanguage(lang as BundledLanguage);
        loadedLanguages.add(lang);
      } catch {
        // Not a bundled Shiki language — remember so we don't retry on every
        // render; the block still renders, just without highlighting.
        failedLanguages.add(lang);
      }
    })
    .catch(() => {
      // Highlighter creation itself failed (already logged above) — leave
      // the language unmarked so a later retry can still succeed.
    })
    .finally(() => {
      languagePromises.delete(lang);
      notifyShikiListeners();
    });

  languagePromises.set(lang, promise);
  return promise;
}
