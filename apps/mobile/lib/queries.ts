import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// ─── Types ─────────────────────────────────────────────────────

export type Me = {
  id: string;
  email: string;
  name: string;
  avatarInitial: string;
  role: 'ADMIN' | 'OWNER' | 'EMPLOYEE';
  company: { id: string; name: string; industry: string } | null;
  tags: { id: string; name: string; kind: 'INDUSTRY' | 'CUSTOM' }[];
  onboardingDone: boolean;
  userLevel: 'BEGINNER' | 'INTER' | 'ADVANCED' | null;
};

export type FeedPost = {
  id: string;
  kind: 'ARTICLE' | 'LESSON' | 'UPDATE' | 'BROADCAST';
  title: string;
  body: string;
  category: string | null;
  readingMinutes: number | null;
  publishedAt: string;
  isRead: boolean;
  isBookmarked: boolean;
};

export type RequestStatus = 'I_ARBEID' | 'VENTER_PA_DEG' | 'FERDIG';

export type UserRequest = {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
};

export type Lesson = {
  id: string;
  title: string;
  readingMinutes: number | null;
  order: number;
  isCompleted: boolean;
  isNext: boolean;
  isLocked: boolean;
};

export type LessonsResponse = {
  lessons: Lesson[];
  level: 'BEGINNER' | 'INTER' | 'ADVANCED';
  totalCount: number;
  completedCount: number;
};

export type Stats = {
  runsThisWeek: number;
  activeRequests: number;
  lessonsCompleted: number;
  aiSkolenTotal: number;
};

export type MeSolution = {
  id: string;
  name: string;
  subtitle: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  usageCountWeek: number;
};

export type TeamMember = {
  id: string;
  name: string;
  avatarInitial: string;
  role: 'OWNER' | 'EMPLOYEE';
  isSelf: boolean;
};

export type TeamInvitation = {
  id: string;
  invitedIdentifier: string;
  status: 'PENDING' | 'APPROVED';
};

// ─── Me ──────────────────────────────────────────────────────────

export function useMe() {
  return useQuery<Me>({
    queryKey: ['me'],
    queryFn: () => api<Me>('/api/me'),
  });
}

// ─── Feed ────────────────────────────────────────────────────────

export function useFeedPosts(scope: 'industry' | 'all') {
  return useQuery<{ posts: FeedPost[] }>({
    queryKey: ['posts', 'ARTICLE', scope],
    queryFn: () => api(`/api/posts?kind=ARTICLE&scope=${scope}`),
  });
}

export function useMarkPostRead() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (postId) => api(`/api/posts/${postId}/read`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation<{ bookmarked: boolean }, Error, string>({
    mutationFn: (postId) => api(`/api/posts/${postId}/bookmark`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
}

// ─── Requests ────────────────────────────────────────────────────

export function useRequests() {
  return useQuery<{ active: UserRequest[]; completed: UserRequest[] }>({
    queryKey: ['requests'],
    queryFn: () => api('/api/requests'),
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation<{ request: UserRequest }, Error, { title: string; description: string }>({
    mutationFn: (body) => api('/api/requests', { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ─── Lessons ─────────────────────────────────────────────────────

export function useLessons() {
  return useQuery<LessonsResponse>({
    queryKey: ['lessons'],
    queryFn: () => api('/api/lessons'),
  });
}

export function useCompleteLesson() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api(`/api/lessons/${id}/complete`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lessons'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useSetLevel() {
  const qc = useQueryClient();
  return useMutation<void, Error, 'BEGINNER' | 'INTER' | 'ADVANCED'>({
    mutationFn: (level) => api('/api/me/level', { method: 'POST', body: { level } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['lessons'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useSkipOnboarding() {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: () => api('/api/me/skip-onboarding', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['lessons'] });
    },
  });
}

// ─── Min side ────────────────────────────────────────────────────

export const useStats = () =>
  useQuery<Stats>({ queryKey: ['stats'], queryFn: () => api('/api/me/stats') });

export const useSolutions = () =>
  useQuery<{ solutions: MeSolution[] }>({ queryKey: ['solutions'], queryFn: () => api('/api/me/solutions') });

export const useTeam = () =>
  useQuery<{ members: TeamMember[]; invitations: TeamInvitation[]; canInvite: boolean }>({
    queryKey: ['team'],
    queryFn: () => api('/api/me/team'),
  });

export function useInvite() {
  const qc = useQueryClient();
  return useMutation<{ invitation: unknown }, Error, string>({
    mutationFn: (identifier) => api('/api/me/invite', { method: 'POST', body: { identifier } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  });
}

export function useDeleteAccount() {
  return useMutation<void, Error, void>({
    mutationFn: () => api('/api/me', { method: 'DELETE' }),
  });
}
