import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { COLORS } from '@/constants/colors';

type Props = {
  /** The full QR content, e.g. "CAMPUSQR:<uuid>". */
  value: string;
  size?: number;
  caption?: string;
};

/**
 * Renders an event QR code (react-native-qrcode-svg — already a project
 * dependency). The content always follows the CAMPUSQR:<qr_token> format.
 */
export default function QRDisplay({ value, size = 240, caption }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.qrBox}>
        <QRCode value={value} size={size} />
      </View>
      <Text style={styles.caption}>{caption ?? value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  // Paper card the code is printed on — always white so the modules stay
  // dark-on-white and scanners can read them.
  qrBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    shadowColor: COLORS.primaryDeep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  caption: {
    marginTop: 14,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    letterSpacing: 0.2,
  },
});
