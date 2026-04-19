import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, layout, spacing, radii } from '@/theme/tokens';
import { type } from '@/theme/typography';

type Props = { children: ReactNode };
type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) console.error('Global error:', error, errorInfo);
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.outer}>
        <Text allowFontScaling={false} style={[type.heroTitle, { marginBottom: spacing.xxl }]}>
          Noe gikk galt
        </Text>
        <Text allowFontScaling={false} style={[type.body, { marginBottom: spacing.between }]}>
          Prøv å åpne appen på nytt. Hvis feilen gjentar seg, ta kontakt.
        </Text>
        <Pressable
          onPress={this.reset}
          style={styles.retry}
          accessibilityRole="button"
          accessibilityLabel="Prøv igjen"
        >
          <Text allowFontScaling={false} style={type.buttonLarge}>Prøv igjen</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingTop: 80,
    paddingHorizontal: layout.screenPaddingH,
  },
  retry: {
    backgroundColor: colors.accentGreen,
    paddingVertical: 14,
    borderRadius: radii.listItem,
    alignItems: 'center',
  },
});
