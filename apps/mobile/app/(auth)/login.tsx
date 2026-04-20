import { useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { signInEmail } from '@/lib/auth';
import { Logo, Button } from '@/components';
import { colors, layout, spacing, radii, borders } from '@/theme/tokens';
import { type, fontFamily } from '@/theme/typography';
import { errorHaptic } from '@/lib/haptics';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const qc = useQueryClient();
  const passwordInputRef = useRef<TextInput>(null);

  async function onSubmit() {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signInEmail(email, password);
      // Force session hook to re-read the newly-stored token
      await qc.invalidateQueries({ queryKey: ['session'] });
      router.replace('/(app)/feed');
    } catch (e) {
      errorHaptic();
      const err = e as { message?: string };
      setError(err?.message ?? 'Kunne ikke logge inn.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.outer}
    >
      <View style={styles.top}>
        <Logo />
      </View>

      <View style={styles.content}>
        <Text allowFontScaling={false} style={[type.onboardingHeadline, { marginBottom: spacing.lg }]}>
          Logg inn
        </Text>
        <Text allowFontScaling={false} style={[type.bodyLarge, { marginBottom: spacing.between }]}>
          Bruk innloggingen du fikk fra Resolvd.
        </Text>

        <View style={{ gap: 12 }}>
          <View style={styles.field}>
            <Text allowFontScaling={false} style={styles.fieldLabel}>E-post</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              placeholder="din@bedrift.no"
              placeholderTextColor={colors.textSecondary}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.field}>
            <Text allowFontScaling={false} style={styles.fieldLabel}>Passord</Text>
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              placeholder=""
              returnKeyType="go"
              onSubmitEditing={onSubmit}
            />
          </View>

          {error ? (
            <Text allowFontScaling={false} style={styles.error}>
              {error}
            </Text>
          ) : null}

          <Button
            label="Logg inn"
            onPress={onSubmit}
            loading={loading}
            disabled={!email || !password}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    paddingTop: 80,
  },
  top: { paddingHorizontal: layout.screenPaddingH, marginBottom: 40 },
  content: { flex: 1, paddingHorizontal: layout.screenPaddingH },
  field: { gap: 4 },
  fieldLabel: { ...type.sectionLabel, color: colors.textSecondary },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.listItem,
    borderWidth: borders.default,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 48,
  },
  error: {
    ...type.body,
    color: colors.amberBadgeText,
    marginTop: 4,
  },
});
