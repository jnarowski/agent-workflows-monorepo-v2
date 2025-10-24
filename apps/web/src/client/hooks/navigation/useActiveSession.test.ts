import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useActiveSession } from "./useActiveSession";
import { useNavigationStore } from "@/client/stores/index";
import { useAgentSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";

// Mock the stores and hooks
vi.mock("@/client/stores", () => ({
  useNavigationStore: vi.fn(),
}));

vi.mock("@/client/pages/projects/sessions/hooks/useAgentSessions", () => ({
  useAgentSessions: vi.fn(),
}));

describe("useActiveSession", () => {
  let queryClient: QueryClient;

  const mockSessions = [
    { id: "session-1", name: "Session 1" },
    { id: "session-2", name: "Session 2" },
  ];

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  it("should return null when no active session", () => {
    vi.mocked(useNavigationStore).mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({ activeProjectId: "project-1", activeSessionId: null })
    );
    vi.mocked(useAgentSessions).mockReturnValue({
      data: mockSessions,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useActiveSession(), { wrapper });

    expect(result.current.session).toBeNull();
    expect(result.current.sessionId).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should return session when ID matches", () => {
    vi.mocked(useNavigationStore).mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({ activeProjectId: "project-1", activeSessionId: "session-1" })
    );
    vi.mocked(useAgentSessions).mockReturnValue({
      data: mockSessions,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useActiveSession(), { wrapper });

    expect(result.current.session).toEqual(mockSessions[0]);
    expect(result.current.sessionId).toBe("session-1");
    expect(result.current.isLoading).toBe(false);
  });

  it("should return null when session ID not found", () => {
    vi.mocked(useNavigationStore).mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({
        activeProjectId: "project-1",
        activeSessionId: "nonexistent-id",
      })
    );
    vi.mocked(useAgentSessions).mockReturnValue({
      data: mockSessions,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useActiveSession(), { wrapper });

    expect(result.current.session).toBeNull();
    expect(result.current.sessionId).toBe("nonexistent-id");
  });

  it("should handle loading state", () => {
    vi.mocked(useNavigationStore).mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({ activeProjectId: "project-1", activeSessionId: "session-1" })
    );
    vi.mocked(useAgentSessions).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useActiveSession(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.session).toBeNull();
  });

  it("should handle error state", () => {
    const mockError = new Error("Failed to fetch sessions");
    vi.mocked(useNavigationStore).mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({ activeProjectId: "project-1", activeSessionId: "session-1" })
    );
    vi.mocked(useAgentSessions).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    });

    const { result } = renderHook(() => useActiveSession(), { wrapper });

    expect(result.current.error).toBe(mockError);
    expect(result.current.session).toBeNull();
  });

  it("should disable query when no project is active", () => {
    vi.mocked(useNavigationStore).mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({ activeProjectId: null, activeSessionId: "session-1" })
    );

    renderHook(() => useActiveSession(), { wrapper });

    expect(useAgentSessions).toHaveBeenCalledWith({
      projectId: "",
      enabled: false,
    });
  });
});
