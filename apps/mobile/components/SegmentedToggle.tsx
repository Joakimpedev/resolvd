import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '@/theme/tokens';
import { fontFamily, type } from '@/theme/typography';
import { lightHaptic } from '@/lib/haptics';

type Option = { value: string; label: string };

type Props = {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

export function SegmentedToggle({ value, options, onChange }: Props) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (!active) {
                lightHaptic();
                onChange(opt.value);
              }
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text
              allowFontScaling={false}
              style={[
                type.body,
                {
                  color: active ? colors.bgPrimary : colors.textSecondary,
                  fontFamily: active ? fontFamily.medium : fontFamily.regular,
                  fontSize: 13,
                  lineHeight: 16,
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceRaised,
    padding: 4,
    borderRadius: radii.toggle,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.accentGreen,
  },
});
