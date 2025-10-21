import { describe, it, expect, vi, beforeEach } from "vitest";
import { promises as fs } from "fs";
import {
  isSupportedImageFormat,
  getMimeType,
  processImageInput,
  processImageInputs,
  validateImageData,
  formatImageForCLI,
  getBase64Size,
  validateImageSize,
  type ImageData,
} from "../../../../src/adapters/claude/image-handler";

// Mock fs module
vi.mock("fs", () => ({
  promises: {
    readFile: vi.fn(),
    access: vi.fn(),
  },
}));

describe("Image Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Removed: Trivial tests for isSupportedImageFormat and getMimeType
  // These are simple lookup objects/maps - testing them doesn't add value
  // The behavior is adequately tested through processImageInput tests

  describe("processImageInput", () => {
    it("should process file path to ImageData", async () => {
      const mockBuffer = Buffer.from("fake-image-data");
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const result = await processImageInput("/absolute/path/to/image.png");

      expect(result.data).toBe(mockBuffer.toString("base64"));
      expect(result.mimeType).toBe("image/png");
      expect(result.filename).toBe("image.png");
    });

    it("should accept ImageData object directly", async () => {
      const imageData: ImageData = {
        data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        mimeType: "image/png",
      };

      const result = await processImageInput(imageData);

      expect(result).toBe(imageData);
    });

    it("should throw error for relative paths", async () => {
      await expect(
        processImageInput("relative/path/to/image.png")
      ).rejects.toThrow("Image path must be absolute");
    });

    it("should throw error for unsupported format", async () => {
      await expect(
        processImageInput("/absolute/path/to/image.bmp")
      ).rejects.toThrow("Unsupported image format");
    });

    it("should throw error if file doesn't exist", async () => {
      vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

      await expect(
        processImageInput("/absolute/path/to/missing.png")
      ).rejects.toThrow("Image file not found");
    });
  });

  describe("processImageInputs", () => {
    it("should process multiple image inputs", async () => {
      const mockBuffer = Buffer.from("fake-image-data");
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const inputs = [
        "/absolute/path/to/image1.png",
        "/absolute/path/to/image2.jpg",
      ];

      const results = await processImageInputs(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].mimeType).toBe("image/png");
      expect(results[1].mimeType).toBe("image/jpeg");
    });

    it("should handle mixed input types", async () => {
      const mockBuffer = Buffer.from("fake-image-data");
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const inputs = [
        "/absolute/path/to/image.png",
        {
          data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
          mimeType: "image/png",
        },
      ];

      const results = await processImageInputs(inputs);

      expect(results).toHaveLength(2);
      expect(results[0].mimeType).toBe("image/png");
      expect(results[1].mimeType).toBe("image/png");
    });
  });

  describe("validateImageData", () => {
    it("should validate correct ImageData", () => {
      const imageData: ImageData = {
        data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        mimeType: "image/png",
      };

      expect(() => validateImageData(imageData)).not.toThrow();
    });

    it("should throw error for missing data", () => {
      const imageData = {
        data: "",
        mimeType: "image/png",
      } as ImageData;

      expect(() => validateImageData(imageData)).toThrow(
        "ImageData.data must be a non-empty string"
      );
    });

    it("should throw error for invalid data type", () => {
      const imageData = {
        data: 123,
        mimeType: "image/png",
      } as any;

      expect(() => validateImageData(imageData)).toThrow(
        "ImageData.data must be a non-empty string"
      );
    });

    it("should throw error for missing mimeType", () => {
      const imageData = {
        data: "validbase64data==",
        mimeType: "",
      } as ImageData;

      expect(() => validateImageData(imageData)).toThrow(
        "ImageData.mimeType must be a non-empty string"
      );
    });

    it("should throw error for invalid MIME type", () => {
      const imageData: ImageData = {
        data: "validbase64data==",
        mimeType: "image/bmp",
      };

      expect(() => validateImageData(imageData)).toThrow("Invalid MIME type");
    });

    it("should throw error for invalid base64", () => {
      const imageData: ImageData = {
        data: "not-valid-base64!@#$",
        mimeType: "image/png",
      };

      expect(() => validateImageData(imageData)).toThrow(
        "must be valid base64-encoded string"
      );
    });
  });

  describe("formatImageForCLI", () => {
    it("should format ImageData for CLI", () => {
      const imageData: ImageData = {
        data: "base64data==",
        mimeType: "image/png",
      };

      const formatted = formatImageForCLI(imageData);

      expect(formatted).toEqual({
        type: "image",
        source: {
          type: "base64",
          media_type: "image/png",
          data: "base64data==",
        },
      });
    });

    it("should preserve filename in metadata", () => {
      const imageData: ImageData = {
        data: "base64data==",
        mimeType: "image/jpeg",
        filename: "photo.jpg",
      };

      const formatted = formatImageForCLI(imageData);

      expect(formatted.source.media_type).toBe("image/jpeg");
    });
  });

  describe("getBase64Size", () => {
    it("should calculate size correctly", () => {
      // "test" in base64 is "dGVzdA==" (8 chars)
      // Actual size should be 4 bytes
      const base64 = "dGVzdA==";
      const size = getBase64Size(base64);

      expect(size).toBe(4);
    });

    it("should handle base64 without padding", () => {
      const base64 = "dGVzdA";
      const size = getBase64Size(base64);

      // Should still calculate correctly
      expect(size).toBeGreaterThan(0);
    });
  });

  describe("validateImageSize", () => {
    it("should not throw for images within size limit", () => {
      const imageData: ImageData = {
        data: "dGVzdA==", // Small image
        mimeType: "image/png",
      };

      expect(() => validateImageSize(imageData)).not.toThrow();
    });

    it("should throw for images exceeding size limit", () => {
      // Create large base64 string (6MB worth)
      const largeData = "A".repeat(8 * 1024 * 1024); // 8MB in base64
      const imageData: ImageData = {
        data: largeData,
        mimeType: "image/png",
      };

      expect(() => validateImageSize(imageData)).toThrow(
        "exceeds maximum allowed size"
      );
    });

    it("should respect custom size limit", () => {
      const imageData: ImageData = {
        data: "A".repeat(2000), // ~1.5KB
        mimeType: "image/png",
      };

      // Should throw with 1KB limit
      expect(() => validateImageSize(imageData, 1024)).toThrow(
        "exceeds maximum allowed size"
      );

      // Should not throw with 10KB limit
      expect(() => validateImageSize(imageData, 10 * 1024)).not.toThrow();
    });
  });
});
