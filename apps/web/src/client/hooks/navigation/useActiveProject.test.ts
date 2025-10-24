import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useActiveProject } from "./useActiveProject";
import { useNavigationStore } from "@/client/stores";
import { useProjects } from "@/client/pages/projects/hooks/useProjects";

// Mock the stores and hooks
vi.mock("@/client/stores", () => ({
  useNavigationStore: vi.fn(),
}));

vi.mock("@/client/hooks/useProjects", () => ({
  useProjects: vi.fn(),
}));

describe("useActiveProject", () => {
  const mockProjects = [
    { id: "project-1", name: "Project 1" },
    { id: "project-2", name: "Project 2" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when no active project", () => {
    (useNavigationStore as any).mockReturnValue(null);
    (useProjects as any).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useActiveProject());

    expect(result.current.project).toBeNull();
    expect(result.current.projectId).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("should return project when ID matches", () => {
    (useNavigationStore as any).mockReturnValue("project-1");
    (useProjects as any).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useActiveProject());

    expect(result.current.project).toEqual(mockProjects[0]);
    expect(result.current.projectId).toBe("project-1");
    expect(result.current.isLoading).toBe(false);
  });

  it("should return null when project ID not found", () => {
    (useNavigationStore as any).mockReturnValue("nonexistent-id");
    (useProjects as any).mockReturnValue({
      data: mockProjects,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useActiveProject());

    expect(result.current.project).toBeNull();
    expect(result.current.projectId).toBe("nonexistent-id");
  });

  it("should handle loading state", () => {
    (useNavigationStore as any).mockReturnValue("project-1");
    (useProjects as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useActiveProject());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.project).toBeNull();
  });

  it("should handle error state", () => {
    const mockError = new Error("Failed to fetch projects");
    (useNavigationStore as any).mockReturnValue("project-1");
    (useProjects as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    });

    const { result } = renderHook(() => useActiveProject());

    expect(result.current.error).toBe(mockError);
    expect(result.current.project).toBeNull();
  });
});
