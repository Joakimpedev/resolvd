import { View, StyleSheet, ScrollView, ScrollViewProps, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/tokens';

type Props = ScrollViewProps & {
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
};

export function ScreenContainer({
  scrollable = true,
  refreshing,
  onRefresh,
  children,
  contentContainerStyle,
  ...rest
}: Props) {
  const insets = useSafeAreaInsets();

  if (!scrollable) {
    return (
      <View style={[styles.outer, { paddingTop: insets.top }]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.outer, { paddingTop: insets.top }]}>
      <ScrollView
        {...rest}
        style={styles.inner}
        contentContainerStyle={[{ paddingBottom: insets.bottom + 16 }, contentContainerStyle]}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.accentGreen}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.bgPrimary },
  inner: { flex: 1 },
});
