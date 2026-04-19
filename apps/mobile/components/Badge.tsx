import { Text, View, StyleSheet } from 'react-native';
import { colors, radii } from '@/theme/tokens';
import { type } from '@/theme/typography';

type BadgeVariant = 'green' | 'amber' | 'neutral';

type BadgeProps = {
  label: string;
  variant: BadgeVariant;
};

export function Badge({ label, variant }: BadgeProps) {
  const variantStyle = variantStyles[variant];
  return (
    <View style={[styles.base, variantStyle.bg]}>
      <Text allowFontScaling={false} style={[type.badge, variantStyle.text]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
});

const variantStyles = {
  green: {
    bg:   { backgroundColor: colors.greenBadgeBg },
    text: { color: colors.accentGreenDark },
  },
  amber: {
    bg:   { backgroundColor: colors.amberBadgeBg },
    text: { color: colors.amberBadgeText },
  },
  neutral: {
    bg:   { backgroundColor: colors.neutralBadgeBg },
    text: { color: colors.textSecondary },
  },
} as const;
