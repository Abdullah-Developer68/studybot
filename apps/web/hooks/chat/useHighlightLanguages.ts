"use client";

import { useEffect, useState } from "react";
import { lowlight } from "@/lib/highlight";

// Regex to extract the language from fenced code blocks: ```rust, ```python, etc.
const CODE_BLOCK_RE = /```(\w+)/g;

// Tracks imports we've already kicked off so we don't double-fetch.
const pendingImports = new Set<string>();

// Scans all messages for fenced code blocks, detects which languages are
// used, and dynamically imports the corresponding highlight.js grammars.
// Returns the shared lowlight instance and a version counter that
// increments whenever a new grammar finishes loading (triggers re-render).
export function useHighlightLanguages(messages: unknown[], status: string) {
  const [version, setVersion] = useState(0);

  // Only scan when the message count changes or streaming finishes —
  // avoids re-parsing on every streaming chunk.
  useEffect(() => {
    // Don't scan during streaming — content changes too rapidly.
    if (status !== "ready") return;

    const detected = new Set<string>();

    for (const msg of messages) {
      // Cast through Record to handle the AI SDK's UIMessage union type.
      const m = msg as Record<string, unknown>;
      // Extract text from either string content or parts array
      const text =
        typeof m.content === "string"
          ? m.content
          : Array.isArray(m.parts)
            ? (m.parts as Array<Record<string, unknown>>)
                .filter((p) => p.type === "text")
                .map((p) => String(p.text ?? ""))
                .join("")
            : "";

      let match: RegExpExecArray | null;
      while ((match = CODE_BLOCK_RE.exec(text)) !== null) {
        const lang = match[1].toLowerCase();
        // Skip overly long tokens that aren't real language identifiers.
        if (lang.length > 20) continue;
        detected.add(lang);
      }
    }

    for (const lang of detected) {
      // Already registered or import already in flight
      if (lowlight.registered(lang) || pendingImports.has(lang)) continue;

      pendingImports.add(lang);

      // Dynamic import — the bundler splits each language into its own chunk.
      // `import()` is async and does NOT block the main thread.
      import(`highlight.js/lib/languages/${lang}`)
        .then((mod) => {
          lowlight.register(lang, mod.default);
          pendingImports.delete(lang);
          // Bump version so ReactMarkdown re-renders with the new grammar.
          setVersion((v) => v + 1);
        })
        .catch(() => {
          // Language file doesn't exist or isn't a valid highlight.js grammar.
          // Silently ignore — code blocks without highlighting still render.
          pendingImports.delete(lang);
        });
    }
  }, [messages, status]);

  return { lowlight, version };
}
