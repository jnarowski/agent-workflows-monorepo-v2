import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useActiveProjectFiles } from "./useActiveProjectFiles";
import { useNavigationStore } from "@/client/stores";
import { useProjectFiles } from "@/client/hooks/useFiles";

// Mock the stores and hooks
vi.mock("@/client/stores", () => ({
  useNavigationStore: vi.fn(),
}));

vi.mock("@/client/hooks/useFiles", () => ({
  useProjectFiles: vi.fn(),
}));

describe("useActiveProjectFiles", () => {
  const mockFiles = [
    { id: "file-1", name: "file1.ts", path: "/src/file1.ts" },
    { id: "file-2", name: "file2.ts", path: "/src/file2.ts" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty array when no files", () => {
    (useNavigationStore as any).mockReturnValue("project-1");
    (useProjectFiles as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useActiveProjectFiles());

    expect(result.current.files).toEqual([]);
    expect(result.current.projectId).toBe("project-1");
  });

  it("should return files when projectId is set", () => {
    (useNavigationStore as any).mockReturnValue("project-1");
    (useProjectFiles as any).mockReturnValue({
      data: mockFiles,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useActiveProjectFiles());

    expect(result.current.files).toEqual(mockFiles);
    expect(result.current.projectId).toBe("project-1");
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle loading state", () => {
    (useNavigationStore as any).mockReturnValue("project-1");
    (useProjectFiles as any).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useActiveProjectFiles());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.files).toEqual([]);
  });

  it("should handle error state", () => {
    const mockError = new Error("Failed to fetch files");
    (useNavigationStore as any).mockReturnValue("project-1");
    (useProjectFiles as any).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    });

    const { result } = renderHook(() => useActiveProjectFiles());

    expect(result.current.error).toBe(mockError);
    expect(result.current.files).toEqual([]);
  });

  it("should handle null project ID", () => {
    (useNavigationStore as any).mockReturnValue(null);
    (useProjectFiles as any).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useActiveProjectFiles());

    expect(result.current.projectId).toBeNull();
    expect(result.current.files).toEqual([]);
  });
});
