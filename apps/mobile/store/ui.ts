import { create } from 'zustand';

type UIState = {
  feedScope: 'industry' | 'all';
  setFeedScope: (scope: 'industry' | 'all') => void;
};

export const useUIStore = create<UIState>((set) => ({
  feedScope: 'industry',
  setFeedScope: (scope) => set({ feedScope: scope }),
}));
