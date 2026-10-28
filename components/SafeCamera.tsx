import { useState } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { COLORS } from '@/constants/colors';

/**
 * Minimal shapes of `expo-camera`'s CameraView + useCameraPermissions that the
 * scan screen relies on, defined locally so the optional native module needs
 * no `any`.
 */
type BarcodeScanEvent = { data: string };
type CameraViewComponent = React.ComponentType<{
  style?: StyleProp<ViewStyle>;
  facing?: 'front' | 'back';
  enableTorch?: boolean;
  barcodeScannerSettings?: { barcodeTypes: string[] };
  onBarcodeScanned?: (event: BarcodeScanEvent) => void;
}>;
type PermissionResponse = {
  granted: boolean;
  canAskAgain: boolean;
  status: string;
};
type UseCameraPermissions = () => [
  PermissionResponse | null,
  () => Promise<PermissionResponse>,
];

/**
 * Load expo-camera defensively. It is a native module, so a build compiled
 * before it was added throws on require. The availability flag is fixed at
 * module load (it never changes between renders), so hook order stays stable.
 */
let CameraViewImpl: CameraViewComponent | null = null;
let useCameraPermissionsImpl: UseCameraPermissions | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('expo-camera') as {
    CameraView?: CameraViewComponent;
    useCameraPermissions?: UseCameraPermissions;
  };
  CameraViewImpl = mod.CameraView ?? null;
  useCameraPermissionsImpl = mod.useCameraPermissions ?? null;
} catch {
  CameraViewImpl = null;
  useCameraPermissionsImpl = null;
}

export const hasCamera = CameraViewImpl !== null;

/**
 * Camera permissions hook that delegates to expo-camera when available and
 * otherwise reports a stable "unavailable" permission so the UI can fall back
 * to manual code entry instead of crashing.
 */
export function useCameraPermissions(): [
  PermissionResponse | null,
  () => Promise<PermissionResponse>,
] {
  if (useCameraPermissionsImpl) {
    return useCameraPermissionsImpl();
  }
  const [perm] = useState<PermissionResponse | null>({
    granted: false,
    canAskAgain: false,
    status: 'unavailable',
  });
  const request = async (): Promise<PermissionResponse> => ({
    granted: false,
    canAskAgain: false,
    status: 'unavailable',
  });
  return [perm, request];
}

/**
 * Camera preview that mirrors expo-camera's CameraView API but renders a
 * friendly placeholder when the native module is unavailable.
 */
export default function SafeCameraView(props: {
  style?: StyleProp<ViewStyle>;
  facing?: 'front' | 'back';
  enableTorch?: boolean;
  barcodeScannerSettings?: { barcodeTypes: string[] };
  onBarcodeScanned?: (event: BarcodeScanEvent) => void;
}) {
  if (CameraViewImpl) {
    const Impl = CameraViewImpl;
    return <Impl {...props} />;
  }
  return (
    <View style={[styles.fallback, props.style]}>
      <Text style={styles.text}>Camera is unavailable in this build.</Text>
      <Text style={styles.hint}>Use “Enter event code manually” instead.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  text: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
});
