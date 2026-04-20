import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { ChevronRight, Check, X, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { ScreenContainer, Card, ProgressBar, ErrorBoundary, ScopeBadges, MarkdownView } from '@/components';
import { colors, layout, spacing, borders } from '@/theme/tokens';
import { type, fontFamily } from '@/theme/typography';
import { iconSizes, iconStrokeWidth } from '@/theme/icons';
import {
  useMe, useCourses, useCourse, useCompleteLesson,
  type CourseSummary, type CourseDetail, type CourseLesson, type CourseModule,
} from '@/lib/queries';
import { ApiError } from '@/lib/api';
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
  const courses = useCourses();
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);

  const { refetch: refetchCourses } = courses;
  const { refetch: refetchMe } = me;
  useFocusEffect(useCallback(() => { refetchCourses(); refetchMe(); }, [refetchCourses, refetchMe]));

  const viewerCompanyId = me.data?.company?.id ?? null;
  const viewerTagIds = me.data?.tags.map(t => t.id) ?? [];

  return (
    <ScreenContainer
      scrollable
      refreshing={courses.isRefetching}
      onRefresh={() => courses.refetch()}
    >
      <View style={styles.mainHeader}>
        <Text allowFontScaling={false} style={type.sectionLabel}>LÆRING</Text>
        <Text allowFontScaling={false} style={[type.heroTitle, { marginTop: 4 }]}>Kurs</Text>
        <Text allowFontScaling={false} style={[type.body, { marginTop: 4 }]}>
          Strukturerte kurs og leksjoner om emner som er relevante for jobben din.
        </Text>
      </View>

      {courses.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentGreen} />
        </View>
      ) : courses.error ? (
        <ErrorState error={courses.error} onRetry={() => courses.refetch()} />
      ) : !courses.data || courses.data.courses.length === 0 ? (
        <EmptyState />
      ) : (
        <View style={styles.courseGrid}>
          {courses.data.courses.map((co) => (
            <CourseCard
              key={co.id}
              course={co}
              viewerCompanyId={viewerCompanyId}
              viewerTagIds={viewerTagIds}
              onPress={() => setOpenCourseId(co.id)}
            />
          ))}
        </View>
      )}

      <CourseDetailModal
        courseId={openCourseId}
        onClose={() => setOpenCourseId(null)}
      />
    </ScreenContainer>
  );
}

function CourseCard({
  course,
  viewerCompanyId,
  viewerTagIds,
  onPress,
}: {
  course: CourseSummary;
  viewerCompanyId: string | null;
  viewerTagIds: string[];
  onPress: () => void;
}) {
  const pct = course.totalCount === 0 ? 0 : course.completedCount / course.totalCount;
  const done = pct >= 1;
  return (
    <Pressable
      onPress={() => { lightHaptic(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={`Kurs: ${course.title}, ${course.completedCount} av ${course.totalCount} fullført`}
    >
      <Card padding={16}>
        <Text allowFontScaling={false} style={type.cardTitle}>{course.title}</Text>
        <View style={{ marginTop: 6 }}>
          <ScopeBadges
            everyone={course.everyone}
            companies={course.companies}
            tags={course.tags}
            viewerCompanyId={viewerCompanyId}
            viewerTagIds={viewerTagIds}
          />
        </View>
        {course.description ? (
          <Text allowFontScaling={false} style={[type.body, { marginTop: 4 }]} numberOfLines={2}>
            {course.description}
          </Text>
        ) : null}
        <View style={{ marginTop: 14 }}>
          <View style={styles.progressRow}>
            <Text allowFontScaling={false} style={type.meta}>
              {course.completedCount} / {course.totalCount} leksjoner
            </Text>
            {done ? (
              <Text allowFontScaling={false} style={[type.meta, { color: colors.accentGreen }]}>Fullført</Text>
            ) : null}
          </View>
          <View style={{ marginTop: 6 }}>
            <ProgressBar value={pct} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

// ─── Course detail modal ─────────────────────────────────────────

function CourseDetailModal({
  courseId,
  onClose,
}: {
  courseId: string | null;
  onClose: () => void;
}) {
  const course = useCourse(courseId ?? undefined);
  return (
    <Modal
      visible={!!courseId}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <View style={styles.modalHeader}>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Lukk"
            style={styles.closeBtn}
          >
            <X size={iconSizes.chevron} color={colors.textSecondary} strokeWidth={iconStrokeWidth} />
          </Pressable>
        </View>

        {course.isLoading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.accentGreen} /></View>
        ) : course.error || !course.data ? (
          <View style={styles.empty}>
            <Text allowFontScaling={false} style={type.cardTitle}>Kunne ikke laste kurset</Text>
          </View>
        ) : (
          <CourseDetailContent course={course.data} />
        )}
      </View>
    </Modal>
  );
}

function CourseDetailContent({ course }: { course: CourseDetail }) {
  const pct = course.totalCount === 0 ? 0 : course.completedCount / course.totalCount;
  const [openLesson, setOpenLesson] = useState<CourseLesson | null>(null);

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.detailHeader}>
          <Text allowFontScaling={false} style={type.sectionLabel}>KURS</Text>
          <Text allowFontScaling={false} style={[type.heroTitle, { marginTop: 4 }]}>{course.title}</Text>
          {course.description ? (
            <Text allowFontScaling={false} style={[type.bodyLarge, { marginTop: 8 }]}>{course.description}</Text>
          ) : null}
          <View style={{ marginTop: 14 }}>
            <View style={styles.progressRow}>
              <Text allowFontScaling={false} style={type.meta}>Din fremgang</Text>
              <Text allowFontScaling={false} style={[type.meta, { color: colors.textPrimary }]}>
                {course.completedCount} / {course.totalCount}
              </Text>
            </View>
            <View style={{ marginTop: 6 }}>
              <ProgressBar value={pct} />
            </View>
          </View>
        </View>

        {course.modules.length === 0 ? (
          <View style={styles.empty}>
            <Text allowFontScaling={false} style={type.body}>Ingen moduler i dette kurset enda.</Text>
          </View>
        ) : (
          <View style={styles.moduleList}>
            {course.modules.map((m, idx) => (
              <ModuleBlock
                key={m.id}
                module={m}
                defaultExpanded={idx === 0}
                onOpenLesson={(l) => setOpenLesson(l)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <LessonReadModal lesson={openLesson} onClose={() => setOpenLesson(null)} />
    </>
  );
}

function ModuleBlock({
  module,
  defaultExpanded,
  onOpenLesson,
}: {
  module: CourseModule;
  defaultExpanded: boolean;
  onOpenLesson: (l: CourseLesson) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const completed = module.lessons.filter(l => l.isCompleted).length;

  return (
    <View style={{ marginBottom: 12 }}>
      <Pressable
        onPress={() => { lightHaptic(); setExpanded(v => !v); }}
        accessibilityRole="button"
        accessibilityLabel={`Modul ${module.title}, ${completed} av ${module.lessons.length} fullført`}
      >
        <View style={styles.moduleHeader}>
          <View style={{ flex: 1 }}>
            <Text allowFontScaling={false} style={type.sectionLabel}>MODUL {module.order}</Text>
            <Text allowFontScaling={false} style={[type.cardTitle, { marginTop: 2 }]}>{module.title}</Text>
            <Text allowFontScaling={false} style={[type.meta, { marginTop: 2 }]}>
              {completed} / {module.lessons.length} fullført
            </Text>
          </View>
          {expanded ? (
            <ChevronUp size={iconSizes.chevron} color={colors.textSecondary} strokeWidth={iconStrokeWidth} />
          ) : (
            <ChevronDown size={iconSizes.chevron} color={colors.textSecondary} strokeWidth={iconStrokeWidth} />
          )}
        </View>
      </Pressable>
      {expanded ? (
        <View style={{ marginTop: 8, gap: 8 }}>
          {module.lessons.map(l => (
            <LessonCard key={l.id} lesson={l} onPress={() => onOpenLesson(l)} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function LessonCard({ lesson, onPress }: { lesson: CourseLesson; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => { lightHaptic(); onPress(); }}
      accessibilityRole="button"
      accessibilityLabel={`Leksjon: ${lesson.title}${lesson.isCompleted ? ', fullført' : ''}`}
    >
      <Card padding={14}>
        <View style={styles.lessonRow}>
          {lesson.isCompleted ? (
            <View style={styles.badgeCompleted}>
              <Check size={iconSizes.lessonCheck} color={colors.bgPrimary} strokeWidth={iconStrokeWidth} />
            </View>
          ) : (
            <View style={styles.badgeLocked}>
              <Text allowFontScaling={false} style={styles.badgeNumText}>{lesson.order}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text
              allowFontScaling={false}
              style={[
                type.statusPill,
                { color: lesson.isCompleted ? colors.accentGreen : colors.textSecondary },
              ]}
            >
              {lesson.isCompleted ? 'Fullført' : 'Ikke lest'}
              {lesson.readingMinutes ? ` · ${lesson.readingMinutes} min` : ''}
            </Text>
            <Text allowFontScaling={false} style={[type.lessonTitle, { marginTop: 2 }]}>
              {lesson.title}
            </Text>
          </View>
          <ChevronRight size={iconSizes.chevron} color={colors.textSecondary} strokeWidth={iconStrokeWidth} />
        </View>
      </Card>
    </Pressable>
  );
}

function LessonReadModal({
  lesson,
  onClose,
}: {
  lesson: CourseLesson | null;
  onClose: () => void;
}) {
  const complete = useCompleteLesson();
  const lessonId = lesson?.id;
  const wasCompleted = lesson?.isCompleted ?? false;

  // Mark as complete on open if not already
  useEffect(() => {
    if (lessonId && !wasCompleted) {
      complete.mutate(lessonId, { onSuccess: () => successHaptic() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  return (
    <Modal
      visible={!!lesson}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
        <View style={styles.modalHeader}>
          <Pressable
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Lukk"
            style={styles.closeBtn}
          >
            <X size={iconSizes.chevron} color={colors.textSecondary} strokeWidth={iconStrokeWidth} />
          </Pressable>
        </View>
        {lesson ? (
          <ScrollView contentContainerStyle={styles.lessonContent}>
            <Text allowFontScaling={false} style={type.meta}>
              {lesson.readingMinutes ? `${lesson.readingMinutes} min lesing` : 'Leksjon'}
            </Text>
            <Text allowFontScaling={false} style={[type.heroTitle, { marginTop: 6, marginBottom: 14 }]}>
              {lesson.title}
            </Text>
            <MarkdownView source={lesson.body} />
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text allowFontScaling={false} style={type.cardTitle}>Ingen kurs enda</Text>
      <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>
        Kurs dukker opp her når de publiseres.
      </Text>
    </View>
  );
}

function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const msg = error instanceof ApiError ? error.messageNO : 'Noe gikk galt.';
  return (
    <View style={styles.empty}>
      <Text allowFontScaling={false} style={type.cardTitle}>Kunne ikke laste kurs</Text>
      <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>{msg}</Text>
      <Pressable onPress={onRetry} style={{ marginTop: spacing.xxl }}>
        <Text allowFontScaling={false} style={type.link}>Prøv igjen</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  mainHeader: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: 16,
    borderBottomWidth: borders.default,
    borderBottomColor: colors.border,
  },
  courseGrid: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: 16,
    gap: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalHeader: {
    paddingTop: 12,
    paddingHorizontal: layout.screenPaddingH,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  closeBtn: { padding: 4 },
  detailHeader: {
    paddingHorizontal: layout.screenPaddingH,
    paddingBottom: 16,
    borderBottomWidth: borders.default,
    borderBottomColor: colors.border,
  },
  moduleList: {
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: 16,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: borders.default,
    borderColor: colors.border,
  },
  lessonContent: {
    padding: layout.screenPaddingH,
    paddingBottom: 40,
  },
  lessonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badgeNext: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.accentGreen,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeLocked: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgPrimary,
    borderWidth: borders.default, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeCompleted: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.accentGreen,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeNumText: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.textSecondary },
  loading: { padding: 40, alignItems: 'center' },
  empty: { padding: 40, alignItems: 'center' },
});
