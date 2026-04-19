import { Text } from 'react-native';
import { colors } from '@/theme/tokens';
import { type } from '@/theme/typography';

type StatusPillProps = {
  label: string;
  variant: 'next' | 'locked' | 'completed';
};

export function StatusPill({ label, variant }: StatusPillProps) {
  const color =
    variant === 'next' || variant === 'completed'
      ? colors.accentGreen
      : colors.textSecondary;
  return (
    <Text allowFontScaling={false} style={[type.statusPill, { color }]}>
      {label}
    </Text>
  );
}
