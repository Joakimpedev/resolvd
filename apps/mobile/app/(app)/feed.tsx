import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { Bookmark, BookmarkCheck, X } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { ScreenContainer, Logo, Avatar, Card, ErrorBoundary, ScopeBadges, MarkdownView } from '@/components';
import { colors, layout, spacing, borders } from '@/theme/tokens';
import { type } from '@/theme/typography';
import { iconSizes, iconStrokeWidth } from '@/theme/icons';
import { useMe, useFeedPosts, useMarkPostRead, useToggleBookmark, type FeedPost, type Me } from '@/lib/queries';
import { ApiError } from '@/lib/api';
import { lightHaptic } from '@/lib/haptics';

export default function Feed() {
  return (
    <ErrorBoundary>
      <FeedInner />
    </ErrorBoundary>
  );
}

function FeedInner() {
  const me = useMe();
  const feed = useFeedPosts();
  const markRead = useMarkPostRead();
  const toggleBookmark = useToggleBookmark();

  const greeting = useGreeting();
  const newPostsCount = feed.data?.posts.filter(p => !p.isRead).length ?? 0;

  const { refetch: refetchFeed } = feed;
  const { refetch: refetchMe } = me;
  useFocusEffect(useCallback(() => {
    refetchFeed();
    refetchMe();
  }, [refetchFeed, refetchMe]));

  const viewerCompanyId = me.data?.company?.id ?? null;
  const viewerTagIds = me.data?.tags.map(t => t.id) ?? [];

  const [openPostId, setOpenPostId] = useState<string | null>(null);
  const openPost = feed.data?.posts.find(p => p.id === openPostId) ?? null;

  const onOpenPost = (post: FeedPost) => {
    setOpenPostId(post.id);
    if (!post.isRead) markRead.mutate(post.id);
  };

  return (
    <ScreenContainer
      scrollable={false}
      refreshing={feed.isRefetching}
      onRefresh={() => feed.refetch()}
    >
      <Header me={me.data} greeting={greeting} newPostsCount={newPostsCount} />

      {feed.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accentGreen} />
        </View>
      ) : feed.error ? (
        <ErrorState error={feed.error} onRetry={() => feed.refetch()} />
      ) : feed.data?.posts.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={feed.data!.posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              viewerCompanyId={viewerCompanyId}
              viewerTagIds={viewerTagIds}
              onPress={() => onOpenPost(item)}
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

      <ArticleModal
        post={openPost}
        viewerCompanyId={viewerCompanyId}
        viewerTagIds={viewerTagIds}
        onClose={() => setOpenPostId(null)}
        onBookmark={(id) => { lightHaptic(); toggleBookmark.mutate(id); }}
      />
    </ScreenContainer>
  );
}

function useGreeting(): string {
  const h = new Date().getHours();
  if (h < 10) return 'God morgen';
  if (h < 17) return 'God dag';
  return 'God kveld';
}

function pluralizeNewPosts(count: number): string {
  if (count === 0) return 'Ingen nye innlegg i dag';
  if (count === 1) return '1 nytt innlegg i dag';
  return `${count} nye innlegg i dag`;
}

function Header({
  me,
  greeting,
  newPostsCount,
}: {
  me?: Me;
  greeting: string;
  newPostsCount: number;
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
          {pluralizeNewPosts(newPostsCount)}
        </Text>
      </View>
    </View>
  );
}

function PostCard({
  post,
  viewerCompanyId,
  viewerTagIds,
  onPress,
  onBookmark,
}: {
  post: FeedPost;
  viewerCompanyId: string | null;
  viewerTagIds: string[];
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
        <ScopeBadges
          everyone={post.everyone}
          companies={post.companies}
          tags={post.tags}
          viewerCompanyId={viewerCompanyId}
          viewerTagIds={viewerTagIds}
        />
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

// ─── Article detail modal ────────────────────────────────────────

function ArticleModal({
  post,
  viewerCompanyId,
  viewerTagIds,
  onClose,
  onBookmark,
}: {
  post: FeedPost | null;
  viewerCompanyId: string | null;
  viewerTagIds: string[];
  onClose: () => void;
  onBookmark: (id: string) => void;
}) {
  return (
    <Modal
      visible={!!post}
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
            style={{ padding: 4 }}
          >
            <X size={iconSizes.chevron} color={colors.textSecondary} strokeWidth={iconStrokeWidth} />
          </Pressable>
          {post ? (
            <Pressable
              onPress={() => onBookmark(post.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={post.isBookmarked ? 'Fjern bokmerke' : 'Legg til bokmerke'}
              style={{ padding: 4 }}
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
          ) : null}
        </View>

        {post ? (
          <ScrollView contentContainerStyle={styles.articleContent}>
            <Text allowFontScaling={false} style={type.meta}>
              {[post.category, post.readingMinutes ? `${post.readingMinutes} min lesing` : null]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <Text allowFontScaling={false} style={[type.heroTitle, { marginTop: 6, marginBottom: 12 }]}>
              {post.title}
            </Text>
            <ScopeBadges
              everyone={post.everyone}
              companies={post.companies}
              tags={post.tags}
              viewerCompanyId={viewerCompanyId}
              viewerTagIds={viewerTagIds}
            />
            <View style={{ height: 6 }} />
            <MarkdownView source={post.body} />
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text allowFontScaling={false} style={type.cardTitle}>Ingen innlegg enda</Text>
      <Text allowFontScaling={false} style={[type.body, { marginTop: 6, textAlign: 'center' }]}>
        Nye innlegg dukker opp her når Resolvd publiserer dem.
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
  modalHeader: {
    paddingTop: 12,
    paddingHorizontal: layout.screenPaddingH,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleContent: {
    padding: layout.screenPaddingH,
    paddingBottom: 40,
  },
});
