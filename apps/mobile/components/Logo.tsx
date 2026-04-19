import { Text, View, StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
import { fontFamily } from '@/theme/typography';

export function Logo() {
  return (
    <View style={styles.row} accessibilityLabel="Resolvd">
      <Text allowFontScaling={false} style={styles.bold}>Re</Text>
      <Text allowFontScaling={false} style={styles.divider}>|</Text>
      <Text allowFontScaling={false} style={styles.light}>solvd</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  bold: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
  divider: {
    fontFamily: fontFamily.regular,
    fontSize: 24,
    color: colors.accentGreen,
    marginHorizontal: 2,
  },
  light: {
    fontFamily: fontFamily.regular,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.textPrimary,
  },
});
