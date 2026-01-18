import { useEffect, useState, useRef, type RefObject } from "react";

interface UseInViewOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface UseInViewResult {
  ref: RefObject<HTMLDivElement | null>;
  isInView: boolean;
}

export function useInView(options: UseInViewOptions = {}): UseInViewResult {
  const { threshold = 0, root = null, rootMargin = "0px", triggerOnce = false } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // If triggerOnce and already triggered, skip
    if (triggerOnce && hasTriggeredRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            if (triggerOnce) {
              hasTriggeredRef.current = true;
            }
          } else if (!triggerOnce) {
            setIsInView(false);
          }
        });
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold, root, rootMargin, triggerOnce]);

  return { ref, isInView };
}
