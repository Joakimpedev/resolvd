import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { ChevronRight, Check } from 'lucide-react-native';
import { ScreenContainer, Card, Button, ProgressBar, ErrorBoundary } from '@/components';
import { colors, layout, spacing, borders } from '@/theme/tokens';
import { type, fontFamily } from '@/theme/typography';
import { iconSizes, iconStrokeWidth } from '@/theme/icons';
import {
  useMe, useLessons, useCompleteLesson, useSetLevel, useSkipOnboarding,
  type Lesson,
} from '@/lib/queries';
import { ApiError } from '@/lib/api';
import { levelLabel, levelDescription, levelHeadline, type Level } from '@/lib/levels';
import { lightHaptic, successHaptic } from '@/lib/haptics';

export default function Laer() {
  return (
    <ErrorBoundary>
      <LaerInner />
    </ErrorBoundary>
  );
}

function LaerInner() {
  const me = useMe();

  if (me.isLoading) {
    return (
      <ScreenContainer scrollable={false}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentGreen} />
        </View>
      </ScreenContainer>
    );
  }
  if (me.error) {
    return (
      <ScreenContainer scrollable={false}>
        <View style={styles.empty}>
          <Text allowFontScaling={false} style={type.cardTitle}>Kunne ikke laste</Text>
          <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>
            Sjekk nettet og prøv igjen.
          </Text>
          <Pressable onPress={() => me.refetch()} style={{ marginTop: spacing.xxl }}>
            <Text allowFontScaling={false} style={type.link}>Prøv igjen</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }
  if (!me.data?.onboardingDone) {
    return <Onboarding />;
  }
  return <MainLaer />;
}

// ─── Onboarding ──────────────────────────────────────────────────

function Onboarding() {
  const [selected, setSelected] = useState<Level | null>(null);
  const setLevel = useSetLevel();
  const skip = useSkipOnboarding();

  return (
    <ScreenContainer scrollable={false}>
      <View style={styles.obTop}>
        <Text allowFontScaling={false} style={type.smallLabel}>STEG 1 AV 1</Text>
        <Pressable
          onPress={() => skip.mutate()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Hopp over"
        >
          <Text allowFontScaling={false} style={type.linkMuted}>Hopp over</Text>
        </Pressable>
      </View>

      <View style={styles.obContent}>
        <Text allowFontScaling={false} style={[type.smallLabel, { marginBottom: 10 }]}>
          AI-SKOLEN
        </Text>
        <Text
          allowFontScaling={false}
          style={[type.onboardingHeadline, { marginBottom: 10 }]}
        >
          Hvor godt kjenner du AI i dag?
        </Text>
        <Text allowFontScaling={false} style={type.bodyLarge}>
          Vi tilpasser hva du lærer basert på svaret. Du kan endre nivå når som helst.
        </Text>

        <View style={{ marginTop: 28, gap: 10 }}>
          {(['BEGINNER', 'INTER', 'ADVANCED'] as Level[]).map((lvl) => (
            <Pressable
              key={lvl}
              onPress={() => {
                lightHaptic();
                setSelected(lvl);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: selected === lvl }}
              accessibilityLabel={levelLabel[lvl]}
            >
              <Card selected={selected === lvl}>
                <Text allowFontScaling={false} style={[type.cardTitleSmall, { marginBottom: 4 }]}>
                  {levelLabel[lvl]}
                </Text>
                <Text allowFontScaling={false} style={type.body}>{levelDescription[lvl]}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.obFooter}>
        <Button
          label="Fortsett"
          disabled={!selected || setLevel.isPending}
          loading={setLevel.isPending}
          onPress={() => {
            if (selected) setLevel.mutate(selected);
          }}
        />
      </View>
    </ScreenContainer>
  );
}

// ─── Main Lær ────────────────────────────────────────────────────

function MainLaer() {
  const lessons = useLessons();
  const [showLevelModal, setShowLevelModal] = useState(false);

  return (
    <ScreenContainer
      scrollable
      refreshing={lessons.isRefetching}
      onRefresh={() => lessons.refetch()}
    >
      <View style={styles.mainHeader}>
        <View style={styles.mainTopRow}>
          <Text allowFontScaling={false} style={type.sectionLabel}>AI-SKOLEN</Text>
          <Pressable
            onPress={() => {
              lightHaptic();
              setShowLevelModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Endre nivå"
          >
            <Text allowFontScaling={false} style={type.link}>Endre nivå</Text>
          </Pressable>
        </View>

        {lessons.data ? (
          <>
            <Text allowFontScaling={false} style={[type.heroTitle, { marginBottom: 2 }]}>
              {levelHeadline[lessons.data.level]}
            </Text>
            <Text allowFontScaling={false} style={[type.body, { marginTop: 4 }]}>
              Nivå: {levelLabel[lessons.data.level]} · {lessons.data.totalCount} leksjoner
            </Text>

            <View style={{ marginTop: 14 }}>
              <View style={styles.progressLabel}>
                <Text allowFontScaling={false} style={type.meta}>Din fremgang</Text>
                <Text
                  allowFontScaling={false}
                  style={[type.meta, { color: colors.textPrimary }]}
                >
                  {lessons.data.completedCount} / {lessons.data.totalCount}
                </Text>
              </View>
              <ProgressBar
                value={
                  lessons.data.totalCount === 0
                    ? 0
                    : lessons.data.completedCount / lessons.data.totalCount
                }
              />
            </View>
          </>
        ) : null}
      </View>

      {lessons.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentGreen} />
        </View>
      ) : lessons.error ? (
        <ErrorState error={lessons.error} onRetry={() => lessons.refetch()} />
      ) : lessons.data!.lessons.length === 0 ? (
        <EmptyState />
      ) : (
        <View style={styles.lessonList}>
          {lessons.data!.lessons.map((l) => (
            <LessonCard key={l.id} lesson={l} />
          ))}
        </View>
      )}

      <ChangeLevelModal
        visible={showLevelModal}
        currentLevel={lessons.data?.level ?? 'BEGINNER'}
        onClose={() => setShowLevelModal(false)}
      />
    </ScreenContainer>
  );
}

function LessonCard({ lesson }: { lesson: Lesson }) {
  const complete = useCompleteLesson();

  if (lesson.isCompleted) {
    return (
      <Card radius="card" padding={14}>
        <View style={styles.lessonRow}>
          <View style={styles.badgeCompleted}>
            <Check
              size={iconSizes.lessonCheck}
              color={colors.bgPrimary}
              strokeWidth={iconStrokeWidth}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text allowFontScaling={false} style={[type.statusPill, { color: colors.accentGreen }]}>
              Fullført
            </Text>
            <Text allowFontScaling={false} style={[type.lessonTitle, { marginTop: 2 }]}>
              {lesson.title}
            </Text>
          </View>
        </View>
      </Card>
    );
  }

  if (lesson.isLocked) {
    return (
      <View style={{ opacity: 0.6 }}>
        <Card padding={14}>
          <View style={styles.lessonRow}>
            <View style={styles.badgeLocked}>
              <Text allowFontScaling={false} style={styles.badgeNumText}>{lesson.order}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text allowFontScaling={false} style={[type.statusPill, { color: colors.textSecondary }]}>
                Låst{lesson.readingMinutes ? ` · ${lesson.readingMinutes} min` : ''}
              </Text>
              <Text allowFontScaling={false} style={[type.lessonTitle, { marginTop: 2 }]}>
                {lesson.title}
              </Text>
            </View>
          </View>
        </Card>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        lightHaptic();
        complete.mutate(lesson.id, { onSuccess: () => successHaptic() });
      }}
      accessibilityRole="button"
      accessibilityLabel={`Neste leksjon: ${lesson.title}`}
    >
      <Card selected padding={14}>
        <View style={styles.lessonRow}>
          <View style={styles.badgeNext}>
            <Text
              allowFontScaling={false}
              style={[styles.badgeNumText, { color: colors.bgPrimary }]}
            >
              {lesson.order}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text allowFontScaling={false} style={[type.statusPill, { color: colors.accentGreen }]}>
              Neste{lesson.readingMinutes ? ` · ${lesson.readingMinutes} min` : ''}
            </Text>
            <Text allowFontScaling={false} style={[type.lessonTitle, { marginTop: 2 }]}>
              {lesson.title}
            </Text>
          </View>
          <ChevronRight
            size={iconSizes.chevron}
            color={colors.accentGreen}
            strokeWidth={iconStrokeWidth}
          />
        </View>
      </Card>
    </Pressable>
  );
}

function ChangeLevelModal({
  visible,
  currentLevel,
  onClose,
}: {
  visible: boolean;
  currentLevel: Level;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Level>(currentLevel);
  const setLevel = useSetLevel();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary, paddingTop: 40, paddingHorizontal: layout.screenPaddingH }}>
        <Text allowFontScaling={false} style={[type.onboardingHeadline, { marginBottom: 10 }]}>
          Endre nivå
        </Text>
        <Text allowFontScaling={false} style={[type.bodyLarge, { marginBottom: spacing.between }]}>
          Fremgangen din beholdes per nivå.
        </Text>
        <View style={{ gap: 10 }}>
          {(['BEGINNER', 'INTER', 'ADVANCED'] as Level[]).map((lvl) => (
            <Pressable
              key={lvl}
              onPress={() => {
                lightHaptic();
                setSelected(lvl);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: selected === lvl }}
            >
              <Card selected={selected === lvl}>
                <Text allowFontScaling={false} style={[type.cardTitleSmall, { marginBottom: 4 }]}>
                  {levelLabel[lvl]}
                </Text>
                <Text allowFontScaling={false} style={type.body}>{levelDescription[lvl]}</Text>
              </Card>
            </Pressable>
          ))}
        </View>
        <View style={{ marginTop: 'auto', paddingVertical: 20 }}>
          <Button
            label="Lagre"
            loading={setLevel.isPending}
            disabled={selected === currentLevel}
            onPress={() => {
              setLevel.mutate(selected, {
                onSuccess: () => {
                  successHaptic();
                  onClose();
                },
              });
            }}
          />
          <Pressable onPress={onClose} style={{ alignItems: 'center', marginTop: 12 }}>
            <Text allowFontScaling={false} style={type.linkMuted}>Avbryt</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text allowFontScaling={false} style={type.cardTitle}>Ingen leksjoner enda</Text>
      <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>
        Leksjoner dukker opp her når de publiseres.
      </Text>
    </View>
  );
}

function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const msg = error instanceof ApiError ? error.messageNO : 'Noe gikk galt.';
  return (
    <View style={styles.empty}>
      <Text allowFontScaling={false} style={type.cardTitle}>Kunne ikke laste leksjoner</Text>
      <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>{msg}</Text>
      <Pressable onPress={onRetry} style={{ marginTop: spacing.xxl }}>
        <Text allowFontScaling={false} style={type.link}>Prøv igjen</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  obTop: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  obContent: { flex: 1, paddingTop: 40, paddingHorizontal: layout.screenPaddingH },
  obFooter: { paddingHorizontal: layout.screenPaddingH, paddingVertical: 24 },

  mainHeader: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: 16,
    borderBottomWidth: borders.default,
    borderBottomColor: colors.border,
  },
  mainTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  progressLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },

  lessonList: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: 16,
    gap: 10,
  },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badgeNext: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLocked: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgPrimary,
    borderWidth: borders.default,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCompleted: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNumText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },

  loading: { padding: 40, alignItems: 'center' },
  empty: { padding: 40, alignItems: 'center' },
});
