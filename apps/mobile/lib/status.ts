import type { RequestStatus, TaskStatus } from './queries';

type BadgeVariant = 'green' | 'amber' | 'neutral';

export const taskStatusLabel: Record<TaskStatus, string> = {
  NY:       'Ny',
  I_ARBEID: 'I arbeid',
  FERDIG:   'Ferdig',
};

export const taskStatusVariant: Record<TaskStatus, BadgeVariant> = {
  NY:       'neutral',
  I_ARBEID: 'green',
  FERDIG:   'neutral',
};

export const requestStatusLabel: Record<RequestStatus, string> = {
  OPEN:     'Åpen',
  PROMOTED: 'Promotert',
  RESOLVED: 'Løst',
};

export const requestStatusVariant: Record<RequestStatus, BadgeVariant> = {
  OPEN:     'green',
  PROMOTED: 'neutral',
  RESOLVED: 'neutral',
};
