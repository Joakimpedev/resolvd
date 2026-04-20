import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LayoutGrid, BookOpen, ClipboardList, User, LucideIcon } from 'lucide-react-native';
import { colors, layout, borders } from '@/theme/tokens';
import { fontFamily } from '@/theme/typography';
import { iconSizes, iconStrokeWidth } from '@/theme/icons';
import { lightHaptic } from '@/lib/haptics';

const ICONS: Record<string, LucideIcon> = {
  feed:       LayoutGrid,
  laer:       BookOpen,
  oppgaver:   ClipboardList,
  'min-side': User,
};

const LABELS: Record<string, string> = {
  feed: 'Feed',
  laer: 'Lær',
  oppgaver: 'Oppgaver',
  'min-side': 'Min side',
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const active = state.index === index;
        const Icon = ICONS[route.name];
        const label = LABELS[route.name] ?? route.name;
        const tint = active ? colors.accentGreen : colors.textSecondary;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!active && !event.defaultPrevented) {
            lightHaptic();
            navigation.navigate(route.name as never);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            style={styles.tab}
          >
            {Icon ? <Icon size={iconSizes.tabBar} color={tint} strokeWidth={iconStrokeWidth} /> : null}
            <Text
              allowFontScaling={false}
              style={[
                styles.label,
                {
                  color: tint,
                  fontFamily: active ? fontFamily.medium : fontFamily.regular,
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bgPrimary,
    borderTopWidth: borders.default,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minHeight: layout.tapTargetMin,
  },
  label: {
    fontSize: 11,
  },
});
