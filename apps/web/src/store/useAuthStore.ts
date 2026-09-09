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

      setAuth: (user, token) => {
        if (typeof document !== "undefined") {
          document.cookie = `auth-token=${token}; path=/; max-age=604800; SameSite=Lax`;
          // Plain, readable (non-httpOnly) cookie purely for middleware's
          // routing decisions — which home page to redirect to, which
          // paths to block. It is NEVER trusted as an authorization
          // boundary: a client could tamper with it, but every API call
          // still re-verifies the actual JWT and role server-side (see
          // tenantHandler/requireRole), so tampering here only ever
          // affects which page you're bounced to, not what you can do.
          document.cookie = `user-role=${user.role}; path=/; max-age=604800; SameSite=Lax`;
        }
        set({
          user,
          token,
          tenantId: user.tenantId,
          isAuthenticated: true,
        });
      },

      setTenantId: (tenantId) => set({ tenantId }),

      logout: () => {
        if (typeof document !== "undefined") {
          document.cookie = "auth-token=; path=/; max-age=0; SameSite=Lax";
          document.cookie = "user-role=; path=/; max-age=0; SameSite=Lax";
        }
        set({
          user: null,
          token: null,
          tenantId: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "vending-auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAuthStore;
