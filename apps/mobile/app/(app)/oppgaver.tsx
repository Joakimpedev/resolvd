import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { Plus, X, ArrowLeft, FileText } from 'lucide-react-native';
import {
  ScreenContainer, ScreenHeader, Card, Badge, Button, ErrorBoundary, MarkdownView,
} from '@/components';
import { colors, layout, spacing, radii, borders } from '@/theme/tokens';
import { type, fontFamily } from '@/theme/typography';
import { iconSizes, iconStrokeWidth } from '@/theme/icons';
import {
  useTasks, useTask, useCommentOnTaskEvent,
  useRequests, useRequest, useCreateRequest, useCommentOnRequest,
  type TaskSummary, type RequestSummary, type TaskDetail, type RequestDetail,
} from '@/lib/queries';
import { ApiError } from '@/lib/api';
import { relativeNo } from '@/lib/time';
import {
  taskStatusLabel, taskStatusVariant, requestStatusLabel, requestStatusVariant,
} from '@/lib/status';
import { successHaptic, errorHaptic, lightHaptic } from '@/lib/haptics';

type TabKey = 'oppgaver' | 'forespørsler';

const EVENT_PREVIEW_CHAR_LIMIT = 200;

export default function OppgaverScreen() {
  return (
    <ErrorBoundary>
      <OppgaverInner />
    </ErrorBoundary>
  );
}

function OppgaverInner() {
  const [tab, setTab] = useState<TabKey>('oppgaver');
  const tasks = useTasks();
  const requests = useRequests();
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);

  const refreshing = tab === 'oppgaver' ? tasks.isRefetching : requests.isRefetching;
  const onRefresh = () => (tab === 'oppgaver' ? tasks.refetch() : requests.refetch());

  const taskUnread = tasks.data?.tasks.filter((t) => t.hasUnread).length ?? 0;
  const requestUnread = requests.data?.requests.filter((r) => r.hasUnread).length ?? 0;

  return (
    <ScreenContainer scrollable refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenHeader label="OPPGAVER" title="Arbeid med oss">
        {tab === 'forespørsler' ? (
          <Button
            label="Ny forespørsel"
            size="small"
            icon={<Plus size={iconSizes.plus} color={colors.bgPrimary} strokeWidth={iconStrokeWidth} />}
            onPress={() => setShowNewRequest(true)}
          />
        ) : null}
      </ScreenHeader>

      <View style={styles.tabRow}>
        <TabChip
          label="Oppgaver"
          active={tab === 'oppgaver'}
          unread={taskUnread}
          onPress={() => { lightHaptic(); setTab('oppgaver'); }}
        />
        <TabChip
          label="Forespørsler"
          active={tab === 'forespørsler'}
          unread={requestUnread}
          onPress={() => { lightHaptic(); setTab('forespørsler'); }}
        />
      </View>

      {tab === 'oppgaver' ? (
        <TaskList query={tasks} onOpen={setOpenTaskId} />
      ) : (
        <RequestList query={requests} onOpen={setOpenRequestId} />
      )}

      <NewRequestModal visible={showNewRequest} onClose={() => setShowNewRequest(false)} />
      <TaskDetailModal taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
      <RequestDetailModal requestId={openRequestId} onClose={() => setOpenRequestId(null)} />
    </ScreenContainer>
  );
}

function TabChip({ label, active, unread, onPress }: {
  label: string; active: boolean; unread: number; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabChip, active && styles.tabChipActive]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text
        allowFontScaling={false}
        style={[styles.tabChipLabel, active && styles.tabChipLabelActive]}
      >
        {label}
      </Text>
      {unread > 0 ? <View style={styles.tabDot} /> : null}
    </Pressable>
  );
}

// ─── Task list ─────────────────────────────────────────────────
function TaskList({
  query, onOpen,
}: {
  query: ReturnType<typeof useTasks>;
  onOpen: (id: string) => void;
}) {
  if (query.isLoading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.accentGreen} /></View>;
  }
  if (query.error) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} what="oppgaver" />;
  }
  const items = query.data?.tasks ?? [];
  if (items.length === 0) {
    return (
      <View style={styles.emptyPad}>
        <Text allowFontScaling={false} style={type.cardTitle}>Ingen oppgaver enda</Text>
        <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>
          Oppgaver opprettes av Resolvd når vi starter arbeid for deg.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.body}>
      <View style={{ gap: 10 }}>
        {items.map((t) => <TaskRow key={t.id} task={t} onPress={() => onOpen(t.id)} />)}
      </View>
    </View>
  );
}

function TaskRow({ task, onPress }: { task: TaskSummary; onPress: () => void }) {
  const priceLabel =
    task.priceOre != null ? fmtNok(task.priceOre) : null;
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card>
        <View style={styles.cardTop}>
          <Badge variant={taskStatusVariant[task.status]} label={taskStatusLabel[task.status]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {task.hasUnread ? <View style={styles.unreadDot} /> : null}
            <Text allowFontScaling={false} style={type.metaSmall}>{relativeNo(task.lastActivityAt)}</Text>
          </View>
        </View>
        <Text allowFontScaling={false} style={[type.cardTitleSmall, { marginBottom: 4 }]}>
          {task.title}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
          <Text allowFontScaling={false} style={type.metaSmall}>
            {task.eventCount} {task.eventCount === 1 ? 'hendelse' : 'hendelser'}
          </Text>
          {task.assignees.length > 0 ? (
            <Text allowFontScaling={false} style={type.metaSmall}>
              · {task.assignees.map((a) => a.name.split(' ')[0]).join(', ')}
            </Text>
          ) : null}
          {priceLabel ? (
            <Text allowFontScaling={false} style={[type.metaSmall, { color: colors.accentGreen }]}>
              · {priceLabel}
            </Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

// ─── Request list ──────────────────────────────────────────────
function RequestList({
  query, onOpen,
}: {
  query: ReturnType<typeof useRequests>;
  onOpen: (id: string) => void;
}) {
  if (query.isLoading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.accentGreen} /></View>;
  }
  if (query.error) {
    return <ErrorState error={query.error} onRetry={() => query.refetch()} what="forespørsler" />;
  }
  const items = query.data?.requests ?? [];
  if (items.length === 0) {
    return (
      <View style={styles.emptyPad}>
        <Text allowFontScaling={false} style={type.cardTitle}>Ingen forespørsler enda</Text>
        <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>
          Trykk "Ny forespørsel" for å sende oss et spørsmål eller ønske.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.body}>
      <View style={{ gap: 10 }}>
        {items.map((r) => <RequestRow key={r.id} request={r} onPress={() => onOpen(r.id)} />)}
      </View>
    </View>
  );
}

function RequestRow({ request, onPress }: { request: RequestSummary; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card>
        <View style={styles.cardTop}>
          <Badge variant={requestStatusVariant[request.status]} label={requestStatusLabel[request.status]} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {request.hasUnread ? <View style={styles.unreadDot} /> : null}
            <Text allowFontScaling={false} style={type.metaSmall}>{relativeNo(request.lastActivityAt)}</Text>
          </View>
        </View>
        <Text allowFontScaling={false} style={[type.cardTitleSmall, { marginBottom: 4 }]}>
          {request.title}
        </Text>
        <Text allowFontScaling={false} style={type.metaSmall}>
          Fra {request.createdBy.name.split(' ')[0]} · {request.commentCount} {request.commentCount === 1 ? 'kommentar' : 'kommentarer'}
        </Text>
      </Card>
    </Pressable>
  );
}

// ─── Task detail modal ────────────────────────────────────────
function TaskDetailModal({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const detail = useTask(taskId ?? undefined);
  const [showDesc, setShowDesc] = useState(false);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const task = detail.data?.task;

  return (
    <Modal visible={!!taskId} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalOuter}>
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Lukk" accessibilityRole="button">
            <X size={iconSizes.modalClose} color={colors.textPrimary} strokeWidth={iconStrokeWidth} />
          </Pressable>
          <Text allowFontScaling={false} style={type.sectionLabel}>OPPGAVE</Text>
          <View style={{ width: iconSizes.modalClose }} />
        </View>

        {!task ? (
          <View style={styles.loading}><ActivityIndicator color={colors.accentGreen} /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.modalBody}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Badge variant={taskStatusVariant[task.status]} label={taskStatusLabel[task.status]} />
              {task.canSeePrice && task.priceOre != null ? (
                <Text allowFontScaling={false} style={[type.cardTitleSmall, { color: colors.accentGreen }]}>
                  {fmtNok(task.priceOre)}
                </Text>
              ) : null}
            </View>
            <Text allowFontScaling={false} style={[type.heroTitle, { marginBottom: 4 }]}>{task.title}</Text>
            {task.assignees.length > 0 ? (
              <Text allowFontScaling={false} style={[type.metaSmall, { marginBottom: 16 }]}>
                Tildelt: {task.assignees.map((a) => a.name).join(', ')}
              </Text>
            ) : null}

            <Pressable onPress={() => setShowDesc(true)} style={styles.descBtn} accessibilityRole="button">
              <FileText size={16} color={colors.textPrimary} strokeWidth={iconStrokeWidth} />
              <Text allowFontScaling={false} style={[type.body, { fontFamily: fontFamily.medium }]}>
                Se beskrivelse
              </Text>
            </Pressable>

            <Text allowFontScaling={false} style={[type.sectionLabel, { marginTop: 24, marginBottom: 10 }]}>
              TIDSLINJE
            </Text>

            {task.events.length === 0 ? (
              <Text allowFontScaling={false} style={type.body}>Ingen hendelser.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {task.events.map((ev) => (
                  <Pressable key={ev.id} onPress={() => setActiveEventId(ev.id)} accessibilityRole="button">
                    <Card>
                      <Text allowFontScaling={false} style={[type.cardTitleSmall, { marginBottom: 4 }]}>
                        {ev.header}
                      </Text>
                      {ev.body.trim() ? (
                        <Text
                          allowFontScaling={false}
                          style={[type.body, { marginBottom: 6 }]}
                          numberOfLines={3}
                          ellipsizeMode="tail"
                        >
                          {ev.body.length > EVENT_PREVIEW_CHAR_LIMIT
                            ? ev.body.slice(0, EVENT_PREVIEW_CHAR_LIMIT).trimEnd() + '…'
                            : ev.body}
                        </Text>
                      ) : null}
                      <Text allowFontScaling={false} style={type.metaSmall}>
                        {relativeNo(ev.createdAt)} · {ev.comments.length} {ev.comments.length === 1 ? 'kommentar' : 'kommentarer'}
                      </Text>
                    </Card>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <Modal visible={showDesc} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowDesc(false)}>
        <View style={styles.modalOuter}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowDesc(false)} hitSlop={8} accessibilityLabel="Tilbake">
              <ArrowLeft size={iconSizes.modalClose} color={colors.textPrimary} strokeWidth={iconStrokeWidth} />
            </Pressable>
            <Text allowFontScaling={false} style={type.sectionLabel}>BESKRIVELSE</Text>
            <View style={{ width: iconSizes.modalClose }} />
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text allowFontScaling={false} style={[type.heroTitle, { marginBottom: 12 }]}>{task?.title}</Text>
            <MarkdownView source={task?.descriptionMd ?? ''} />
          </ScrollView>
        </View>
      </Modal>

      <EventDetailModal
        task={task ?? null}
        eventId={activeEventId}
        onClose={() => setActiveEventId(null)}
      />
    </Modal>
  );
}

function EventDetailModal({
  task, eventId, onClose,
}: { task: TaskDetail | null; eventId: string | null; onClose: () => void }) {
  const ev = task?.events.find((e) => e.id === eventId) ?? null;
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const comment = useCommentOnTaskEvent();

  async function onSend() {
    if (!task || !ev || !reply.trim()) return;
    setError(null);
    try {
      await comment.mutateAsync({ taskId: task.id, eventId: ev.id, body: reply.trim() });
      successHaptic();
      setReply('');
    } catch (e) {
      errorHaptic();
      setError(e instanceof ApiError ? e.messageNO : 'Kunne ikke sende.');
    }
  }

  return (
    <Modal visible={!!eventId} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOuter}
      >
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={8}>
            <ArrowLeft size={iconSizes.modalClose} color={colors.textPrimary} strokeWidth={iconStrokeWidth} />
          </Pressable>
          <Text allowFontScaling={false} style={type.sectionLabel}>HENDELSE</Text>
          <View style={{ width: iconSizes.modalClose }} />
        </View>
        {!ev ? (
          <View style={styles.loading}><ActivityIndicator color={colors.accentGreen} /></View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text allowFontScaling={false} style={[type.heroTitle, { marginBottom: 4 }]}>{ev.header}</Text>
              <Text allowFontScaling={false} style={[type.metaSmall, { marginBottom: 14 }]}>
                {ev.createdBy.name} · {relativeNo(ev.createdAt)}
              </Text>
              {ev.body ? (
                <Text allowFontScaling={false} style={[type.body, { marginBottom: 20 }]}>
                  {ev.body}
                </Text>
              ) : null}

              <Text allowFontScaling={false} style={[type.sectionLabel, { marginBottom: 10 }]}>
                KOMMENTARER
              </Text>
              {ev.comments.length === 0 ? (
                <Text allowFontScaling={false} style={type.body}>Ingen kommentarer enda.</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {ev.comments.map((cm) => (
                    <View key={cm.id} style={styles.commentBubble}>
                      <Text allowFontScaling={false} style={[type.body, { fontFamily: fontFamily.medium }]}>
                        {cm.user.name}
                        <Text allowFontScaling={false} style={type.metaSmall}>  {relativeNo(cm.createdAt)}</Text>
                      </Text>
                      <Text allowFontScaling={false} style={[type.body, { marginTop: 2 }]}>{cm.body}</Text>
                    </View>
                  ))}
                </View>
              )}
              {error ? (
                <Text allowFontScaling={false} style={[type.body, { color: colors.amberBadgeText, marginTop: 12 }]}>
                  {error}
                </Text>
              ) : null}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TextInput
                style={[styles.input, { minHeight: 44 }]}
                value={reply}
                onChangeText={setReply}
                placeholder="Skriv en kommentar..."
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={2000}
              />
              <View style={{ height: 8 }} />
              <Button label="Send" disabled={!reply.trim()} loading={comment.isPending} onPress={onSend} />
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Request detail modal ─────────────────────────────────────
function RequestDetailModal({ requestId, onClose }: { requestId: string | null; onClose: () => void }) {
  const detail = useRequest(requestId ?? undefined);
  const r = detail.data?.request;
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  const comment = useCommentOnRequest();

  async function onSend() {
    if (!r || !reply.trim()) return;
    setError(null);
    try {
      await comment.mutateAsync({ requestId: r.id, body: reply.trim() });
      successHaptic();
      setReply('');
    } catch (e) {
      errorHaptic();
      setError(e instanceof ApiError ? e.messageNO : 'Kunne ikke sende.');
    }
  }

  return (
    <Modal visible={!!requestId} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOuter}
      >
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} hitSlop={8}>
            <X size={iconSizes.modalClose} color={colors.textPrimary} strokeWidth={iconStrokeWidth} />
          </Pressable>
          <Text allowFontScaling={false} style={type.sectionLabel}>FORESPØRSEL</Text>
          <View style={{ width: iconSizes.modalClose }} />
        </View>
        {!r ? (
          <View style={styles.loading}><ActivityIndicator color={colors.accentGreen} /></View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.modalBody}>
              <Badge variant={requestStatusVariant[r.status]} label={requestStatusLabel[r.status]} />
              <Text allowFontScaling={false} style={[type.heroTitle, { marginTop: 8, marginBottom: 4 }]}>{r.title}</Text>
              <Text allowFontScaling={false} style={[type.metaSmall, { marginBottom: 14 }]}>
                Fra {r.createdBy.name} · {relativeNo(r.createdAt)}
              </Text>
              <View style={styles.descBlock}>
                <Text allowFontScaling={false} style={type.body}>{r.description}</Text>
              </View>

              <Text allowFontScaling={false} style={[type.sectionLabel, { marginTop: 20, marginBottom: 10 }]}>
                KOMMENTARER
              </Text>
              {r.comments.length === 0 ? (
                <Text allowFontScaling={false} style={type.body}>Ingen kommentarer enda.</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {r.comments.map((cm) => (
                    <View key={cm.id} style={styles.commentBubble}>
                      <Text allowFontScaling={false} style={[type.body, { fontFamily: fontFamily.medium }]}>
                        {cm.user.name}
                        {cm.user.role === 'ADMIN' ? (
                          <Text allowFontScaling={false} style={[type.metaSmall, { color: colors.accentGreen }]}>  · Resolvd</Text>
                        ) : null}
                        <Text allowFontScaling={false} style={type.metaSmall}>  {relativeNo(cm.createdAt)}</Text>
                      </Text>
                      <Text allowFontScaling={false} style={[type.body, { marginTop: 2 }]}>{cm.body}</Text>
                    </View>
                  ))}
                </View>
              )}
              {error ? (
                <Text allowFontScaling={false} style={[type.body, { color: colors.amberBadgeText, marginTop: 12 }]}>
                  {error}
                </Text>
              ) : null}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TextInput
                style={[styles.input, { minHeight: 44 }]}
                value={reply}
                onChangeText={setReply}
                placeholder="Svar..."
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={2000}
              />
              <View style={{ height: 8 }} />
              <Button label="Send" disabled={!reply.trim()} loading={comment.isPending} onPress={onSend} />
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── New request modal ────────────────────────────────────────
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

// ─── Shared ────────────────────────────────────────────────────
function ErrorState({ error, onRetry, what }: { error: unknown; onRetry: () => void; what: string }) {
  const msg = error instanceof ApiError ? error.messageNO : 'Noe gikk galt.';
  return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <Text allowFontScaling={false} style={type.cardTitle}>Kunne ikke laste {what}</Text>
      <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>{msg}</Text>
      <Pressable onPress={onRetry} style={{ marginTop: spacing.xxl }} accessibilityRole="button">
        <Text allowFontScaling={false} style={type.link}>Prøv igjen</Text>
      </Pressable>
    </View>
  );
}

function fmtNok(ore: number): string {
  const kr = ore / 100;
  return kr.toLocaleString('no-NO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' kr';
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: layout.screenPaddingH, paddingVertical: 16 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: layout.screenPaddingH,
    marginTop: 8,
    marginBottom: 8,
    gap: 8,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: borders.default,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabChipActive: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen,
  },
  tabChipLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.textPrimary,
  },
  tabChipLabelActive: {
    color: colors.bgPrimary,
  },
  tabDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.amberBadgeText,
  },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.accentGreen,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  loading: { padding: 40, alignItems: 'center' },
  emptyPad: { padding: 40, alignItems: 'center' },
  descBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: borders.default,
    borderColor: colors.border,
    borderRadius: radii.listItem,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
  },
  descBlock: {
    padding: 12,
    borderRadius: radii.listItem,
    backgroundColor: colors.surface,
    borderWidth: borders.default,
    borderColor: colors.border,
  },
  commentBubble: {
    padding: 10,
    borderRadius: radii.listItem,
    backgroundColor: colors.surface,
    borderWidth: borders.default,
    borderColor: colors.border,
  },
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
