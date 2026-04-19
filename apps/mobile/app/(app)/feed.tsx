import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { Bookmark, BookmarkCheck } from 'lucide-react-native';
import { ScreenContainer, Logo, Avatar, SegmentedToggle, Card, ErrorBoundary } from '@/components';
import { colors, layout, spacing, borders } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { iconSizes, iconStrokeWidth } from '@/theme/icons';
import { useMe, useFeedPosts, useMarkPostRead, useToggleBookmark, type FeedPost, type Me } from '@/lib/queries';
import { ApiError } from '@/lib/api';
import { lightHaptic } from '@/lib/haptics';
import { useUIStore } from '@/store/ui';

export default function Feed() {
  return (
    <ErrorBoundary>
      <FeedInner />
    </ErrorBoundary>
  );
}

function FeedInner() {
  const scope = useUIStore(s => s.feedScope);
  const setScope = useUIStore(s => s.setFeedScope);
  const me = useMe();
  const feed = useFeedPosts(scope);
  const markRead = useMarkPostRead();
  const toggleBookmark = useToggleBookmark();

  const industry = me.data?.company?.industry ?? '';
  const greeting = useGreeting();
  const newPostsCount = feed.data?.posts.filter(p => !p.isRead).length ?? 0;

  return (
    <ScreenContainer
      scrollable={false}
      refreshing={feed.isRefetching}
      onRefresh={() => feed.refetch()}
    >
      <Header
        me={me.data}
        greeting={greeting}
        newPostsCount={newPostsCount}
        industry={industry}
        scope={scope}
        onScopeChange={setScope}
      />

      {feed.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentGreen} />
        </View>
      ) : feed.error ? (
        <ErrorState error={feed.error} onRetry={() => feed.refetch()} />
      ) : feed.data?.posts.length === 0 ? (
        <EmptyState industry={industry} />
      ) : (
        <FlatList
          data={feed.data!.posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPress={() => {
                if (!item.isRead) markRead.mutate(item.id);
              }}
              onBookmark={() => {
                lightHaptic();
                toggleBookmark.mutate(item.id);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          refreshing={feed.isRefetching}
          onRefresh={() => feed.refetch()}
        />
      )}
    </ScreenContainer>
  );
}

function useGreeting(): string {
  const h = new Date().getHours();
  if (h < 10) return 'God morgen';
  if (h < 17) return 'God dag';
  return 'God kveld';
}

function pluralizeNewPosts(count: number, industry: string): string {
  const ind = industry.toLowerCase();
  if (count === 0) return `Ingen nye innlegg for ${ind} i dag`;
  if (count === 1) return `1 nytt innlegg for ${ind} i dag`;
  return `${count} nye innlegg for ${ind} i dag`;
}

function Header({
  me,
  greeting,
  newPostsCount,
  industry,
  scope,
  onScopeChange,
}: {
  me?: Me;
  greeting: string;
  newPostsCount: number;
  industry: string;
  scope: 'industry' | 'all';
  onScopeChange: (s: 'industry' | 'all') => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <Logo />
        {me ? <Avatar initial={me.avatarInitial} size={32} variant="owner" /> : null}
      </View>

      <View style={{ marginTop: 14 }}>
        <Text allowFontScaling={false} style={type.greeting}>
          {greeting}
          {me?.name ? `, ${me.name.split(' ')[0]}` : ''}
        </Text>
        <Text allowFontScaling={false} style={[type.body, { marginTop: 2 }]}>
          {pluralizeNewPosts(newPostsCount, industry || 'bransjen din')}
        </Text>
      </View>

      {industry ? (
        <View style={{ marginTop: 14 }}>
          <SegmentedToggle
            value={scope}
            options={[
              { value: 'industry', label: `For ${industry.toLowerCase()}` },
              { value: 'all', label: 'Alle' },
            ]}
            onChange={(v) => onScopeChange(v as 'industry' | 'all')}
          />
        </View>
      ) : null}
    </View>
  );
}

function PostCard({
  post,
  onPress,
  onBookmark,
}: {
  post: FeedPost;
  onPress: () => void;
  onBookmark: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${post.title}${post.category ? `, ${post.category}` : ''}${
        post.readingMinutes ? `, ${post.readingMinutes} minutter lesing` : ''
      }`}
      style={({ pressed }) => [{ opacity: post.isRead ? 0.85 : 1 }, pressed && { opacity: 0.75 }]}
    >
      <Card>
        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            {!post.isRead ? <View style={styles.unreadDot} /> : null}
            <Text allowFontScaling={false} style={type.meta}>
              {[post.category, post.readingMinutes ? `${post.readingMinutes} min lesing` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <Pressable
            onPress={onBookmark}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={post.isBookmarked ? 'Fjern bokmerke' : 'Legg til bokmerke'}
          >
            {post.isBookmarked ? (
              <BookmarkCheck
                size={iconSizes.bookmark}
                color={colors.accentGreen}
                strokeWidth={iconStrokeWidth}
                fill={colors.accentGreen}
              />
            ) : (
              <Bookmark
                size={iconSizes.bookmark}
                color={colors.textSecondary}
                strokeWidth={iconStrokeWidth}
              />
            )}
          </Pressable>
        </View>
        <Text allowFontScaling={false} style={[type.cardTitle, { marginBottom: 8 }]}>
          {post.title}
        </Text>
        <Text allowFontScaling={false} style={type.body} numberOfLines={3}>
          {post.body}
        </Text>
      </Card>
    </Pressable>
  );
}

function EmptyState({ industry }: { industry: string }) {
  return (
    <View style={styles.empty}>
      <Text allowFontScaling={false} style={type.cardTitle}>Ingen innlegg enda</Text>
      <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>
        Nye innlegg dukker opp her når Resolvd publiserer dem
        {industry ? ` for ${industry.toLowerCase()}` : ''}.
      </Text>
    </View>
  );
}

function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const msg = error instanceof ApiError ? error.messageNO : 'Noe gikk galt.';
  return (
    <View style={styles.empty}>
      <Text allowFontScaling={false} style={type.cardTitle}>Kunne ikke laste feed</Text>
      <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>
        {msg}
      </Text>
      <Pressable onPress={onRetry} style={{ marginTop: spacing.xxl }} accessibilityRole="button">
        <Text allowFontScaling={false} style={type.link}>Prøv igjen</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: 16,
    borderBottomWidth: borders.default,
    borderBottomColor: colors.border,
    backgroundColor: colors.bgPrimary,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentGreen,
  },
  listContent: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: 16,
  },
  loading: { paddingTop: 40, alignItems: 'center' },
  empty: { padding: 40, alignItems: 'center' },
});
