import { View, Text, StyleSheet } from 'react-native';
import { colors, borders } from '@/theme/tokens';
import { fontFamily } from '@/theme/typography';

type AvatarSize = 32 | 52;
type AvatarVariant = 'owner' | 'employee' | 'pending';

type AvatarProps = {
  initial: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
};

export function Avatar({ initial, size = 32, variant = 'owner' }: AvatarProps) {
  const pending = variant === 'pending';
  const bg =
    variant === 'owner'    ? colors.accentGreen
    : variant === 'employee' ? colors.textSecondary
    : colors.surfaceRaised;
  const fg = pending ? colors.textSecondary : colors.bgPrimary;

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderWidth: pending ? borders.default : 0,
          borderColor: pending ? colors.border : 'transparent',
        },
      ]}
      accessibilityLabel={pending ? 'Invitasjon venter' : `${initial}`}
    >
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: fontFamily.medium,
          fontSize: size === 52 ? 18 : 13,
          color: fg,
        }}
      >
        {pending ? '?' : initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
