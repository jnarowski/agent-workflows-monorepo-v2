import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useActiveSession } from "./useActiveSession";
import { useNavigationStore } from "@/client/stores";
import { useAgentSessions } from "@/client/pages/projects/sessions/hooks/useAgentSessions";

// Mock the stores and hooks
vi.mock("@/client/stores", () => ({
  useNavigationStore: vi.fn(),
}));

vi.mock("@/client/hooks/useAgentSessions", () => ({
  useAgentSessions: vi.fn(),
}));

describe("useActiveSession", () => {
  const mockSessions = [
    { id: "session-1", name: "Session 1" },
    { id: "session-2", name: "Session 2" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when no active session", () => {
    (useNavigationStore as any).mockImplementation((selector: any) =>
      selector({ activeProjectId: "project-1", activeSessionId: null })
    );
    (useAgentSessions as any).mockReturnValue({
      data: mockSessions,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useActiveSession());

    expect(result.current.session).toBeNull();
    expect(result.current.sessionId).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should return session when ID matches", () => {
    (useNavigationStore as any).mockImplementation((selector: any) =>
      selector({ activeProjectId: "project-1", activeSessionId: "session-1" })
    );
    (useAgentSessions as any).mockReturnValue({
      data: mockSessions,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useActiveSession());

    expect(result.current.session).toEqual(mockSessions[0]);
    expect(result.current.sessionId).toBe("session-1");
    expect(result.current.isLoading).toBe(false);
  });

  it("should return null when session ID not found", () => {
    (useNavigationStore as any).mockImplementation((selector: any) =>
      selector({
        activeProjectId: "project-1",
        activeSessionId: "nonexistent-id",
      })
    );
    (useAgentSessions as any).mockReturnValue({
      data: mockSessions,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useActiveSession());

    expect(result.current.session).toBeNull();
    expect(result.current.sessionId).toBe("nonexistent-id");
  });

  it("should handle loading state", () => {
    (useNavigationStore as any).mockImplementation((selector: any) =>
      selector({ activeProjectId: "project-1", activeSessionId: "session-1" })
    );
    (useAgentSessions as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useActiveSession());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.session).toBeNull();
  });

  it("should handle error state", () => {
    const mockError = new Error("Failed to fetch sessions");
    (useNavigationStore as any).mockImplementation((selector: any) =>
      selector({ activeProjectId: "project-1", activeSessionId: "session-1" })
    );
    (useAgentSessions as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    });

    const { result } = renderHook(() => useActiveSession());

    expect(result.current.error).toBe(mockError);
    expect(result.current.session).toBeNull();
  });

  it("should disable query when no project is active", () => {
    (useNavigationStore as any).mockImplementation((selector: any) =>
      selector({ activeProjectId: null, activeSessionId: "session-1" })
    );

    renderHook(() => useActiveSession());

    expect(useAgentSessions).toHaveBeenCalledWith({
      projectId: "",
      enabled: false,
    });
  });
});
