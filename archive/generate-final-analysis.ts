import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { GraphState } from "../apps/agent/rule34-text-graph";
import { finalAnalysisPrompt } from "./final-analysis";

const VENICE_BASE_URL = "https://api.venice.ai/api/v1/";

// LLM configuration for final analysis
const analysisLlm = new ChatOpenAI({
  modelName: "venice-uncensored",
  openAIApiKey: process.env.VENICE_API_KEY || "",
  configuration: {
    baseURL: VENICE_BASE_URL,
  },
  temperature: 0.4,
  maxTokens: 1500,
});

// Zod schema for analysis output
const analysisOutputSchema = z.object({
  analysis: z.string(),
});

// Generate a final analysis of the content and kink inclusion
export async function generateFinalAnalysis(
  originalText: string,
  rewrittenText: string,
  kinks: string[],
  horniness: number,
  kinkInclusion: number,
  contentPreservationScore: number,
  iterations: number
): Promise<string> {
  const formattedPrompt = finalAnalysisPrompt
    .replace("{{ORIGINAL_TEXT}}", originalText)
    .replace("{{REWRITTEN_TEXT}}", rewrittenText)
    .replace("{{KINKS}}", kinks.join(", "))
    .replace("{{ITERATIONS}}", iterations.toString())
    .replace("{{HORNINESS}}", horniness.toString())
    .replace("{{KINK_SCORE}}", kinkInclusion.toString())
    .replace(
      "{{CONTENT_PRESERVATION_SCORE}}",
      contentPreservationScore.toString()
    );

  try {
    const structuredLlm = analysisLlm.withStructuredOutput(
      analysisOutputSchema,
      {
        name: "generateFinalAnalysis",
      }
    );

    const response = await structuredLlm.invoke(formattedPrompt);
    return response.analysis;
  } catch (error) {
    console.error("Error generating analysis:", error);
    return `Error generating analysis: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}

// Define the analysis node for final report
export const analysisNode = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  console.log(`---ANALYSIS NODE---`);
  console.log(`Total iterations recorded: ${state.iterationHistory.length}`);

  if (!state.rewrittenText || !state.originalText) {
    return {
      finalAnalysis: "Missing rewritten text or original text for analysis.",
    };
  }

  const analysis = await generateFinalAnalysis(
    state.originalText,
    state.rewrittenText,
    state.kinks,
    state.horniness,
    state.kinkInclusion,
    state.contentPreservationScore,
    state.iteration - 1
  );

  return {
    finalAnalysis: analysis,
  };
};
