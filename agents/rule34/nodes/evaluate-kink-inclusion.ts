import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { VENICE_API_KEY, VENICE_BASE_URL } from "../config";
import { evaluateKinkInclusionPrompt } from "../prompts/evaluate-kink-inclusion";
import { GraphState } from "../rule34-text-graph";

// LLM configuration for evaluation
const evaluationLlm = new ChatOpenAI({
  modelName: "venice-uncensored",
  openAIApiKey: VENICE_API_KEY,
  configuration: {
    baseURL: VENICE_BASE_URL,
  },
  temperature: 0.3,
  maxTokens: 2500,
});

// Zod schema for kink inclusion evaluation output
const kinkInclusionEvaluationSchema = z.object({
  kinkInclusion: z.object({
    score: z.number().min(0).max(10),
    rationale: z.string(),
    whatIsWorkingWell: z.array(z.string()),
    whatNeedsImprovement: z.array(z.string()),
    specificSuggestions: z.array(z.string()),
  }),
});

// Define the kink inclusion evaluation node
export const evaluateKinkInclusionNode = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  console.log(
    `---KINK INCLUSION EVALUATION NODE (Iteration ${state.iteration - 1})---`
  );

  if (!state.rewrittenText || !state.originalText) {
    return {
      kinkInclusion: 0,
      feedback: {
        horniness: state.feedback?.horniness || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
        kinkInclusion: {
          whatIsWorkingWell: [
            "Missing rewritten text or original text for evaluation",
          ],
          whatNeedsImprovement: ["Cannot evaluate without proper input text"],
          specificSuggestions: [
            "Ensure both original and rewritten text are provided",
          ],
        },
        contentPreservationScore: state.feedback?.contentPreservationScore || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
        structurePreservationScore: state.feedback
          ?.structurePreservationScore || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
      },
    };
  }

  const formattedPrompt = evaluateKinkInclusionPrompt
    .replace("{{ORIGINAL_TEXT}}", state.originalText)
    .replace("{{REWRITTEN_TEXT}}", state.rewrittenText)
    .replace("{{KINKS}}", state.kinks.join(", "));

  try {
    const structuredLlm = evaluationLlm.withStructuredOutput(
      kinkInclusionEvaluationSchema,
      {
        name: "evaluateKinkInclusion",
      }
    );

    const evaluation = await structuredLlm.invoke(formattedPrompt);

    console.log(`Kink Inclusion Score: ${evaluation.kinkInclusion.score}/10`);
    console.log(
      `Kink Inclusion Feedback: ${JSON.stringify(
        evaluation.kinkInclusion,
        null,
        2
      )}`
    );

    return {
      kinkInclusion: evaluation.kinkInclusion.score,
      feedback: {
        horniness: state.feedback?.horniness || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
        kinkInclusion: {
          whatIsWorkingWell: evaluation.kinkInclusion.whatIsWorkingWell || [
            "No positive feedback provided",
          ],
          whatNeedsImprovement: evaluation.kinkInclusion
            .whatNeedsImprovement || ["No improvement areas identified"],
          specificSuggestions: evaluation.kinkInclusion.specificSuggestions || [
            "No specific suggestions provided",
          ],
        },
        contentPreservationScore: state.feedback?.contentPreservationScore || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
        structurePreservationScore: state.feedback
          ?.structurePreservationScore || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
      },
    };
  } catch (error) {
    console.error("Error evaluating kink inclusion:", error);
    return {
      kinkInclusion: 0,
      feedback: {
        horniness: state.feedback?.horniness || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
        kinkInclusion: {
          whatIsWorkingWell: ["Error occurred during evaluation"],
          whatNeedsImprovement: ["Error occurred during evaluation"],
          specificSuggestions: [
            `Error evaluating kink inclusion: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
        },
        contentPreservationScore: state.feedback?.contentPreservationScore || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
        structurePreservationScore: state.feedback
          ?.structurePreservationScore || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
        },
      },
    };
  }
};
