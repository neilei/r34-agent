import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { VENICE_API_KEY, VENICE_BASE_URL } from "../config";
import type { GraphState } from "../rule34-text-graph";

// Zod schema for the detailed feedback object
export const feedbackDetailsSchema = z.object({
  whatIsWorkingWell: z.array(z.string()),
  whatNeedsImprovement: z.array(z.string()),
  specificSuggestions: z.array(z.string()),
});

export type FeedbackDetails = z.infer<typeof feedbackDetailsSchema>;

// Default feedback object for initialization and error states
export const defaultFeedback: FeedbackDetails = {
  whatIsWorkingWell: [],
  whatNeedsImprovement: [],
  specificSuggestions: [],
};

// LLM configuration for all evaluation nodes
const evaluationLlm = new ChatOpenAI({
  modelName: "venice-uncensored",
  openAIApiKey: VENICE_API_KEY,
  configuration: {
    baseURL: VENICE_BASE_URL,
  },
  temperature: 0.3,
  maxTokens: 2500,
});

/**
 * Creates a Zod schema for evaluating a specific dimension.
 * @param key The key for the evaluation dimension (e.g., "horniness").
 * @returns A Zod schema for the evaluation.
 */
export const createEvaluationSchema = (key: string) =>
  z.object({
    [key]: z.object({
      score: z.number().min(0).max(10),
      rationale: z.string(),
      whatIsWorkingWell: z.array(z.string()),
      whatNeedsImprovement: z.array(z.string()),
      specificSuggestions: z.array(z.string()),
    }),
  });

interface EvaluationNodeConfig {
  nodeName: string;
  scoreKey: keyof GraphState;
  feedbackKey: keyof NonNullable<GraphState["feedback"]>;
  schemaKey: string;
  prompt: string;
  schema: z.ZodObject<z.ZodRawShape>;
  extraPromptReplacements?: (prompt: string, state: GraphState) => string;
}

/**
 * Creates an evaluation node for the graph.
 * @param config The configuration for the evaluation node.
 * @returns An async function representing the evaluation node.
 */
export const createEvaluationNode =
  ({
    nodeName,
    scoreKey,
    feedbackKey,
    schemaKey,
    prompt,
    schema,
    extraPromptReplacements,
  }: EvaluationNodeConfig) =>
  async (state: GraphState): Promise<Partial<GraphState>> => {
    console.log(`---${nodeName} (Iteration ${state.iteration - 1})---`);

    if (!state.rewrittenText || !state.originalText) {
      const errorMessage =
        "Missing rewritten text or original text for evaluation";
      const feedbackUpdate: Partial<NonNullable<GraphState["feedback"]>> = {
        [feedbackKey]: {
          whatIsWorkingWell: [errorMessage],
          whatNeedsImprovement: ["Cannot evaluate without proper input text"],
          specificSuggestions: [
            "Ensure both original and rewritten text are provided",
          ],
        },
      };
      return {
        [scoreKey]: 0,
        feedback: feedbackUpdate,
      };
    }

    let formattedPrompt = prompt
      .replace("{{ORIGINAL_TEXT}}", state.originalText)
      .replace("{{REWRITTEN_TEXT}}", state.rewrittenText);

    if (extraPromptReplacements) {
      formattedPrompt = extraPromptReplacements(formattedPrompt, state);
    }

    try {
      const structuredLlm = evaluationLlm.withStructuredOutput(schema, {
        name: `evaluate${
          feedbackKey.charAt(0).toUpperCase() + feedbackKey.slice(1)
        }`,
      });

      const evaluation = await structuredLlm.invoke(formattedPrompt);
      const result = evaluation[schemaKey];

      console.log(`${nodeName} Score: ${result.score}/10`);
      console.log(`${nodeName} Feedback: ${JSON.stringify(result, null, 2)}`);

      const feedbackUpdate: Partial<NonNullable<GraphState["feedback"]>> = {
        [feedbackKey]: {
          whatIsWorkingWell: result.whatIsWorkingWell || [
            "No positive feedback provided",
          ],
          whatNeedsImprovement: result.whatNeedsImprovement || [
            "No improvement areas identified",
          ],
          specificSuggestions: result.specificSuggestions || [
            "No specific suggestions provided",
          ],
        },
      };

      return {
        [scoreKey]: result.score,
        feedback: feedbackUpdate,
      };
    } catch (error) {
      console.error(`Error in ${nodeName}:`, error);
      const feedbackUpdate: Partial<NonNullable<GraphState["feedback"]>> = {
        [feedbackKey]: {
          whatIsWorkingWell: ["Error occurred during evaluation"],
          whatNeedsImprovement: ["Error occurred during evaluation"],
          specificSuggestions: [
            `Error in ${nodeName}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
        },
      };
      return {
        [scoreKey]: 0,
        feedback: feedbackUpdate,
      };
    }
  };
