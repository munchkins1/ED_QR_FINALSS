import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { COLORS } from '@/constants/colors';

/**
 * Toast system per spec UX section: success=emerald, error=rose,
 * info=indigo, warning=amber. Mounted once in the CampusQR layout.
 */

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

type ToastState = { id: number; kind: ToastKind; message: string } | null;

export type ToastApi = {
  show: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
};

const NOOP_API: ToastApi = {
  show: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
};

const ToastContext = createContext<ToastApi>(NOOP_API);

/** Returns the toast API. Safe to call outside the provider (no-op). */
export function useToast(): ToastApi {
  return useContext(ToastContext);
}

const TONE_COLORS: Record<ToastKind, string> = {
  success: COLORS.toastSuccess,
  error: COLORS.toastError,
  info: COLORS.toastInfo,
  warning: COLORS.toastWarning,
};

const TOAST_DURATION_MS = 3800;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      nextId.current += 1;
      setToast({ id: nextId.current, kind, message });

      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();

      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }).start(() => setToast(null));
      }, TOAST_DURATION_MS);
    },
    [opacity]
  );

  const api: ToastApi = {
    show,
    success: (message) => show('success', message),
    error: (message) => show('error', message),
    info: (message) => show('info', message),
    warning: (message) => show('warning', message),
  };

  return (
    <ToastContext.Provider value={api}>
      <View style={styles.container}>
        {children}
        {toast && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toast,
              Platform.OS === 'web' ? styles.toastWeb : styles.toastMobile,
              { backgroundColor: TONE_COLORS[toast.kind], opacity },
            ]}
          >
            <Text style={styles.message}>{toast.message}</Text>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
}

/** Small confirmation banner used where a full toast is too heavy. */
export function InlineMessage({
  kind,
  message,
}: {
  kind: ToastKind;
  message: string;
}) {
  return (
    <View style={[styles.inline, { backgroundColor: TONE_COLORS[kind] }]}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toast: {
    position: 'absolute',
    top: 48,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 13,
    paddingHorizontal: 18,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
  },
  toastMobile: {
    left: 16,
    right: 16,
  },
  toastWeb: {
    right: 20,
    left: 'auto',
    maxWidth: 400,
  },
  inline: {
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 20,
  },
});

