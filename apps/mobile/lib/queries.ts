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

// Tasks (Oppgaver) — admin-created work items.
export type TaskStatus = 'NY' | 'I_ARBEID' | 'FERDIG';
export type RequestStatus = 'OPEN' | 'PROMOTED' | 'RESOLVED';

export type Person = { id: string; name: string; avatarInitial: string };

export type TaskSummary = {
  id: string;
  title: string;
  status: TaskStatus;
  priceOre: number | null;
  canSeePrice: boolean;
  eventCount: number;
  assignees: Person[];
  isAssigned: boolean;
  lastActivityAt: string;
  hasUnread: boolean;
};

export type TaskEventComment = {
  id: string;
  body: string;
  user: Person;
  createdAt: string;
};

export type TaskEvent = {
  id: string;
  header: string;
  body: string;
  createdBy: Person;
  createdAt: string;
  comments: TaskEventComment[];
};

export type TaskDetail = {
  id: string;
  title: string;
  descriptionMd: string;
  status: TaskStatus;
  priceOre: number | null;
  canSeePrice: boolean;
  assignees: Person[];
  createdAt: string;
  updatedAt: string;
  events: TaskEvent[];
};

export type RequestSummary = {
  id: string;
  title: string;
  status: RequestStatus;
  createdBy: Person;
  commentCount: number;
  lastActivityAt: string;
  promotedAt: string | null;
  hasUnread: boolean;
};

export type RequestComment = {
  id: string;
  body: string;
  user: Person & { role: 'ADMIN' | 'OWNER' | 'EMPLOYEE' };
  createdAt: string;
};

export type RequestDetail = {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  createdBy: Person;
  createdAt: string;
  updatedAt: string;
  promotedAt: string | null;
  promotedToTaskId: string | null;
  comments: RequestComment[];
};

export type CourseSummary = {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  totalCount: number;
  completedCount: number;
  everyone: boolean;
  companies: ScopeCompany[];
  tags: ScopeTag[];
};

export type CourseLesson = {
  id: string;
  title: string;
  body: string;
  readingMinutes: number | null;
  order: number;
  isCompleted: boolean;
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
  activeTasks: number;
  openRequests: number;
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

// ─── Tasks (Oppgaver) ────────────────────────────────────────────

export function useTasks() {
  return useQuery<{ tasks: TaskSummary[] }>({
    queryKey: ['tasks'],
    queryFn: () => api('/api/tasks'),
  });
}

export function useTask(id: string | undefined) {
  return useQuery<{ task: TaskDetail }>({
    queryKey: ['task', id],
    queryFn: () => api(`/api/tasks/${id}`),
    enabled: !!id,
  });
}

export function useTasksUnread() {
  return useQuery<{ count: number }>({
    queryKey: ['tasks', 'unread'],
    queryFn: () => api('/api/tasks/unread-count'),
  });
}

export function useCommentOnTaskEvent() {
  const qc = useQueryClient();
  return useMutation<
    { comment: TaskEventComment },
    Error,
    { taskId: string; eventId: string; body: string }
  >({
    mutationFn: ({ taskId, eventId, body }) =>
      api(`/api/tasks/${taskId}/events/${eventId}/comments`, { method: 'POST', body: { body } }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['task', v.taskId] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks', 'unread'] });
    },
  });
}

// ─── Requests (Forespørsler) ─────────────────────────────────────

export function useRequests() {
  return useQuery<{ requests: RequestSummary[] }>({
    queryKey: ['requests'],
    queryFn: () => api('/api/requests'),
  });
}

export function useRequest(id: string | undefined) {
  return useQuery<{ request: RequestDetail }>({
    queryKey: ['request', id],
    queryFn: () => api(`/api/requests/${id}`),
    enabled: !!id,
  });
}

export function useRequestsUnread() {
  return useQuery<{ count: number }>({
    queryKey: ['requests', 'unread'],
    queryFn: () => api('/api/requests/unread-count'),
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation<
    { request: { id: string; title: string; status: RequestStatus; createdAt: string } },
    Error,
    { title: string; description: string }
  >({
    mutationFn: (body) => api('/api/requests', { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useCommentOnRequest() {
  const qc = useQueryClient();
  return useMutation<
    { comment: RequestComment },
    Error,
    { requestId: string; body: string }
  >({
    mutationFn: ({ requestId, body }) =>
      api(`/api/requests/${requestId}/comments`, { method: 'POST', body: { body } }),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['request', v.requestId] });
      qc.invalidateQueries({ queryKey: ['requests'] });
      qc.invalidateQueries({ queryKey: ['requests', 'unread'] });
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
