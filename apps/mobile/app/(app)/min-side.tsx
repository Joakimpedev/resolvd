import { Alert, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { ScreenContainer, Card, Avatar, SectionLabel, ErrorBoundary } from '@/components';
import { colors, layout, spacing, radii, borders } from '@/theme/tokens';
import { type, fontFamily } from '@/theme/typography';
import { iconSizes, iconStrokeWidth } from '@/theme/icons';
import {
  useMe, useStats, useSolutions, useTeam, useDeleteAccount,
  type MeSolution, type TeamMember, type Stats, type Me,
} from '@/lib/queries';
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

        <ActivitySection stats={stats.data} />

        <SolutionsSection solutions={solutions.data?.solutions ?? []} loading={solutions.isLoading} />

        <TeamSection members={team.data?.members ?? []} />

        <SettingsSection me={me.data} />
      </View>
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
              {me.company.name}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ─── Activity ────────────────────────────────────────────────────

function ActivitySection({ stats }: { stats?: Stats }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <SectionLabel style={{ marginBottom: 10 }}>DIN AKTIVITET</SectionLabel>
      <View style={styles.statsGrid}>
        <StatCard number={stats?.runsThisWeek ?? 0} label="Kjøringer denne uken" />
        <StatCard number={stats?.activeTasks ?? 0} label="Aktive oppgaver" />
        <StatCard number={stats?.lessonsCompleted ?? 0} label="Leksjoner fullført" />
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
      <SectionLabel style={{ marginBottom: 10 }}>OPPGAVER FOR DEG</SectionLabel>
      {loading ? (
        <ActivityIndicator color={colors.accentGreen} />
      ) : solutions.length === 0 ? (
        <Card padding={12}>
          <Text allowFontScaling={false} style={type.body}>
            Ingen oppgaver enda. Første oppgave settes opp sammen med deg.
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

function TeamSection({ members }: { members: TeamMember[] }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <SectionLabel style={{ marginBottom: 10 }}>TEAMET MITT</SectionLabel>

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
      ? 'Er du sikker? Kontoen din blir fjernet. Hvis du er eneste medlem av bedriften, slettes også bedriftens data (meldinger, løsninger). Hvis det er andre ansatte, går eier-rollen til eldste ansatte. Dette kan ikke angres.'
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
    { label: 'Bedriftsinformasjon', onPress: () => {} },
    { label: 'Notifikasjoner',      onPress: () => {} },
    { label: 'Språk',               onPress: () => {} },
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
  memberRow: { flexDirection: 'row', alignItems: 'center' },
  settingRow: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingRowDivider: { borderBottomWidth: borders.default, borderBottomColor: colors.border },
});
