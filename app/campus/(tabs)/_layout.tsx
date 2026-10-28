import { memo, useCallback, useMemo } from 'react';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AnimatedPressable from '@/components/AnimatedPressable';
import AppHeader from '@/components/AppHeader';
import { useCampusRole } from '@/lib/campusqr/roles';
import { usePendingAppealCount } from '@/lib/campusqr/appeals';
import { COLORS, RADIUS } from '@/constants/colors';
/**
 * Hides a route from the bar completely. React Navigation v7 wraps every
 * tab in a `flex: 1` item — a `tabBarButton` that returns `null` still
 * leaves that empty slot behind (which is what made the visible buttons
 * tiny and unevenly spaced). `display: 'none'` removes the slot so the
 * remaining tabs split the bar into equal, full-width slices. This is the
 * same mechanism expo-router itself uses for `href: null` routes.
 */
const HIDDEN_TAB: { display: 'none' } = { display: 'none' };

/**
 * Button anatomy — the ACTIVE tab highlights the WHOLE button as a filled
 * Royal-Navy surface (icon + label together), matching the "selected" state,
 * while inactive tabs stay as a muted icon + caption. Both states share the
 * exact same box (size, radius, padding) so switching tabs never shifts the
 * neighbours (zero layout jump):
 *   ┌──────────────────┐
 *   │  icon   (24×24)  │  ← white filled icon when active / muted outline
 *   │  caption (12pt)  │  ← white bold when active / muted when inactive
 *   └──────────────────┘
 * Each button keeps the navigator's `flex: 1` slot style (so visible tabs
 * split the bar into equal widths) with a small horizontal margin, filling
 * its slice when active. The bar is a warm Bone glass surface.
 *
 * Memoized: the navigator re-renders on role/appeal-count ticks; without
 * memo every tab button (and its AnimatedPressable) would re-render on
 * each tick. Motion + layout unchanged.
 */
const TabButton = memo(function TabButton({
  accessibilityState,
  'aria-selected': ariaSelected,
  onPress,
  onLongPress,
  style: navStyle,
  tabLabel,
  iconOutline,
  iconFilled,
  badge,
}: any & {
  tabLabel: string;
  iconOutline: keyof typeof Ionicons.glyphMap;
  iconFilled: keyof typeof Ionicons.glyphMap;
  badge?: number;
}) {
  // React Navigation v7 passes `aria-selected`; keep `accessibilityState`
  // as a fallback so the active pill can never silently stop rendering.
  const focused = !!(accessibilityState?.selected ?? ariaSelected);
  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.tabTouch, focused ? styles.tabTouchActive : {}]}
      accessibilityState={{ selected: focused }}
      accessibilityRole="button"
      accessibilityLabel={tabLabel}
      hitSlop={6}
      pressScale={0.92}
    >
      <Ionicons
        name={focused ? iconFilled : iconOutline}
        size={24}
        color={focused ? COLORS.textOnPrimary : COLORS.textSecondary}
      />
      <Text style={[styles.tabLabel, focused ? styles.tabLabelActive : {}]}>
        {tabLabel}
      </Text>
      {badge && badge > 0 && (
        <View style={styles.tabBadge}>
          <Text style={styles.tabBadgeText}>{badge}</Text>
        </View>
      )}
    </AnimatedPressable>
  );
});

export default function CampusTabsLayout() {
  const { role, loading } = useCampusRole();
  const insets = useSafeAreaInsets();
  const staffRole = role === 'teacher' || role === 'admin';
  const { count: pendingAppeals } = usePendingAppealCount(staffRole);

  if (loading) {
    return null;
  }

  const isStaff = role === 'teacher' || role === 'admin';
  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = !isStaff;

  /**
   * Options for a role-gated tab. When the role cannot use the screen the
   * tab is removed from layout entirely (no empty slot is reserved).
   */
  const gatedTab = (
    visible: boolean,
    label: string,
    iconOutline: keyof typeof Ionicons.glyphMap,
    iconFilled: keyof typeof Ionicons.glyphMap,
    badge: number = 0
  ) => ({
    tabBarItemStyle: visible ? undefined : HIDDEN_TAB,
    tabBarButton: (props: any) =>
      visible ? (
        <TabButton
          {...props}
          tabLabel={label}
          iconOutline={iconOutline}
          iconFilled={iconFilled}
            badge={badge}
        />
      ) : null,
  });

  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        headerStyle: { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: 'transparent' },
        headerStatusBarHeight: 0,
        tabBarShowLabel: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: 'rgba(30, 64, 175, 0.10)',
          borderTopWidth: 1,
          // 58pt button row (6pt top pad + 52pt buttons) + home indicator.
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          paddingHorizontal: 6,
          // Soft lift so the bar reads as a surface floating over the scene.
          shadowColor: COLORS.primaryDeep,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.10,
          shadowRadius: 16,
          elevation: 12,
        },
      }}
    >
      <Tabs.Screen
        name="events"
        options={{
          title: isStaff ? 'Manage Events' : 'Events',
          ...gatedTab(true, 'Events', 'calendar-outline', 'calendar'),
        }}
      />
      <Tabs.Screen
        name="generate-qr"
        options={{
          title: 'QR',
          ...gatedTab(isTeacher, 'QR', 'qr-code-outline', 'qr-code'),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          ...gatedTab(isStudent, 'Scan', 'scan-outline', 'scan'),
        }}
      />
      <Tabs.Screen
        name="my-attendance"
        options={{
          title: 'Attendance',
          ...gatedTab(
            isStudent,
            'Attendance',
            'checkmark-circle-outline',
            'checkmark-circle'
          ),
        }}
      />
      <Tabs.Screen
        name="monitor-attendance"
        options={{
          title: isAdmin ? 'Overall Attendance' : 'Monitor',
          ...gatedTab(isStaff, 'Monitor', 'people-outline', 'people', pendingAppeals),
        }}
      />
      <Tabs.Screen
        name="correct-records"
        options={{
          title: 'Correct Records',
          ...gatedTab(isAdmin, 'Correct', 'create-outline', 'create'),
        }}
      />
      <Tabs.Screen
        name="manage-users"
        options={{
          title: 'Manage Users',
          ...gatedTab(isAdmin, 'Users', 'shield-outline', 'shield'),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: isAdmin ? 'System Reports' : 'Reports',
          ...gatedTab(isStaff, 'Reports', 'bar-chart-outline', 'bar-chart'),
        }}
      />
      <Tabs.Screen
        name="appeals"
        options={{
          title: 'Appeals',
          // Merged into the Monitor tab's "Appeals" segment; the route stays
          // registered (hidden) for the student deep link from My Attendance.
          ...gatedTab(false, 'Appeals', 'mail-open-outline', 'mail-open'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          ...gatedTab(true, 'Profile', 'person-outline', 'person'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  /**
   * Inner content: fills its `flex: 1` slot (minus a small side margin so the
   * active fill reads as a distinct, rounded surface), centred icon + caption.
   * Active ⇄ inactive share this exact box so the neighbours never shift.
   */
  tabTouch: {
    flex: 1,
    minHeight: 48,
    marginHorizontal: 4,
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    gap: 3,
    borderRadius: RADIUS.nav,
    backgroundColor: 'transparent',
  },
  /** Active: the WHOLE button fills Royal Navy (the selected surface). */
  tabTouchActive: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primaryDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },

  tabIconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -16,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.textOnPrimary,
  },
  tabBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: COLORS.textOnPrimary,
    fontWeight: '700',
  },
});


