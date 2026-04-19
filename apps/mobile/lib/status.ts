import type { RequestStatus } from './queries';

type BadgeVariant = 'green' | 'amber' | 'neutral';

export const statusLabel: Record<RequestStatus, string> = {
  I_ARBEID:      'I arbeid',
  VENTER_PA_DEG: 'Venter på deg',
  FERDIG:        'Ferdig',
};

export const statusVariant: Record<RequestStatus, BadgeVariant> = {
  I_ARBEID:      'green',
  VENTER_PA_DEG: 'amber',
  FERDIG:        'neutral',
};
