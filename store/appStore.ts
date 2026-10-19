// ============================================================
// CLASSLY — Global App Store (Zustand)
// Only truly global, cross-screen state lives here.
// Heavy data (course lists, attendance) stays in hooks/SQLite.
// ============================================================
import { create } from 'zustand';
import type { AppSettings, UserProfile, Semester } from '@/types';

interface AppStore {
  // App readiness
  isDbReady: boolean;
  setDbReady: (ready: boolean) => void;

  // Active context
  settings: AppSettings | null;
  setSettings: (settings: AppSettings) => void;

  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;

  activeSemester: Semester | null;
  setActiveSemester: (semester: Semester | null) => void;

  // Loading state for initial app load
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  isDbReady: false,
  setDbReady: (ready) => set({ isDbReady: ready }),

  settings: null,
  setSettings: (settings) => set({ settings }),

  profile: null,
  setProfile: (profile) => set({ profile }),

  activeSemester: null,
  setActiveSemester: (semester) => set({ activeSemester: semester }),

  isLoading: true,
  setLoading: (loading) => set({ isLoading: loading }),
}));
