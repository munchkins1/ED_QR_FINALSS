import { StyleSheet, Text, View } from 'react-native';

import AnimatedLogo from '@/components/AnimatedLogo';
import FadeInView from '@/components/FadeInView';
import ShineText from '@/components/ShineText';
import { COLORS } from '@/constants/colors';

type Props = {
  title: string;
  subtitle?: string;
  /**
   * 'hero' renders the title/subtitle white for placement on a blue
   * gradient hero band (styling-only variant; default look unchanged).
   */
  variant?: 'default' | 'hero';
};

/** Gradient logo mark + app title (spec B2 brand gradient + §4 motion). */
export default function Header({ title, subtitle, animated = true, variant = 'default' }: Props & { animated?: boolean }) {
  const onHero = variant === 'hero';
  return (
    <FadeInView style={styles.container} animated={animated}>
      <View style={styles.logoWrap}>
        <AnimatedLogo size={72} iconSize={36} />
      </View>
      {onHero ? (
        // Static white title on the gradient hero (the shine sweep would
        // wash out on blue — styling-only choice, no logic change).
        <Text style={[styles.title, styles.titleOnHero]}>{title}</Text>
      ) : (
        <ShineText style={styles.title}>{title}</ShineText>
      )}
      {subtitle ? (
        <Text style={[styles.subtitle, onHero && styles.subtitleOnHero]}>{subtitle}</Text>
      ) : null}
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  logoWrap: {
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  /** Hero variant — white copy on the blue gradient band. */
  titleOnHero: {
    color: COLORS.textOnPrimary,
  },
  subtitleOnHero: {
    color: COLORS.textPlaceholder,
  },
});
