import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { VENICE_API_KEY, VENICE_BASE_URL } from "../config";
import { fetishInferencePrompt } from "../prompts/fetish-inference";
import type { GraphState } from "../rule34-text-graph";

// LLM configuration for fetish inference
const fetishInferenceLlm = new ChatOpenAI({
  modelName: "venice-uncensored",
  openAIApiKey: VENICE_API_KEY,
  configuration: {
    baseURL: VENICE_BASE_URL,
  },
  temperature: 0.6,
  maxTokens: 500,
});

// Zod schema for fetish inference output
const fetishInferenceOutputSchema = z.object({
  suggested_kinks: z.array(
    z.object({
      kink: z.string(),
    })
  ),
  reasoning: z.string(),
});

// Function to infer kinks from the original text
export async function inferFetishes(originalText: string): Promise<string[]> {
  if (!originalText) {
    return [];
  }

  // Replace placeholder values in the prompt
  const formattedPrompt = fetishInferencePrompt.replace(
    "{{USER_TEXT}}",
    originalText
  );

  try {
    const structuredLlm = fetishInferenceLlm.withStructuredOutput(
      fetishInferenceOutputSchema,
      {
        name: "inferFetishes",
      }
    );

    const response = await structuredLlm.invoke(formattedPrompt);

    console.log("Fetish inference response:", response);

    // Extract the kinks as an array of strings
    const kinks = response.suggested_kinks.map((k) => k.kink).filter(Boolean);

    console.log("Inferred kinks:", kinks);
    return kinks;
  } catch (error) {
    console.error("Error calling Venice API for fetish inference:", error);
    return [];
  }
}

// Define the fetish inference node to suggest kinks when none are provided
export const fetishInferenceNode = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  console.log(`---FETISH INFERENCE NODE---`);
  console.log(
    `User didn't provide any kinks, suggesting some from their text.`
  );
  console.log(`Original Text: ${state.originalText.substring(0, 50)}...`);

  // Infer fetishes from the original text
  const inferredKinks = await inferFetishes(state.originalText);
  console.log(
    `Inferred Kinks: ${
      inferredKinks.length > 0 ? inferredKinks.join(", ") : "None inferred"
    }`
  );

  return {
    kinks: inferredKinks,
    kinksInferred: true,
  };
};
