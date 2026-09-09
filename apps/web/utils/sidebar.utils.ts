// Sidebar dimension constants
const MIN_SIDEBAR_WIDTH = 56;
const MAX_SIDEBAR_WIDTH = 400;
const DEFAULT_SIDEBAR_WIDTH = 240;
// Below this width the sidebar switches to compact icon-only layout
const COMPACT_BREAKPOINT = 120;
// localStorage key for persisting the user's preferred sidebar width
const SIDEBAR_STORAGE_KEY = "sidebarWidth";
const SIDEBAR_EVENT_NAME = "sidebar-width-change";

// Reads the persisted width from localStorage (safe for SSR environments)
const getPersistedWidth = (storageKey = SIDEBAR_STORAGE_KEY): number => {
  if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = Number(raw);
      if (!isNaN(parsed)) {
        return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, parsed));
      }
    }
  } catch (storageError) {
    // Development warning when localStorage access is blocked (e.g. strict cookie/site-data restrictions or sandboxed iframes)
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[Sidebar] Unable to read width from localStorage (blocked by site-data restrictions or sandboxed iframe). Falling back to default ${DEFAULT_SIDEBAR_WIDTH}px:`,
        storageError,
      );
    }
  }
  return DEFAULT_SIDEBAR_WIDTH;
};

// Clamps the given width, persists it to localStorage, and notifies active subscribers
const persistSidebarWidth = (
  width: number,
  storageKey = SIDEBAR_STORAGE_KEY,
): number => {
  const clamped = Math.min(
    MAX_SIDEBAR_WIDTH,
    Math.max(MIN_SIDEBAR_WIDTH, width),
  );
  try {
    localStorage.setItem(storageKey, String(clamped));
    window.dispatchEvent(new Event(SIDEBAR_EVENT_NAME));
  } catch (storageError) {
    // Development warning when saving fails (e.g. quota exceeded or storage blocked by browser settings)
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Sidebar] Unable to persist width to localStorage (quota exceeded or storage blocked):",
        storageError,
      );
    }
  }
  return clamped;
};

// Subscribes to window storage events (cross-tab sync) and local width change events
const subscribeToSidebarWidth = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_EVENT_NAME, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_EVENT_NAME, callback);
  };
};

const getSidebarClientSnapshot = (): number => getPersistedWidth();
const getSidebarServerSnapshot = (): number => DEFAULT_SIDEBAR_WIDTH;

export {
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  DEFAULT_SIDEBAR_WIDTH,
  COMPACT_BREAKPOINT,
  SIDEBAR_STORAGE_KEY,
  getPersistedWidth,
  persistSidebarWidth,
  subscribeToSidebarWidth,
  getSidebarClientSnapshot,
  getSidebarServerSnapshot,
};

