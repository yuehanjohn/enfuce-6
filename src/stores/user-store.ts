import { create } from "zustand";

interface UserState {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  subscription: {
    plan: string;
    status: string;
  } | null;
  setUser: (user: UserState["user"]) => void;
  setSubscription: (subscription: UserState["subscription"]) => void;
  clear: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  subscription: null,
  setUser: (user) => set({ user }),
  setSubscription: (subscription) => set({ subscription }),
  clear: () => set({ user: null, subscription: null }),
}));
