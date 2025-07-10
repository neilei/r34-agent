import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { VENICE_API_KEY, VENICE_BASE_URL } from "../config";
import { grokPass2Prompt } from "../prompts/rule34-text-generation";
import type { GraphState } from "../rule34-text-graph";
import type { VeniceResponse } from "../venice.types";

// LLM configuration for rule34 text generation
const rule34GenerationLlm = new ChatOpenAI({
  modelName: "venice-uncensored",
  openAIApiKey: VENICE_API_KEY,
  configuration: {
    baseURL: VENICE_BASE_URL,
  },
  temperature: 0.5,
  maxTokens: 1000,
  frequencyPenalty: 1, //(Default: 0) Number between -2.0 and 2.0. Positive values penalize new tokens based on their existing frequency in the text so far, decreasing the model's likelihood to repeat the same line verbatim.
  presencePenalty: 1, //(Default: 0) Number between -2.0 and 2.0. Positive values penalize new tokens based on whether they appear in the text so far, increasing the model's likelihood to talk about new topics.
});

// Zod schema for rule34 text generation output
const rule34GenerationOutputSchema = z.object({
  rewritten_text: z.string(),
  rationale: z.string(),
});

// Function to call Venice API to generate Rule34 text
export async function generateRule34Text(
  originalText: string,
  kinks: string[] = [],
  feedback:
    | Partial<{
        horniness: {
          whatIsWorkingWell: string[];
          whatNeedsImprovement: string[];
          specificSuggestions: string[];
        };
        kinkInclusion: {
          whatIsWorkingWell: string[];
          whatNeedsImprovement: string[];
          specificSuggestions: string[];
        };
        contentPreservationScore: {
          whatIsWorkingWell: string[];
          whatNeedsImprovement: string[];
          specificSuggestions: string[];
        };
        structurePreservationScore: {
          whatIsWorkingWell: string[];
          whatNeedsImprovement: string[];
          specificSuggestions: string[];
        };
      }>
    | undefined = undefined,
  previousRewrittenText: string | undefined = undefined,
  scores:
    | {
        horniness: number;
        kinkInclusion: number;
        contentPreservationScore: number;
        structurePreservationScore: number;
      }
    | undefined = undefined,
  minScores: {
    horniness: number;
    kinkInclusion: number;
    contentPreservationScore: number;
    structurePreservationScore: number;
  }
): Promise<string> {
  if (!originalText) {
    return "No original text provided to process.";
  }

  // Replace placeholder values in the grokPassPrompt
  let formattedPrompt = grokPass2Prompt
    .replace("{{USER_TEXT}}", originalText)
    .replace("{{KINKS}}", kinks.join(", "));

  // Add enhanced feedback if available
  if (
    feedback &&
    previousRewrittenText &&
    scores &&
    feedback.horniness &&
    feedback.kinkInclusion &&
    feedback.contentPreservationScore &&
    feedback.structurePreservationScore
  ) {
    // Identify the lowest scoring areas that need the most attention
    const scoreEntries = [
      {
        name: "horniness",
        score: scores.horniness,
        threshold: minScores.horniness,
      },
      {
        name: "kinkInclusion",
        score: scores.kinkInclusion,
        threshold: minScores.kinkInclusion,
      },
      {
        name: "contentPreservationScore",
        score: scores.contentPreservationScore,
        threshold: minScores.contentPreservationScore,
      },
      {
        name: "structurePreservationScore",
        score: scores.structurePreservationScore,
        threshold: minScores.structurePreservationScore,
      },
    ];

    const lowScores = scoreEntries
      .filter((s) => s.score < s.threshold)
      .sort((a, b) => a.score - b.score);
    const criticalAreas = lowScores.map((s) => s.name);

    formattedPrompt += `
\n\n===== REVISION INSTRUCTIONS =====

Your previous response:
"""
${previousRewrittenText}
"""

CURRENT SCORES AND PRIORITY AREAS:
${scoreEntries
  .map(
    (s) =>
      `${s.name}: ${s.score}/10 ${
        s.score < s.threshold ? "❌ NEEDS ATTENTION" : "✅"
      }`
  )
  .join("\n")}

${
  criticalAreas.length > 0
    ? `
🚨 CRITICAL PRIORITY AREAS (focus most effort here):
${criticalAreas.map((area) => `- ${area.replace("Score", "")}`).join("\n")}

These areas scored below threshold and need significant improvement. Prioritize implementing their suggestions.
`
    : "All areas are meeting thresholds - focus on balanced improvements."
}

Detailed feedback from evaluator by category:

🔥 HORNINESS FEEDBACK: ${
      scores.horniness < minScores.horniness ? "🚨 CRITICAL PRIORITY" : ""
    }
What's working well:
${feedback.horniness.whatIsWorkingWell
  .map((item, index) => `${index + 1}. ${item}`)
  .join("\n")}

What needs improvement:
${feedback.horniness.whatNeedsImprovement
  .map((item, index) => `${index + 1}. ${item}`)
  .join("\n")}

Specific suggestions:
${feedback.horniness.specificSuggestions
  .map((item, index) => `${index + 1}. ${item}`)
  .join("\n")}

🎯 KINK INCORPORATION FEEDBACK: ${
      scores.kinkInclusion < minScores.kinkInclusion
        ? "🚨 CRITICAL PRIORITY"
        : ""
    }
What's working well:
${feedback.kinkInclusion.whatIsWorkingWell
  .map((item, index) => `${index + 1}. ${item}`)
  .join("\n")}

What needs improvement:
${feedback.kinkInclusion.whatNeedsImprovement
  .map((item, index) => `${index + 1}. ${item}`)
  .join("\n")}

Specific suggestions:
${feedback.kinkInclusion.specificSuggestions
  .map((item, index) => `${index + 1}. ${item}`)
  .join("\n")}

📝 CONTENT PRESERVATION FEEDBACK: ${
      scores.contentPreservationScore < minScores.contentPreservationScore
        ? "🚨 CRITICAL PRIORITY"
        : ""
    }
What's working well:
${feedback.contentPreservationScore.whatIsWorkingWell
  .map((item, index) => `${index + 1}. ${item}`)
  .join("\n")}

What needs improvement:
${feedback.contentPreservationScore.whatNeedsImprovement
  .map((item, index) => `${index + 1}. ${item}`)
  .join("\n")}

Specific suggestions:
${feedback.contentPreservationScore.specificSuggestions
  .map((item, index) => `${index + 1}. ${item}`)
  .join("\n")}

📐 STRUCTURE PRESERVATION FEEDBACK: ${
      scores.structurePreservationScore < minScores.structurePreservationScore
        ? "🚨 CRITICAL PRIORITY"
        : ""
    }
What's working well:
${feedback.structurePreservationScore.whatIsWorkingWell
  .map((item, index) => `${index + 1}. ${item}`)
  .join("\n")}

What needs improvement:
${feedback.structurePreservationScore.whatNeedsImprovement
  .map((item, index) => `${index + 1}. ${item}`)
  .join("\n")}

Specific suggestions:
${feedback.structurePreservationScore.specificSuggestions
  .map((item, index) => `${index + 1}. ${item}`)
  .join("\n")}

IMPORTANT REVISION GUIDELINES:
1. PRIORITIZE CRITICAL AREAS: Focus 70% of your effort on areas marked as "CRITICAL PRIORITY"
2. Address each specific feedback point directly in the relevant category
3. Maintain and expand on what's working well in each area
4. For low-scoring areas, implement ALL specific suggestions aggressively
5. For high-scoring areas, make subtle improvements while maintaining strengths
6. Balance all four criteria: horniness, kink incorporation, content preservation, and structure preservation
7. Enhance incorporation of the requested kinks: "${kinks.join(", ")}"
8. Keep the original subjects and concepts intact (content preservation)
9. Maintain the original length, format, and presentation style (structure preservation)

Your task is to revise your previous response applying these targeted guidelines. Focus most heavily on critical priority areas. Return only the revised text.`;
  }

  try {
    const structuredLlm = rule34GenerationLlm.withStructuredOutput(
      rule34GenerationOutputSchema,
      {
        name: "generateRule34Text",
      }
    );

    const response = await structuredLlm.invoke(formattedPrompt);

    console.log("Rule34 generation response:", response);

    // Return the structured response as JSON string to maintain compatibility
    return JSON.stringify(response);
  } catch (error) {
    console.error("Error calling Venice API:", error);
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

// Define the Venice node as an async function
export const generateRule34TextNode = async (
  state: GraphState
): Promise<Partial<GraphState>> => {
  console.log(`---VENICE NODE (Iteration ${state.iteration})---`);
  console.log(`Kinks: ${state.kinks || "None specified"}`);
  console.log(`Previous iterations: ${state.iterationHistory.length}`);

  // Type guard to ensure feedback is fully formed
  const isFeedbackComplete = (
    feedback: any
  ): feedback is {
    horniness: {
      whatIsWorkingWell: string[];
      whatNeedsImprovement: string[];
      specificSuggestions: string[];
    };
    kinkInclusion: {
      whatIsWorkingWell: string[];
      whatNeedsImprovement: string[];
      specificSuggestions: string[];
    };
    contentPreservationScore: {
      whatIsWorkingWell: string[];
      whatNeedsImprovement: string[];
      specificSuggestions: string[];
    };
    structurePreservationScore: {
      whatIsWorkingWell: string[];
      whatNeedsImprovement: string[];
      specificSuggestions: string[];
    };
  } => {
    return (
      feedback &&
      feedback.horniness &&
      feedback.kinkInclusion &&
      feedback.contentPreservationScore &&
      feedback.structurePreservationScore
    );
  };

  const feedbackForGeneration =
    state.iteration > 0 && isFeedbackComplete(state.feedback)
      ? state.feedback
      : undefined;

  // Pass feedback and previous response if we're beyond the first iteration
  const veniceApiResponse = await generateRule34Text(
    state.originalText,
    state.kinks,
    feedbackForGeneration,
    state.iteration > 0 ? state.rewrittenText : undefined,
    state.iteration > 0
      ? {
          horniness: state.horniness,
          kinkInclusion: state.kinkInclusion,
          contentPreservationScore: state.contentPreservationScore,
          structurePreservationScore: state.structurePreservationScore,
        }
      : undefined,
    state.minScores
  );

  // Parse the JSON response
  let rewrittenText: string | undefined;
  let rationale: string | undefined;
  let veniceResponse: VeniceResponse | undefined;

  try {
    const parsedResponse: { rewritten_text: string; rationale: string } =
      JSON.parse(veniceApiResponse);
    // Basic validation to check if it matches the expected structure
    if (
      parsedResponse &&
      parsedResponse.rewritten_text &&
      parsedResponse.rationale
    ) {
      rewrittenText = parsedResponse.rewritten_text;
      rationale = parsedResponse.rationale;

      // Construct a mock VeniceResponseSuccess object to satisfy the graph state
      veniceResponse = {
        choices: [
          {
            finish_reason: "stop",
            index: 0,
            logprobs: null,
            message: {
              content: rewrittenText,
              reasoning_content: rationale,
              role: "assistant",
              tool_calls: [],
            },
            stop_reason: "stop",
          },
        ],
        created: Date.now(),
        id: "mock-id",
        model: "venice-uncensored",
        object: "chat.completion",
        prompt_logprobs: null,
        usage: {
          completion_tokens: 0,
          prompt_tokens: 0,
          prompt_tokens_details: null,
          total_tokens: 0,
        },
        venice_parameters: {
          include_venice_system_prompt: true,
          include_search_results_in_stream: false,
          web_search_citations: [],
          enable_web_search: "false",
          enable_web_citations: false,
          strip_thinking_response: true,
          disable_thinking: true,
          character_slug: "default",
        },
      };
    } else {
      // Fallback for non-structured or unexpected JSON
      rewrittenText = veniceApiResponse;
      rationale = "Response was not in the expected structured format.";
    }
  } catch (error) {
    console.error("Failed to parse JSON response from Venice API:", error);
    console.error("Raw response:", veniceApiResponse);
    // Fallback: treat the entire response as rewritten text
    rewrittenText = veniceApiResponse;
    rationale = "Failed to parse JSON response - using raw response as text";
  }

  return {
    veniceResponse,
    rewrittenText,
    rationale,
    iteration: state.iteration + 1,
    iterationHistory: [
      ...state.iterationHistory,
      {
        iteration: state.iteration,
        rewrittenText: rewrittenText || "",
        rationale: rationale || "",
      },
    ],
  };
};
