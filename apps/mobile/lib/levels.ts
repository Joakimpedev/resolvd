export type Level = 'BEGINNER' | 'INTER' | 'ADVANCED';

export const levelLabel: Record<Level, string> = {
  BEGINNER: 'Aldri brukt AI',
  INTER:    'Har prøvd litt',
  ADVANCED: 'Bruker det jevnlig',
};

export const levelDescription: Record<Level, string> = {
  BEGINNER: 'Vi starter fra bunnen og lager det enkelt.',
  INTER:    'Du har testet ChatGPT eller lignende noen ganger.',
  ADVANCED: 'AI er en del av hverdagen din allerede.',
};

export const levelHeadline: Record<Level, string> = {
  BEGINNER: 'Lær AI fra bunnen',
  INTER:    'Bygg videre på det du kan',
  ADVANCED: 'Dypere AI-ferdigheter',
};
