import { useEffect, useState } from "react";

const KEY = "study-portal-view-only";
const EVENT = "study-portal-view-mode";

export function isViewOnly(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function setViewOnly() {
  try {
    window.localStorage.setItem(KEY, "1");
  } catch {
    /* storage may be unavailable */
  }
  emit();
}

export function clearViewOnly() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* storage may be unavailable */
  }
  emit();
}

/** Reactive view-only flag. Always false during SSR/first paint, then hydrates. */
export function useViewOnly(): boolean {
  const [value, setValue] = useState(false);

  useEffect(() => {
    const sync = () => setValue(isViewOnly());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return value;
}
