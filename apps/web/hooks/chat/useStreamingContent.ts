"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// React batches state updates within the same event loop tick. This is
// normally beneficial, but for streaming chat the user expects each word
// to render immediately. As the markdown AST grows, ReactMarkdown re-renders
// become heavier, so React's scheduler groups more tokens together, causing
// 4-5 lines to appear at once on longer responses.
//
// This hook gates content updates through requestAnimationFrame so the UI
// refreshes at a stable ~60fps cadence regardless of how fast the transport
// delivers tokens. Multiple tokens arriving within the same 16ms frame are
// coalesced into a single commit — but crucially, React can't batch across
// rAF boundaries, so you never see multi-second "chunks" of text.

const useStreamingContent = (targetContent: string, isStreaming: boolean) => {
  const [displayed, setDisplayed] = useState(targetContent);
  const pendingRef = useRef(false);
  const latestRef = useRef(targetContent);

  // Keep the ref current so the rAF callback always reads the freshest value.
  latestRef.current = targetContent;

  const commit = useCallback(() => {
    pendingRef.current = false;
    setDisplayed(latestRef.current);
  }, []);

  useEffect(() => {
    if (!isStreaming) {
      // Stream ended — flush immediately so the final markdown renders
      // in a single pass without animation delay.
      setDisplayed(targetContent);
      return;
    }

    // Schedule one commit per rAF cycle. If another token arrives before
    // the next frame (within ~16ms), it just overwrites latestRef without
    // scheduling a duplicate callback.
    if (!pendingRef.current) {
      pendingRef.current = true;
      requestAnimationFrame(commit);
    }
  }, [targetContent, isStreaming, commit]);

  return displayed;
};

export default useStreamingContent;
