/**
 * Known-harmless noise that should never surface as a crash overlay.
 *
 * "Unable to activate keep awake" is thrown by `expo-keep-awake` (invoked by
 * Expo Go's dev launcher to keep the screen on while bundling) when the device
 * is locked/inactive at startup — a dev-only race condition, not a bug in this
 * app (see expo/expo#23390). Hermes reports the resulting unhandled rejection
 * through `console.error` (which LogBox renders as the red overlay), so we
 * filter at the console level. Every other message passes through untouched.
 */
const HARMLESS = /Unable to activate keep awake/i;

function containsHarmless(args: unknown[]): boolean {
  return args.some((a) => {
    if (a == null) return false;
    const s =
      typeof a === 'string'
        ? a
        : a instanceof Error
          ? `${a.name} ${a.message} ${a.stack ?? ''}`
          : (() => {
              try {
                return JSON.stringify(a);
              } catch {
                return String(a);
              }
            })();
    return HARMLESS.test(s);
  });
}

/**
 * Install a global filter that swallows only the harmless keep-awake rejection
 * while forwarding everything else. Patches `console.error`, `console.warn`
 * (the two paths RN uses to surface unhandled rejections to LogBox) and the
 * `ErrorUtils` global handler (the path for thrown/fatal errors). Idempotent —
 * safe to call more than once; originals are captured on first call only.
 */
let installed = false;
export function installHarmlessErrorFilter(): void {
  if (installed) return;
  installed = true;

  // Console paths — unhandled promise rejections land here and become the
  // LogBox red overlay. Drop only the harmless keep-awake message.
  const patchConsole = (method: 'error' | 'warn') => {
    const original = console[method].bind(console);
    return (...args: unknown[]) => {
      if (containsHarmless(args)) return;
      original(...args);
    };
  };
  console.error = patchConsole('error') as typeof console.error;
  console.warn = patchConsole('warn') as typeof console.warn;

  // Global handler path — thrown (fatal) errors. Wrap so real errors still
  // propagate to the previous handler.
  const errorUtils = (globalThis as {
    ErrorUtils?: {
      getGlobalHandler?: () => ((e: unknown, isFatal?: boolean) => void) | undefined;
      setGlobalHandler: (h: (e: unknown, isFatal?: boolean) => void) => void;
    };
  }).ErrorUtils;
  if (errorUtils?.getGlobalHandler && errorUtils?.setGlobalHandler) {
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((e, isFatal) => {
      if (containsHarmless([e])) return;
      previous?.(e, isFatal);
    });
  }
}