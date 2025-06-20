import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { VENICE_API_KEY, VENICE_BASE_URL } from "../config";
import { evaluateHorninessPrompt } from "../prompts/evaluate-horniness";
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

// Zod schema for horniness evaluation output
const horninessEvaluationSchema = z.object({
  horniness: z.object({
    score: z.number().min(0).max(10),
    rationale: z.string(),
    whatIsWorkingWell: z.array(z.string()),
    whatNeedsImprovement: z.array(z.string()),
    specificSuggestions: z.array(z.string()),
  }),
});

// Define the horniness evaluation node
export const evaluateHorninessNode = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  console.log(
    `---HORNINESS EVALUATION NODE (Iteration ${state.iteration - 1})---`
  );

  if (!state.rewrittenText || !state.originalText) {
    return {
      horniness: 0,
      feedback: {
        horniness: {
          whatIsWorkingWell: [
            "Missing rewritten text or original text for evaluation",
          ],
          whatNeedsImprovement: ["Cannot evaluate without proper input text"],
          specificSuggestions: [
            "Ensure both original and rewritten text are provided",
          ],
        },
        kinkInclusion: state.feedback?.kinkInclusion || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
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

  const formattedPrompt = evaluateHorninessPrompt
    .replace("{{ORIGINAL_TEXT}}", state.originalText)
    .replace("{{REWRITTEN_TEXT}}", state.rewrittenText);

  try {
    const structuredLlm = evaluationLlm.withStructuredOutput(
      horninessEvaluationSchema,
      {
        name: "evaluateHorniness",
      }
    );

    const evaluation = await structuredLlm.invoke(formattedPrompt);

    console.log(`Horniness Score: ${evaluation.horniness.score}/10`);
    console.log(
      `Horniness Feedback: ${JSON.stringify(evaluation.horniness, null, 2)}`
    );

    return {
      horniness: evaluation.horniness.score,
      feedback: {
        horniness: {
          whatIsWorkingWell: evaluation.horniness.whatIsWorkingWell || [
            "No positive feedback provided",
          ],
          whatNeedsImprovement: evaluation.horniness.whatNeedsImprovement || [
            "No improvement areas identified",
          ],
          specificSuggestions: evaluation.horniness.specificSuggestions || [
            "No specific suggestions provided",
          ],
        },
        kinkInclusion: state.feedback?.kinkInclusion || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
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
    console.error("Error evaluating horniness:", error);
    return {
      horniness: 0,
      feedback: {
        horniness: {
          whatIsWorkingWell: ["Error occurred during evaluation"],
          whatNeedsImprovement: ["Error occurred during evaluation"],
          specificSuggestions: [
            `Error evaluating horniness: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ],
        },
        kinkInclusion: state.feedback?.kinkInclusion || {
          whatIsWorkingWell: [],
          whatNeedsImprovement: [],
          specificSuggestions: [],
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
