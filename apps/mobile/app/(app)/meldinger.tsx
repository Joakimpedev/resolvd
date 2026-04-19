import { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { ScreenContainer, ScreenHeader, Card, Badge, Button, ErrorBoundary } from '@/components';
import { colors, layout, spacing, radii, borders } from '@/theme/tokens';
import { type, fontFamily } from '@/theme/typography';
import { iconSizes, iconStrokeWidth } from '@/theme/icons';
import { useRequests, useCreateRequest, type UserRequest } from '@/lib/queries';
import { ApiError } from '@/lib/api';
import { relativeNo } from '@/lib/time';
import { statusLabel, statusVariant } from '@/lib/status';
import { successHaptic, errorHaptic } from '@/lib/haptics';

export default function Meldinger() {
  return (
    <ErrorBoundary>
      <MeldingerInner />
    </ErrorBoundary>
  );
}

function MeldingerInner() {
  const requests = useRequests();
  const [showNew, setShowNew] = useState(false);

  return (
    <ScreenContainer
      scrollable
      refreshing={requests.isRefetching}
      onRefresh={() => requests.refetch()}
    >
      <ScreenHeader label="MELDINGER" title="Snakk med oss">
        <Button
          label="Ny forespørsel"
          size="small"
          icon={<Plus size={iconSizes.plus} color={colors.bgPrimary} strokeWidth={iconStrokeWidth} />}
          onPress={() => setShowNew(true)}
        />
      </ScreenHeader>

      {requests.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentGreen} />
        </View>
      ) : requests.error ? (
        <ErrorState error={requests.error} onRetry={() => requests.refetch()} />
      ) : (
        <View style={styles.body}>
          {requests.data!.active.length > 0 && (
            <>
              <Text allowFontScaling={false} style={[type.smallLabel, { marginBottom: 10 }]}>
                AKTIVE
              </Text>
              <View style={{ gap: 10, marginBottom: 24 }}>
                {requests.data!.active.map((r) => (
                  <RequestCard key={r.id} request={r} />
                ))}
              </View>
            </>
          )}

          {requests.data!.completed.length > 0 && (
            <>
              <Text allowFontScaling={false} style={[type.smallLabel, { marginBottom: 10 }]}>
                FULLFØRT
              </Text>
              <View style={{ gap: 10 }}>
                {requests.data!.completed.map((r) => (
                  <View key={r.id} style={{ opacity: 0.7 }}>
                    <RequestCard request={r} />
                  </View>
                ))}
              </View>
            </>
          )}

          {requests.data!.active.length === 0 && requests.data!.completed.length === 0 && (
            <EmptyState />
          )}
        </View>
      )}

      <NewRequestModal visible={showNew} onClose={() => setShowNew(false)} />
    </ScreenContainer>
  );
}

function RequestCard({ request }: { request: UserRequest }) {
  return (
    <Card>
      <View style={styles.cardTop}>
        <Badge variant={statusVariant[request.status]} label={statusLabel[request.status]} />
        <Text allowFontScaling={false} style={type.metaSmall}>{relativeNo(request.updatedAt)}</Text>
      </View>
      <Text allowFontScaling={false} style={[type.cardTitleSmall, { marginBottom: 4 }]}>
        {request.title}
      </Text>
      <Text allowFontScaling={false} style={type.body} numberOfLines={3}>
        {request.description}
      </Text>
    </Card>
  );
}

function EmptyState() {
  return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <Text allowFontScaling={false} style={type.cardTitle}>Ingen forespørsler enda</Text>
      <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>
        Trykk "Ny forespørsel" for å sende oss en melding.
      </Text>
    </View>
  );
}

function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const msg = error instanceof ApiError ? error.messageNO : 'Noe gikk galt.';
  return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <Text allowFontScaling={false} style={type.cardTitle}>Kunne ikke laste meldinger</Text>
      <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>{msg}</Text>
      <Pressable onPress={onRetry} style={{ marginTop: spacing.xxl }} accessibilityRole="button">
        <Text allowFontScaling={false} style={type.link}>Prøv igjen</Text>
      </Pressable>
    </View>
  );
}

function NewRequestModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const titleInputRef = useRef<TextInput>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const create = useCreateRequest();

  async function onSubmit() {
    if (!title.trim() || !description.trim()) return;
    setSubmitError(null);
    try {
      await create.mutateAsync({ title: title.trim(), description: description.trim() });
      successHaptic();
      setTitle('');
      setDescription('');
      onClose();
    } catch (e) {
      errorHaptic();
      const msg = e instanceof ApiError ? e.messageNO : 'Kunne ikke sende forespørsel.';
      setSubmitError(msg);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOuter}
      >
        <View style={styles.modalHeader}>
          <Text allowFontScaling={false} style={type.heroTitle}>Ny forespørsel</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Lukk" accessibilityRole="button">
            <X size={iconSizes.modalClose} color={colors.textPrimary} strokeWidth={iconStrokeWidth} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          <View style={{ gap: 4, marginBottom: 16 }}>
            <Text allowFontScaling={false} style={type.sectionLabel}>TITTEL</Text>
            <TextInput
              ref={titleInputRef}
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Kort oppsummering"
              placeholderTextColor={colors.textSecondary}
              maxLength={120}
              returnKeyType="next"
              onSubmitEditing={() => descriptionInputRef.current?.focus()}
              blurOnSubmit={false}
              textContentType="none"
              autoCapitalize="sentences"
            />
          </View>

          <View style={{ gap: 4 }}>
            <Text allowFontScaling={false} style={type.sectionLabel}>BESKRIVELSE</Text>
            <TextInput
              ref={descriptionInputRef}
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Skriv det du ønsker gjort, endret eller spurt om."
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={4000}
              textAlignVertical="top"
              autoCapitalize="sentences"
            />
          </View>

          {submitError ? (
            <Text allowFontScaling={false} style={[type.body, { color: colors.amberBadgeText, marginTop: 12 }]}>
              {submitError}
            </Text>
          ) : null}
        </ScrollView>

        <View style={styles.modalFooter}>
          <Button
            label="Send inn"
            loading={create.isPending}
            disabled={!title.trim() || !description.trim()}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.screenPaddingH, paddingVertical: 16 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  loading: { padding: 40, alignItems: 'center' },
  modalOuter: { flex: 1, backgroundColor: colors.bgPrimary },
  modalHeader: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: borders.default,
    borderBottomColor: colors.border,
  },
  modalBody: { padding: layout.screenPaddingH },
  modalFooter: {
    padding: layout.screenPaddingH,
    borderTopWidth: borders.default,
    borderTopColor: colors.border,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: borders.default,
    borderColor: colors.border,
    borderRadius: radii.listItem,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
  textarea: { minHeight: 140 },
});
