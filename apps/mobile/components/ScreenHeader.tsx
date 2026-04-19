import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, borders, layout, spacing } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { lightHaptic } from '@/lib/haptics';

type Props = {
  label?: string;
  title?: string;
  rightAction?: { label: string; onPress: () => void };
  children?: React.ReactNode;
  withBorderBottom?: boolean;
};

export function ScreenHeader({
  label,
  title,
  rightAction,
  children,
  withBorderBottom = true,
}: Props) {
  return (
    <View style={[styles.container, withBorderBottom && styles.border]}>
      {(label || rightAction) && (
        <View style={styles.topRow}>
          {label ? <Text allowFontScaling={false} style={type.sectionLabel}>{label}</Text> : <View />}
          {rightAction ? (
            <Pressable
              onPress={() => { lightHaptic(); rightAction.onPress(); }}
              accessibilityRole="button"
              accessibilityLabel={rightAction.label}
              hitSlop={8}
            >
              <Text allowFontScaling={false} style={type.link}>{rightAction.label}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      {title ? (
        <Text allowFontScaling={false} style={[type.heroTitle, { marginBottom: spacing.xxl }]}>
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: layout.screenPaddingH,
  },
  border: {
    borderBottomWidth: borders.default,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
});
