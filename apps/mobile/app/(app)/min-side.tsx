import { useState } from 'react';
import { Alert, View, Text, Pressable, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { ChevronRight, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, Card, Avatar, Button, SectionLabel, ProgressBar, ErrorBoundary } from '@/components';
import { colors, layout, spacing, radii, borders } from '@/theme/tokens';
import { type, fontFamily } from '@/theme/typography';
import { iconSizes, iconStrokeWidth } from '@/theme/icons';
import {
  useMe, useStats, useSolutions, useTeam, useInvite, useDeleteAccount,
  type MeSolution, type TeamMember, type TeamInvitation, type Stats, type Me,
} from '@/lib/queries';
import { ApiError } from '@/lib/api';
import { signOut } from '@/lib/auth';
import { lightHaptic, successHaptic, errorHaptic } from '@/lib/haptics';

export default function MinSide() {
  return (
    <ErrorBoundary>
      <MinSideInner />
    </ErrorBoundary>
  );
}

function MinSideInner() {
  const me = useMe();
  const stats = useStats();
  const solutions = useSolutions();
  const team = useTeam();

  const refreshing = stats.isRefetching || solutions.isRefetching || team.isRefetching || me.isRefetching;
  const onRefresh = () => {
    stats.refetch();
    solutions.refetch();
    team.refetch();
    me.refetch();
  };

  const anyError = !!(stats.error || solutions.error || team.error || me.error);
  const allLoading = me.isLoading && stats.isLoading && solutions.isLoading && team.isLoading;

  const [showInvite, setShowInvite] = useState(false);

  if (anyError && allLoading) {
    return (
      <ScreenContainer scrollable={false}>
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text allowFontScaling={false} style={type.cardTitle}>Kunne ikke laste Min side</Text>
          <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>
            Sjekk nettet og prøv igjen.
          </Text>
          <Pressable onPress={onRefresh} style={{ marginTop: spacing.xxl }} accessibilityRole="button">
            <Text allowFontScaling={false} style={type.link}>Prøv igjen</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scrollable refreshing={refreshing} onRefresh={onRefresh}>
      <Header me={me.data} />

      <View style={styles.body}>
        {anyError && (
          <View style={styles.sectionError}>
            <Text allowFontScaling={false} style={type.body}>Noen data kunne ikke lastes.</Text>
            <Pressable onPress={onRefresh} accessibilityRole="button">
              <Text allowFontScaling={false} style={[type.link, { marginTop: 4 }]}>Last inn på nytt</Text>
            </Pressable>
          </View>
        )}

        <ActivitySection
          stats={stats.data}
          lessonsCompleted={stats.data?.lessonsCompleted ?? 0}
          lessonsTotal={stats.data?.aiSkolenTotal ?? 0}
        />

        <SolutionsSection solutions={solutions.data?.solutions ?? []} loading={solutions.isLoading} />

        <TeamSection
          members={team.data?.members ?? []}
          invitations={team.data?.invitations ?? []}
          canInvite={team.data?.canInvite ?? false}
          onInvite={() => setShowInvite(true)}
        />

        <SettingsSection me={me.data} />
      </View>

      <InviteModal visible={showInvite} onClose={() => setShowInvite(false)} />
    </ScreenContainer>
  );
}

// ─── Header ──────────────────────────────────────────────────────

function Header({ me }: { me: Me | undefined }) {
  if (!me) return <View style={styles.headerPlaceholder} />;
  return (
    <View style={styles.header}>
      <Text allowFontScaling={false} style={[type.sectionLabel, { marginBottom: 10 }]}>
        MIN SIDE
      </Text>
      <View style={styles.profileRow}>
        <Avatar initial={me.avatarInitial} size={52} variant="owner" />
        <View style={{ marginLeft: 14, flex: 1 }}>
          <Text allowFontScaling={false} style={type.greeting}>{me.name}</Text>
          {me.company ? (
            <Text allowFontScaling={false} style={[type.body, { marginTop: 2 }]}>
              {me.company.name} · {me.company.industry}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ─── Activity ────────────────────────────────────────────────────

function ActivitySection({
  stats,
  lessonsCompleted,
  lessonsTotal,
}: {
  stats?: Stats;
  lessonsCompleted: number;
  lessonsTotal: number;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <SectionLabel style={{ marginBottom: 10 }}>DIN AKTIVITET</SectionLabel>
      <View style={styles.statsGrid}>
        <StatCard number={stats?.runsThisWeek ?? 0} label="Kjøringer denne uken" />
        <StatCard number={stats?.activeRequests ?? 0} label="Aktive forespørsler" />
        <StatCard number={stats?.lessonsCompleted ?? 0} label="Leksjoner fullført" />
      </View>
      <View style={{ marginTop: 14 }}>
        <Card padding={14}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text allowFontScaling={false} style={[type.rowText, { fontFamily: fontFamily.medium }]}>
              AI-skolen
            </Text>
            <Text allowFontScaling={false} style={type.progressCount}>
              {lessonsTotal > 0 ? `${lessonsCompleted} / ${lessonsTotal}` : '—'}
            </Text>
          </View>
          <ProgressBar value={lessonsTotal > 0 ? lessonsCompleted / lessonsTotal : 0} />
        </Card>
      </View>
    </View>
  );
}

function StatCard({ number, label }: { number: number; label: string }) {
  return (
    <View style={styles.statCard}>
      <Text allowFontScaling={false} style={type.statNumber}>{number}</Text>
      <Text allowFontScaling={false} style={[type.statLabel, { marginTop: 6 }]}>{label}</Text>
    </View>
  );
}

// ─── Solutions ──────────────────────────────────────────────────

function SolutionsSection({ solutions, loading }: { solutions: MeSolution[]; loading: boolean }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <SectionLabel style={{ marginBottom: 10 }}>MINE AI-LØSNINGER</SectionLabel>
      {loading ? (
        <ActivityIndicator color={colors.accentGreen} />
      ) : solutions.length === 0 ? (
        <Card padding={12}>
          <Text allowFontScaling={false} style={type.body}>
            Ingen løsninger enda. Vi setter opp første løsning sammen.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          {solutions.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => {
                lightHaptic();
              }}
              accessibilityRole="button"
              accessibilityLabel={s.name}
            >
              <Card padding={12} radius="listItem">
                <View style={styles.solutionRow}>
                  <View style={{ flex: 1 }}>
                    <Text
                      allowFontScaling={false}
                      style={[type.rowText, { fontFamily: fontFamily.medium }]}
                    >
                      {s.name}
                    </Text>
                    <Text allowFontScaling={false} style={[type.meta, { marginTop: 2 }]}>
                      {formatSolutionSubtitle(s)}
                    </Text>
                  </View>
                  <ChevronRight
                    size={iconSizes.chevron}
                    color={colors.textSecondary}
                    strokeWidth={iconStrokeWidth}
                  />
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function formatSolutionSubtitle(s: MeSolution): string {
  if (s.subtitle && s.subtitle.trim().length > 0) return s.subtitle;
  const statusText = s.status === 'ACTIVE' ? 'Aktiv' : 'Inaktiv';
  return `${statusText} · ${s.usageCountWeek} kjøringer i uken`;
}

// ─── Team ────────────────────────────────────────────────────────

function TeamSection({
  members,
  invitations,
  canInvite,
  onInvite,
}: {
  members: TeamMember[];
  invitations: TeamInvitation[];
  canInvite: boolean;
  onInvite: () => void;
}) {
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={styles.teamHeader}>
        <SectionLabel>TEAMET MITT</SectionLabel>
        {canInvite ? (
          <Pressable
            onPress={() => {
              lightHaptic();
              onInvite();
            }}
            accessibilityRole="button"
            accessibilityLabel="Inviter kollega"
          >
            <Text allowFontScaling={false} style={type.link}>Inviter kollega</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ gap: 8 }}>
        {members.map((m) => (
          <Card key={m.id} padding={12} radius="listItem">
            <View style={styles.memberRow}>
              <Avatar
                initial={m.avatarInitial}
                size={32}
                variant={m.role === 'OWNER' ? 'owner' : 'employee'}
              />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  allowFontScaling={false}
                  style={[type.rowText, { fontFamily: fontFamily.medium }]}
                >
                  {m.name}
                </Text>
                <Text allowFontScaling={false} style={[type.meta, { marginTop: 2 }]}>
                  {m.role === 'OWNER' ? 'Eier' : 'Ansatt'}
                  {m.isSelf ? ' · deg' : ''}
                </Text>
              </View>
            </View>
          </Card>
        ))}

        {invitations.map((inv) => (
          <Card key={inv.id} padding={12} radius="listItem">
            <View style={styles.memberRow}>
              <Avatar initial="?" size={32} variant="pending" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  allowFontScaling={false}
                  style={[type.rowText, { fontFamily: fontFamily.medium }]}
                >
                  {inv.invitedIdentifier}
                </Text>
                <Text
                  allowFontScaling={false}
                  style={[type.meta, { marginTop: 2, color: colors.amberBadgeText }]}
                >
                  Venter på godkjenning fra Resolvd
                </Text>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </View>
  );
}

// ─── Settings ────────────────────────────────────────────────────

function SettingsSection({ me }: { me: Me | undefined }) {
  const router = useRouter();
  const qc = useQueryClient();
  const deleteAccount = useDeleteAccount();
  const isOwner = me?.role === 'OWNER';

  async function onSignOut() {
    try {
      await signOut();
    } catch {
      /* ignore — still clear locally */
    }
    qc.clear();
    router.replace('/(auth)/login');
  }

  function confirmDelete() {
    const body = isOwner
      ? 'Er du sikker? Kontoen din blir fjernet. Hvis du er eneste medlem av bedriften, slettes også bedriftens data (meldinger, løsninger, invitasjoner). Hvis det er andre ansatte, går eier-rollen til eldste ansatte. Dette kan ikke angres.'
      : 'Er du sikker? Kontoen din blir fjernet fra bedriften. Dine personlige data (fullførte leksjoner, bokmerker) slettes. Dette kan ikke angres.';
    Alert.alert('Slett konto', body, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Slett',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount.mutateAsync();
            successHaptic();
            qc.clear();
            router.replace('/(auth)/login');
          } catch {
            errorHaptic();
            Alert.alert('Feil', 'Kunne ikke slette kontoen. Prøv igjen.');
          }
        },
      },
    ]);
  }

  const group1 = [
    { label: 'Bedriftsinformasjon',   onPress: () => {} },
    { label: 'Bransje og interesser', onPress: () => {} },
    { label: 'Notifikasjoner',        onPress: () => {} },
    { label: 'Språk',                 onPress: () => {} },
  ];

  return (
    <View>
      <SectionLabel style={{ marginBottom: 10 }}>INNSTILLINGER</SectionLabel>

      <Card padding={0} radius="listItem">
        {group1.map((row, i) => (
          <SettingRow
            key={row.label}
            label={row.label}
            onPress={row.onPress}
            showDivider={i < group1.length - 1}
          />
        ))}
      </Card>

      <View style={{ marginTop: 12 }}>
        <Card padding={0} radius="listItem">
          <SettingRow label="Hjelp og FAQ" onPress={() => {}} showDivider={false} />
        </Card>
      </View>

      <View style={{ marginTop: 12 }}>
        <Card padding={0} radius="listItem">
          <SettingRow label="Logg ut" onPress={onSignOut} muted chevronHidden />
        </Card>
      </View>

      <View style={{ marginTop: 12 }}>
        <Card padding={0} radius="listItem">
          <SettingRow label="Slett konto" onPress={confirmDelete} muted chevronHidden />
        </Card>
      </View>
    </View>
  );
}

function SettingRow({
  label,
  onPress,
  showDivider = true,
  muted = false,
  chevronHidden = false,
}: {
  label: string;
  onPress: () => void;
  showDivider?: boolean;
  muted?: boolean;
  chevronHidden?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        lightHaptic();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.settingRow, showDivider && styles.settingRowDivider]}>
        <Text
          allowFontScaling={false}
          style={[type.rowText, muted && { color: colors.textSecondary }]}
        >
          {label}
        </Text>
        {!chevronHidden ? (
          <ChevronRight
            size={iconSizes.chevron}
            color={colors.textSecondary}
            strokeWidth={iconStrokeWidth}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

// ─── Invite Modal ────────────────────────────────────────────────

function InviteModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [identifier, setIdentifier] = useState('');
  const invite = useInvite();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!identifier.trim()) return;
    setError(null);
    try {
      await invite.mutateAsync(identifier.trim());
      successHaptic();
      setIdentifier('');
      onClose();
    } catch (e) {
      errorHaptic();
      const msg = e instanceof ApiError ? e.messageNO : 'Kunne ikke sende invitasjon.';
      setError(msg);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: colors.bgPrimary }}
      >
        <View style={styles.modalHeader}>
          <Text allowFontScaling={false} style={type.heroTitle}>Inviter kollega</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Lukk" accessibilityRole="button">
            <X size={iconSizes.modalClose} color={colors.textPrimary} strokeWidth={iconStrokeWidth} />
          </Pressable>
        </View>
        <View style={{ padding: layout.screenPaddingH, flex: 1 }}>
          <Text allowFontScaling={false} style={[type.bodyLarge, { marginBottom: spacing.between }]}>
            Skriv inn e-post eller telefonnummer. Resolvd godkjenner invitasjonen før tilgangen aktiveres.
          </Text>
          <Text allowFontScaling={false} style={[type.sectionLabel, { marginBottom: 4 }]}>
            E-POST ELLER TELEFON
          </Text>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="navn@bedrift.no eller +47 ..."
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            textContentType="emailAddress"
            autoComplete="email"
          />
          {error ? (
            <Text
              allowFontScaling={false}
              style={[type.body, { color: colors.amberBadgeText, marginTop: 8 }]}
            >
              {error}
            </Text>
          ) : null}

          <View style={{ marginTop: 'auto', paddingVertical: 20 }}>
            <Button
              label="Send invitasjon"
              disabled={!identifier.trim() || invite.isPending}
              loading={invite.isPending}
              onPress={onSubmit}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: 16,
    borderBottomWidth: borders.default,
    borderBottomColor: colors.border,
  },
  headerPlaceholder: { height: 120 },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  body: { paddingHorizontal: layout.screenPaddingH, paddingVertical: 16 },
  sectionError: {
    backgroundColor: colors.amberBadgeBg,
    padding: 12,
    borderRadius: radii.listItem,
    marginBottom: 16,
  },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: borders.default,
    borderColor: colors.border,
    borderRadius: radii.listItem,
    padding: 12,
  },
  solutionRow: { flexDirection: 'row', alignItems: 'center' },
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  settingRow: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingRowDivider: { borderBottomWidth: borders.default, borderBottomColor: colors.border },
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
});
