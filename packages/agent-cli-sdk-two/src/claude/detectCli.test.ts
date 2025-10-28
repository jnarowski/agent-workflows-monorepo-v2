import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectCli } from './detectCli';
import * as childProcess from 'node:child_process';
import * as fs from 'node:fs';

// Mock modules
vi.mock('node:child_process');
vi.mock('node:fs');

describe('detectCli', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return path from CLAUDE_CLI_PATH environment variable if it exists', () => {
    const testPath = '/custom/path/to/claude';
    process.env.CLAUDE_CLI_PATH = testPath;

    vi.mocked(fs.existsSync).mockReturnValue(true);

    const result = detectCli();

    expect(result).toBe(testPath);
    expect(fs.existsSync).toHaveBeenCalledWith(testPath);
  });

  it('should return null if CLAUDE_CLI_PATH exists but file does not', () => {
    process.env.CLAUDE_CLI_PATH = '/nonexistent/path';
    vi.mocked(fs.existsSync).mockReturnValue(false);

    // Mock execSync to throw (not in PATH)
    vi.mocked(childProcess.execSync).mockImplementation(() => {
      throw new Error('Command not found');
    });

    const result = detectCli();

    expect(result).toBe(null);
  });

  it('should find CLI in PATH using which command', () => {
    const testPath = '/usr/local/bin/claude';
    delete process.env.CLAUDE_CLI_PATH;

    vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from(`${testPath}\n`));
    vi.mocked(fs.existsSync).mockReturnValue(true);

    const result = detectCli();

    expect(result).toBe(testPath);
    expect(childProcess.execSync).toHaveBeenCalledWith('which claude', expect.any(Object));
  });

  it('should handle shell aliases in which output', () => {
    const testPath = '/opt/homebrew/bin/claude';
    delete process.env.CLAUDE_CLI_PATH;

    vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from(`claude: aliased to ${testPath}\n`));
    vi.mocked(fs.existsSync).mockImplementation((path) => path === testPath);

    const result = detectCli();

    expect(result).toBe(testPath);
  });

  it('should check common installation paths if not in PATH', () => {
    delete process.env.CLAUDE_CLI_PATH;
    process.env.HOME = '/home/testuser';

    // Mock execSync to throw (not in PATH)
    vi.mocked(childProcess.execSync).mockImplementation(() => {
      throw new Error('Command not found');
    });

    // Mock existsSync to return true for ~/.claude/local/claude
    vi.mocked(fs.existsSync).mockImplementation((path) => {
      return path === '/home/testuser/.claude/local/claude';
    });

    const result = detectCli();

    expect(result).toBe('/home/testuser/.claude/local/claude');
  });

  it('should return null if CLI is not found anywhere', () => {
    delete process.env.CLAUDE_CLI_PATH;

    vi.mocked(childProcess.execSync).mockImplementation(() => {
      throw new Error('Command not found');
    });
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = detectCli();

    expect(result).toBe(null);
  });
});
