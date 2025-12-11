"use client";

import { useEffect, useRef } from "react";

export function useChatScroll<T>(dep: T) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Use requestAnimationFrame to ensure DOM is updated before scrolling
    const scrollToBottom = () => {
      if (ref.current) {
        // Find the ScrollArea viewport element (Radix UI ScrollArea)
        const scrollArea = ref.current.closest('[data-slot="scroll-area"]');
        const viewport = scrollArea?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
        
        if (viewport) {
          // Always scroll instantly to ensure we're at the bottom
          viewport.scrollTop = viewport.scrollHeight;
        } else if (ref.current) {
          // Fallback: scroll the ref element itself
          ref.current.scrollTop = ref.current.scrollHeight;
        }
      }
    };

    // Use requestAnimationFrame to ensure layout is complete
    requestAnimationFrame(() => {
      // Small delay to ensure content is rendered
      setTimeout(scrollToBottom, 0);
    });
  }, [dep]);

  return ref;
}




