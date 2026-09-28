import { browser } from "$app/environment";

const SESSION_KEY = "animations-shown";

export function shouldShowAnimations(): boolean {
  if (!browser) return true;
  return sessionStorage.getItem(SESSION_KEY) !== "true";
}

export function markAnimationsShown(): void {
  if (!browser) return;
  sessionStorage.setItem(SESSION_KEY, "true");
}

export interface IntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
}

export function createVisibilityObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverOptions = {},
): IntersectionObserver {
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry);
        }
      });
    },
    {
      threshold: options.threshold ?? 0.1,
      rootMargin: options.rootMargin ?? "0px",
    },
  );
}
