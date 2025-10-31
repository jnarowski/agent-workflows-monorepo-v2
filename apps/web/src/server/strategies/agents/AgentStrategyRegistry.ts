import type { AgentStrategy } from "./AgentStrategy";
import { ClaudeAgentStrategy } from "./ClaudeAgentStrategy";
import { CodexAgentStrategy } from "./CodexAgentStrategy";

/**
 * Registry for agent strategies
 * Maps agent names to their respective strategy implementations
 */
export class AgentStrategyRegistry {
  private static strategies = new Map<string, AgentStrategy>();
  private static initialized = false;

  /**
   * Initialize the registry with default strategies
   * This is called automatically when the registry is first used
   */
  private static initialize(): void {
    if (this.initialized) {
      return;
    }

    // Register default strategies
    this.register(new ClaudeAgentStrategy());
    this.register(new CodexAgentStrategy());

    this.initialized = true;
  }

  /**
   * Register a new agent strategy
   * @param strategy - Strategy implementation to register
   */
  static register(strategy: AgentStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Get strategy for a specific agent
   * @param agent - Agent name (e.g., "claude", "codex")
   * @returns Strategy implementation for the agent
   * @throws Error if agent is not supported
   */
  static get(agent: string): AgentStrategy {
    this.initialize();

    const strategy = this.strategies.get(agent);
    if (!strategy) {
      const supportedAgents = Array.from(this.strategies.keys()).join(", ");
      throw new Error(
        `Unsupported agent: ${agent}. Supported agents: ${supportedAgents}`
      );
    }

    return strategy;
  }

  /**
   * Check if an agent is supported
   * @param agent - Agent name to check
   * @returns True if the agent is supported
   */
  static isSupported(agent: string): boolean {
    this.initialize();
    return this.strategies.has(agent);
  }

  /**
   * Get all registered agent names
   * @returns Array of registered agent names
   */
  static getAllAgents(): string[] {
    this.initialize();
    return Array.from(this.strategies.keys());
  }

  /**
   * Reset the registry (for testing purposes)
   * @internal
   */
  static reset(): void {
    this.strategies.clear();
    this.initialized = false;
  }
}
