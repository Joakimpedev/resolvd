import { View, StyleSheet, ViewProps } from 'react-native';
import { colors, radii, borders } from '@/theme/tokens';

type CardProps = ViewProps & {
  selected?: boolean;
  radius?: 'card' | 'listItem' | 'toggle';
  padding?: number;
};

export function Card({
  selected = false,
  radius = 'card',
  padding = 16,
  style,
  ...rest
}: CardProps) {
  return (
    <View
      {...rest}
      style={[
        styles.base,
        {
          borderRadius: radii[radius],
          borderWidth: selected ? borders.selected : borders.default,
          borderColor: selected ? colors.accentGreen : colors.border,
          padding,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
  },
});
