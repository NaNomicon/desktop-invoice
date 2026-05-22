import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { query } from '@/lib/db';
import type { User } from '@/lib/types';

interface AuthState {
  user_id_log: string;
  user_name: string;
  user_id: number;
  company_id: number;
  isLoggedIn: boolean;
  login: (userId: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user_id_log: '',
      user_name: '',
      user_id: 0,
      company_id: 1,
      isLoggedIn: false,

      login: async (userId: string, password: string): Promise<boolean> => {
        try {
          const users = await query<User>(
            'SELECT id, user_id, password, des, company_id FROM tbl_user WHERE user_id = ? AND is_deleted = 0',
            [userId],
          );

          // Case-sensitive password match (plain-text, inherited from VB.NET)
          const user = users.find(
            (u) => u.password === password && u.user_id === userId,
          );

          if (!user) {
            return false;
          }

          set({
            user_id_log: user.user_id,
            user_name: user.des ?? userId,
            user_id: user.id,
            company_id: user.company_id,
            isLoggedIn: true,
          });

          return true;
        } catch {
          return false;
        }
      },

      logout: () =>
        set({
          user_id_log: '',
          user_name: '',
          user_id: 0,
          isLoggedIn: false,
        }),
    }),
    {
      name: 'auth-storage',
      // Only persist non-transient auth state (not isLoggedIn for fresh session check)
      partialize: (state) => ({
        user_id_log: state.user_id_log,
        user_name: state.user_name,
        user_id: state.user_id,
        company_id: state.company_id,
      }),
    },
  ),
);
