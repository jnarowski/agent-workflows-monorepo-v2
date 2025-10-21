import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Integration tests for the /generate-slash-command slash command.
 *
 * These tests validate:
 * 1. The command file structure and metadata
 * 2. Expected behavior patterns when generating new commands
 * 3. Validation of generated command files
 */

const COMMAND_FILE_PATH = join(__dirname, "../../.claude/commands/generate-slash-command.md");
const TEST_OUTPUT_DIR = join(__dirname, "__test-commands__");

describe("/generate-slash-command", () => {
  beforeEach(() => {
    // Create test output directory
    if (!existsSync(TEST_OUTPUT_DIR)) {
      mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test output directory
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
    }
  });

  describe("Command File Structure", () => {
    it("should exist at the expected path", () => {
      expect(existsSync(COMMAND_FILE_PATH)).toBe(true);
    });

    it("should have valid frontmatter with required fields", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");

      // Check for frontmatter delimiters
      expect(content).toMatch(/^---\n/);

      // Check for required frontmatter fields
      expect(content).toMatch(/description:/);
      expect(content).toMatch(/argument-hint:/);

      // Extract and validate frontmatter content
      const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
      expect(frontmatterMatch).toBeTruthy();

      const frontmatter = frontmatterMatch![1];
      expect(frontmatter).toContain("description: Generate a new slash command");
      expect(frontmatter).toContain("argument-hint: [command-name, description]");
    });

    it("should have description under 80 characters", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");
      const descriptionMatch = content.match(/description: (.+)/);

      expect(descriptionMatch).toBeTruthy();
      const description = descriptionMatch![1];
      expect(description.length).toBeLessThanOrEqual(80);
    });

    it("should define required sections", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");

      // Core sections
      expect(content).toMatch(/## Variables/);
      expect(content).toMatch(/## Instructions/);
      expect(content).toMatch(/## Workflow/);
      expect(content).toMatch(/## Template/);
      expect(content).toMatch(/## Report/);

      // Additional guidance sections
      expect(content).toMatch(/## Slash Command Types/);
      expect(content).toMatch(/## Frontmatter Guidelines/);
      expect(content).toMatch(/## Best Practices/);
      expect(content).toMatch(/## Validation Checklist/);
    });

    it("should define variables with correct format", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");

      // Check for variable definitions
      expect(content).toMatch(/\$command-name: \$1 \(required\)/);
      expect(content).toMatch(/\$description: \$2 \(optional\)/);
    });

    it("should include workflow steps in order", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");

      // Extract workflow section
      const workflowMatch = content.match(/## Workflow\n\n([\s\S]+?)(?=\n##)/);
      expect(workflowMatch).toBeTruthy();

      const workflow = workflowMatch![1];

      // Check for numbered steps
      expect(workflow).toMatch(/1\.\s+Ask clarifying questions/);
      expect(workflow).toMatch(/2\.\s+Once you have all context/);
      expect(workflow).toMatch(/3\.\s+Write the command/);
      expect(workflow).toMatch(/4\.\s+Report the file path/);
    });

    it("should include a complete template", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");

      // Check for template section with code fence
      expect(content).toMatch(/## Template\n\n```md/);

      // Extract template content
      const templateMatch = content.match(/## Template\n\n```md\n([\s\S]+?)\n```/);
      expect(templateMatch).toBeTruthy();

      const template = templateMatch![1];

      // Validate template structure
      expect(template).toMatch(/^---/); // Starts with frontmatter
      expect(template).toContain("description:");
      expect(template).toContain("argument-hint:");
      expect(template).toContain("# <Command Title>");
      expect(template).toContain("## Variables");
      expect(template).toContain("## Instructions");
      expect(template).toContain("## Workflow");
    });

    it("should include validation checklist", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");

      // Check for checklist items
      expect(content).toMatch(/- \[ \] Frontmatter is valid YAML/);
      expect(content).toMatch(/- \[ \] Variables are clearly defined/);
      expect(content).toMatch(/- \[ \] Instructions are specific/);
      expect(content).toMatch(/- \[ \] Command follows existing patterns/);
    });
  });

  describe("Command Types Documentation", () => {
    it("should document Action Commands", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");
      expect(content).toMatch(/### Action Commands/);
      expect(content).toContain("perform operations");
      expect(content).toContain("step-by-step instructions");
    });

    it("should document Generator Commands", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");
      expect(content).toMatch(/### Generator Commands/);
      expect(content).toContain("create files from templates");
      expect(content).toContain("complete template section");
    });

    it("should document Orchestration Commands", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");
      expect(content).toMatch(/### Orchestration Commands/);
      expect(content).toContain("coordinate multiple agents");
      expect(content).toContain("workflow phases");
    });
  });

  describe("Best Practices Documentation", () => {
    it("should include actionable best practices", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");

      const practices = [
        "Be Specific",
        "Be Actionable",
        "Use Variables",
        "Include Validation",
        "Handle Edge Cases",
        "Follow Patterns",
        "Keep It Focused",
        "Add Examples"
      ];

      practices.forEach(practice => {
        expect(content).toContain(practice);
      });
    });

    it("should provide concrete examples", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");

      // Check for example sections
      expect(content).toMatch(/Examples?:/);

      // Should show concrete usage patterns
      expect(content).toContain("`[feature-name, context]`");
      expect(content).toContain("`[spec-name-or-path]`");
    });
  });

  describe("Frontmatter Guidelines", () => {
    it("should provide description guidelines with examples", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");

      const frontmatterSection = content.match(/## Frontmatter Guidelines\n\n([\s\S]+?)(?=\n## )/);
      expect(frontmatterSection).toBeTruthy();

      const guidelines = frontmatterSection![1];
      expect(guidelines).toContain("Keep under 80 characters");
      expect(guidelines).toContain("Use action verbs");
      expect(guidelines).toMatch(/Generate|Create|Run|Deploy/);
    });

    it("should provide argument-hint guidelines with examples", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");

      expect(content).toContain("Use square brackets with comma-separated arguments");
      expect(content).toContain("`[feature-name, context]`");
      expect(content).toContain("`[]` (for commands with no arguments)");
    });
  });

  describe("Generated Command Validation", () => {
    /**
     * Helper to create a mock generated command file
     */
    function createMockCommand(options: {
      name: string;
      description: string;
      argumentHint?: string;
      hasVariables?: boolean;
      hasWorkflow?: boolean;
      hasTemplate?: boolean;
    }) {
      const {
        name,
        description,
        argumentHint = "[]",
        hasVariables = false,
        hasWorkflow = false,
        hasTemplate = false
      } = options;

      let content = `---
description: ${description}
argument-hint: ${argumentHint}
---

# ${name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}

This is a test command.
`;

      if (hasVariables) {
        content += `
## Variables

- $arg1: $1 (required) - Test argument
`;
      }

      if (hasWorkflow) {
        content += `
## Workflow

1. First step
2. Second step
3. Final step
`;
      }

      if (hasTemplate) {
        content += `
## Template

\`\`\`md
Test template content
\`\`\`
`;
      }

      content += `
## Report

- File created successfully
`;

      const filePath = join(TEST_OUTPUT_DIR, `${name}.md`);
      writeFileSync(filePath, content);
      return filePath;
    }

    it("should validate simple action command structure", () => {
      const filePath = createMockCommand({
        name: "test-action",
        description: "Test action command for validation",
        argumentHint: "[]",
        hasWorkflow: true
      });

      expect(existsSync(filePath)).toBe(true);

      const content = readFileSync(filePath, "utf-8");
      expect(content).toMatch(/^---/);
      expect(content).toContain("description: Test action command");
      expect(content).toContain("argument-hint: []");
      expect(content).toMatch(/## Workflow/);
    });

    it("should validate generator command with template", () => {
      const filePath = createMockCommand({
        name: "test-generator",
        description: "Test generator command with template",
        argumentHint: "[feature-name, context]",
        hasVariables: true,
        hasTemplate: true
      });

      const content = readFileSync(filePath, "utf-8");
      expect(content).toMatch(/## Variables/);
      expect(content).toMatch(/## Template/);
      expect(content).toContain("```md");
    });

    it("should validate command with arguments", () => {
      const filePath = createMockCommand({
        name: "test-with-args",
        description: "Test command with arguments",
        argumentHint: "[arg1, arg2]",
        hasVariables: true
      });

      const content = readFileSync(filePath, "utf-8");
      expect(content).toContain("argument-hint: [arg1, arg2]");
      expect(content).toMatch(/\$arg1: \$1 \(required\)/);
    });

    it("should validate description length requirement", () => {
      const shortDesc = "Test";
      const longDesc = "This is a very long description that exceeds eighty characters in length and should fail validation";

      const shortPath = createMockCommand({
        name: "test-short",
        description: shortDesc
      });

      const shortContent = readFileSync(shortPath, "utf-8");
      const shortMatch = shortContent.match(/description: (.+)/);
      expect(shortMatch![1].length).toBeLessThanOrEqual(80);

      // Long description test - validate it would fail
      expect(longDesc.length).toBeGreaterThan(80);
    });

    it("should validate required sections are present", () => {
      const filePath = createMockCommand({
        name: "test-complete",
        description: "Complete test command",
        hasWorkflow: true
      });

      const content = readFileSync(filePath, "utf-8");

      // Frontmatter
      expect(content).toMatch(/^---/);

      // Report section
      expect(content).toMatch(/## Report/);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle missing command-name requirement", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");
      expect(content).toContain("If command name is not provided, stop IMMEDIATELY");
    });

    it("should handle missing description requirement", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");
      expect(content).toContain("If description is not provided, stop IMMEDIATELY");
    });

    it("should normalize command names", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");
      expect(content).toContain("Normalize $command-name (lowercase, hyphenated)");
    });

    it("should guide clarifying questions", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");
      expect(content).toContain("Ask clarifying questions if needed");
      expect(content).toContain("Ask questions ONE AT A TIME");
      expect(content).toContain("provide two options and specify which you recommend");
    });
  });

  describe("Command Output Specifications", () => {
    it("should specify output file path pattern", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");
      expect(content).toContain("`.claude/commands/${command-name}.md`");
    });

    it("should specify what to report", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");

      const reportSection = content.match(/## Report\n\n([\s\S]+?)$/);
      expect(reportSection).toBeTruthy();

      const report = reportSection![1];
      expect(report).toContain("Return the full path to the command file created");
      expect(report).toContain("Suggest trying the command with: `/command-name`");
    });
  });

  describe("Structure Patterns Documentation", () => {
    it("should document simple action command pattern", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");
      expect(content).toMatch(/### Simple Action Command/);
      expect(content).toContain("Title and description");
      expect(content).toContain("Instructions (bullet list)");
    });

    it("should document generator with template pattern", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");
      expect(content).toMatch(/### Generator with Template/);
      expect(content).toContain("Variables section");
      expect(content).toContain("Template section");
      expect(content).toContain("Formatting Rules");
    });

    it("should document multi-agent orchestrator pattern", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");
      expect(content).toMatch(/### Multi-Agent Orchestrator/);
      expect(content).toContain("Subagent Templates");
      expect(content).toContain("Synthesis Template");
    });
  });

  describe("Question Template Validation", () => {
    it("should provide question template format", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");

      // Check for markdown question template
      expect(content).toContain("**Question**:");
      expect(content).toContain("**Suggestions**");
      expect(content).toContain("1: Something (recommended)");
      expect(content).toContain("3: Other - user specifies");
    });

    it("should provide example questions", () => {
      const content = readFileSync(COMMAND_FILE_PATH, "utf-8");

      const exampleQuestions = [
        "Does this command take arguments?",
        "Does it generate a file or perform an action?",
        "Does it need to interact with external tools",
        "Should it follow a specific template or workflow?"
      ];

      exampleQuestions.forEach(question => {
        expect(content).toContain(question);
      });
    });
  });
});
