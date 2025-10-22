import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";

/**
 * User interface matching the API response
 */
export interface User {
  id: string;
  username: string;
}

/**
 * AuthStore state and actions
 */
export interface AuthStore {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  /**
   * Login with username and password
   * @param username - User's username
   * @param password - User's password
   * @throws Error if login fails
   */
  login: (username: string, password: string) => Promise<void>;

  /**
   * Sign up a new user
   * @param username - Desired username
   * @param password - Desired password
   * @throws Error if signup fails
   */
  signup: (username: string, password: string) => Promise<void>;

  /**
   * Logout the current user
   */
  logout: () => void;

  /**
   * Set the current user (internal use)
   */
  setUser: (user: User | null) => void;

  /**
   * Set the authentication token (internal use)
   */
  setToken: (token: string | null) => void;

  /**
   * Handle invalid/expired token scenario
   * Clears auth state and navigates to login
   */
  handleInvalidToken: () => void;
}

/**
 * Auth store with localStorage persistence
 * Manages authentication state, login/signup/logout actions
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,

      // Login action
      login: async (username: string, password: string) => {
        try {
          const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            const errorMessage = typeof error.error === 'string' ? error.error : error.error?.message || "Login failed";
            throw new Error(errorMessage);
          }

          const data = await response.json();

          // Update store with user and token
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
          });

          toast.success("Logged in successfully");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Login failed";
          toast.error(message);
          throw error;
        }
      },

      // Signup action
      signup: async (username: string, password: string) => {
        try {
          const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ username, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            const errorMessage = typeof error.error === 'string' ? error.error : error.error?.message || "Registration failed";
            throw new Error(errorMessage);
          }

          const data = await response.json();

          // Update store with user and token
          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
          });

          toast.success("Account created successfully");
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Registration failed";
          toast.error(message);
          throw error;
        }
      },

      // Logout action
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        toast.success("Logged out successfully");
      },

      // Set user (internal use)
      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },

      // Set token (internal use)
      setToken: (token: string | null) => {
        set({ token });
      },

      // Handle invalid token
      handleInvalidToken: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
        toast.error("Session expired. Please log in again.");
        // Navigation will be handled by the caller since we can't access router here
        // Components should use this in conjunction with useNavigate
      },
    }),
    {
      name: "auth-storage", // localStorage key
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
