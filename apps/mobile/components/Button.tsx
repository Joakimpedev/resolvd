import { Pressable, Text, StyleSheet, PressableProps, View, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors, radii, spacing, layout } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { lightHaptic } from '@/lib/haptics';

type ButtonSize = 'large' | 'small';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
};

export function Button({
  label,
  size = 'large',
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const sizeStyle: ViewStyle = size === 'small' ? styles.small : styles.large;
  const textStyle: TextStyle = size === 'small' ? type.buttonSmall : type.buttonLarge;

  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        if (disabled || loading) return;
        lightHaptic();
        onPress?.(e);
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        sizeStyle,
        fullWidth && { alignSelf: 'stretch' },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style as ViewStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.bgPrimary} />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={{ marginRight: spacing.md }}>{icon}</View> : null}
          <Text allowFontScaling={false} style={textStyle}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.tapTargetMin,
  },
  large: {
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.listItem,
  },
  small: {
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.toggle,
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
});
