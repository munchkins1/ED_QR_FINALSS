import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

/**
 * Minimal async key/value storage contract that AsyncStorage, localStorage and
 * our in-memory fallback all satisfy (matches supabase-js `auth.storage`).
 */
interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * In-memory store — last-resort fallback so the client always constructs.
 * The session simply won't persist across restarts in that degraded case.
 */
function memoryStorage(): StorageAdapter {
  const memory = new Map<string, string>();
  return {
    getItem: async (key) => (memory.has(key) ? (memory.get(key) as string) : null),
    setItem: async (key, value) => {
      memory.set(key, value);
    },
    removeItem: async (key) => {
      memory.delete(key);
    },
  };
}

/**
 * Web: use localStorage. During static export / SSR there is no localStorage
 * (Node), so guard with `typeof` and fall back to memory — otherwise the
 * Supabase client throws on `_loadSession` and the web export crashes.
 */
function webStorage(): StorageAdapter {
  try {
    if (typeof localStorage !== 'undefined') {
      return {
        getItem: async (key) => localStorage.getItem(key),
        setItem: async (key, value) => {
          localStorage.setItem(key, value);
        },
        removeItem: async (key) => {
          localStorage.removeItem(key);
        },
      };
    }
  } catch {
    // Access to localStorage can throw (e.g. disabled cookies); fall through.
  }
  return memoryStorage();
}

/**
 * Native: AsyncStorage persists the session. It is a native module, so a build
 * compiled before it was added throws on require — fall back to memory so the
 * app still opens instead of crashing at startup.
 */
function nativeStorage(): StorageAdapter {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-async-storage/async-storage') as {
      default?: StorageAdapter;
    };
    return mod.default ?? memoryStorage();
  } catch {
    return memoryStorage();
  }
}

const authStorage = Platform.OS === 'web' ? webStorage() : nativeStorage();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail loudly and clearly (instead of a cryptic crash) if the env vars are
// not inlined. Fix: ensure .env has EXPO_PUBLIC_SUPABASE_URL /
// EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart with `npx expo start -c`.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase config: EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY must be set in .env. ' +
      'Then restart the dev server with: npx expo start -c'
  );
}

/**
 * Single typed Supabase client (spec C2/C3).
 *
 * - `react-native-url-polyfill/auto` polyfills URL/fetch behaviour that
 *   Hermes lacks — without it `createClient`/auth can throw on a real
 *   device and the app appears not to open.
 * - Session storage: localStorage on web, AsyncStorage on native (spec C3).
 *   Only the anon/publishable key is used — never service_role.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
