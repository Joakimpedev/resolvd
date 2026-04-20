import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// ─── Types ─────────────────────────────────────────────────────

export type Me = {
  id: string;
  email: string;
  name: string;
  avatarInitial: string;
  role: 'ADMIN' | 'OWNER' | 'EMPLOYEE';
  company: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
};

export type ScopeCompany = { id: string; name: string };
export type ScopeTag = { id: string; name: string };

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
  everyone: boolean;
  companies: ScopeCompany[];
  tags: ScopeTag[];
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

export type CourseSummary = {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  totalCount: number;
  completedCount: number;
};

export type CourseLesson = {
  id: string;
  title: string;
  readingMinutes: number | null;
  order: number;
  isCompleted: boolean;
  isNext: boolean;
  isLocked: boolean;
};

export type CourseModule = {
  id: string;
  title: string;
  order: number;
  lessons: CourseLesson[];
};

export type CourseDetail = {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  totalCount: number;
  completedCount: number;
  modules: CourseModule[];
};

export type Stats = {
  runsThisWeek: number;
  activeRequests: number;
  lessonsCompleted: number;
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

// ─── Me ──────────────────────────────────────────────────────────

export function useMe() {
  return useQuery<Me>({
    queryKey: ['me'],
    queryFn: () => api<Me>('/api/me'),
  });
}

// ─── Feed ────────────────────────────────────────────────────────

export function useFeedPosts() {
  return useQuery<{ posts: FeedPost[] }>({
    queryKey: ['posts', 'ARTICLE'],
    queryFn: () => api('/api/posts?kind=ARTICLE'),
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

// ─── Courses (Lær) ───────────────────────────────────────────────

export function useCourses() {
  return useQuery<{ courses: CourseSummary[] }>({
    queryKey: ['courses'],
    queryFn: () => api('/api/lessons/courses'),
  });
}

export function useCourse(id: string | undefined) {
  return useQuery<CourseDetail>({
    queryKey: ['course', id],
    queryFn: () => api(`/api/lessons/courses/${id}`),
    enabled: !!id,
  });
}

export function useCompleteLesson() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api(`/api/lessons/${id}/complete`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['course'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

// ─── Min side ────────────────────────────────────────────────────

export const useStats = () =>
  useQuery<Stats>({ queryKey: ['stats'], queryFn: () => api('/api/me/stats') });

export const useSolutions = () =>
  useQuery<{ solutions: MeSolution[] }>({ queryKey: ['solutions'], queryFn: () => api('/api/me/solutions') });

export const useTeam = () =>
  useQuery<{ members: TeamMember[] }>({
    queryKey: ['team'],
    queryFn: () => api('/api/me/team'),
  });

export function useDeleteAccount() {
  return useMutation<void, Error, void>({
    mutationFn: () => api('/api/me', { method: 'DELETE' }),
  });
}
