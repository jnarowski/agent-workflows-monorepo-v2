import { generateText, generateObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import type { GetStepTools } from "inngest";
import type { RuntimeContext } from "../../../types/engine.types";
import type { AiStepConfig, AiStepResult, StepOptions } from "@repo/workflow-sdk";
import { executeStep } from "./executeStep";
import { withTimeout } from "./utils/withTimeout";
import { toId } from "./utils/toId";
import { toName } from "./utils/toName";
import { Configuration } from "@/server/config/Configuration";

const DEFAULT_AI_TIMEOUT = 60000; // 60 seconds

/**
 * Create AI step factory function
 * Generates text or structured output using AI models
 */
export function createAiStep(
  context: RuntimeContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inngestStep: GetStepTools<any>
) {
  return async function ai<T = { text: string }>(
    idOrName: string,
    config: AiStepConfig,
    options?: StepOptions
  ): Promise<AiStepResult<T>> {
    const timeout = options?.timeout ?? DEFAULT_AI_TIMEOUT;
    const id = toId(idOrName);
    const name = toName(idOrName);

    return executeStep(
      context,
      id,
      name,
      async () => {
        const { logger } = context;
        const configuration = Configuration.getInstance();
        const apiKeys = configuration.get("apiKeys");

        // Default provider and model
        const provider = config.provider ?? "anthropic";
        const temperature = config.temperature ?? 0.7;

        logger.debug(
          { provider, model: config.model, promptLength: config.prompt.length },
          "Executing AI step"
        );

        try {
          // Get API key for provider
          const apiKey =
            provider === "anthropic"
              ? apiKeys.anthropicApiKey
              : apiKeys.openaiApiKey;

          if (!apiKey) {
            throw new Error(
              `${provider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"} not configured. Please set the environment variable.`
            );
          }

          // Select model based on provider and create model instance
          const model =
            provider === "anthropic"
              ? createAnthropic({ apiKey: apiKeys.anthropicApiKey })(
                  config.model ?? "claude-sonnet-4-5-20250929"
                )
              : createOpenAI({ apiKey: apiKeys.openaiApiKey })(
                  config.model ?? "gpt-4"
                );

          // Determine if structured output or text generation
          if (config.schema) {
            // Structured output with schema
            logger.debug("Using generateObject with schema");

            const result = await withTimeout(
              generateObject({
                model,
                // @ts-expect-error - Schema type from workflow-sdk is compatible but TypeScript can't infer it
                schema: config.schema,
                prompt: config.prompt,
                ...(config.systemPrompt && { system: config.systemPrompt }),
                ...(temperature !== undefined && { temperature }),
                ...(config.maxTokens && { maxTokens: config.maxTokens }),
              }),
              timeout,
              "AI generation"
            );

            // Note: AI SDK v5 usage tracking is handled differently
            // Usage stats may not be available in the expected format
            return {
              data: result.object as T,
              usage: undefined,
              success: true,
            };
          } else {
            // Text generation
            logger.debug("Using generateText");

            const result = await withTimeout(
              generateText({
                model,
                prompt: config.prompt,
                ...(config.systemPrompt && { system: config.systemPrompt }),
                ...(temperature !== undefined && { temperature }),
                ...(config.maxTokens && { maxTokens: config.maxTokens }),
              }),
              timeout,
              "AI generation"
            );

            // Note: AI SDK v5 usage tracking is handled differently
            // Usage stats may not be available in the expected format
            return {
              data: { text: result.text } as T,
              usage: undefined,
              success: true,
            };
          }
        } catch (error: unknown) {
          const err = error as Error;
          logger.error(
            {
              err,
              provider,
              model: config.model,
              promptLength: config.prompt.length,
            },
            "AI step failed"
          );

          return {
            data: {} as T,
            success: false,
            error: err.message,
          };
        }
      },
      inngestStep
    );
  };
}
