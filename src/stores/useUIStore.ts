import { create } from 'zustand';

interface UIStore {
  isFilterOpen: boolean;
  toggleFilter: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isFilterOpen: false,
  toggleFilter: () => set((s) => ({ isFilterOpen: !s.isFilterOpen })),
}));
