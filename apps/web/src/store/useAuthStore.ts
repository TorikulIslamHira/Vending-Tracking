import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { UserRole } from "@vending/shared-types";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  setTenantId: (tenantId: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      tenantId: null,
      isAuthenticated: false,

      setAuth: (user, token) =>
        set({
          user,
          token,
          tenantId: user.tenantId,
          isAuthenticated: true,
        }),

      setTenantId: (tenantId) => set({ tenantId }),

      logout: () =>
        set({
          user: null,
          token: null,
          tenantId: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "vending-auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuthStore;
