import { serve } from "@hono/node-server";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { supabase } from "./config";
import { runVeniceGraph } from "./rule34-text-graph";
import { type VeniceResponse } from "./venice.types";

// Define schemas
const graphRequestSchema = z.object({
  originalText: z.string().min(1, "Original text is required"),
  kinks: z.array(z.string()).optional().default([]),
  sessionId: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      "Session ID must be a valid UUID"
    ),
  requestId: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      "Request ID must be a valid UUID"
    )
    .optional(),
});

const graphResultSchema = z.object({
  requestId: z.string(),
  veniceResponse: z.string(),
  finalAnalysis: z.string(),
  kinks: z.array(z.string()),
  horniness: z.number(),
  kinkInclusion: z.number(),
  contentPreservationScore: z.number(),
  structurePreservationScore: z.number(),
  iterations: z.number(),
});

const graphSuccessResponseSchema = z.object({
  success: z.literal(true),
  result: graphResultSchema,
});

const graphErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  details: z.array(z.any()).optional(),
});

// Infer types from schemas
type GraphResult = z.infer<typeof graphResultSchema>;
type GraphSuccessResponse = z.infer<typeof graphSuccessResponseSchema>;
type GraphErrorResponse = z.infer<typeof graphErrorResponseSchema>;

// Helper function to extract text from VeniceResponse
function extractVeniceResponseText(
  veniceResponse: VeniceResponse | undefined
): string {
  try {
    if (!veniceResponse) return "";

    // Check if it's a VeniceResponseSuccess with choices
    if (
      "choices" in veniceResponse &&
      veniceResponse.choices &&
      veniceResponse.choices.length > 0
    ) {
      const message = veniceResponse.choices[0]?.message;
      if (message && message.content) {
        return message.content;
      }
    }

    // Check if it's a VeniceErrorResponse
    if ("error" in veniceResponse) {
      return `Error: ${veniceResponse.error}`;
    }

    // Fallback to string representation
    return String(veniceResponse);
  } catch (error) {
    console.error("Error extracting venice response text:", error);
    return "Error extracting response text";
  }
}

// Initialize Hono app
const app = new Hono();

// Add CORS middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Health endpoint
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "rule34-agent-backend",
  });
});

// Rule34 graph endpoint
app.post("/rule34-graph", zValidator("json", graphRequestSchema), async (c) => {
  try {
    const {
      originalText,
      kinks,
      sessionId,
      requestId: providedRequestId,
    } = c.req.valid("json");

    // Generate request ID if not provided
    const requestId = providedRequestId || uuidv4();

    // Handle test query
    if (originalText === "prebaked-test-query") {
      console.log("Returning pre-baked response for test query.");
      const preBakedResult: GraphResult = {
        requestId: requestId,
        veniceResponse:
          "This is a pre-baked response for 'prebaked-test-query', used as a test query to confirm parts of the REST API are working.",
        finalAnalysis: "This is a pre-baked final analysis for the test query.",
        kinks: ["testing"],
        horniness: 0.1,
        kinkInclusion: 0.1,
        contentPreservationScore: 1.0,
        structurePreservationScore: 1.0,
        iterations: 1,
      };
      return c.json({
        success: true,
        result: preBakedResult,
      });
    }

    console.log("Running graph with:", {
      requestId,
      textLength: originalText.length,
      kinks,
      sessionId,
    });

    // Create session if it doesn't exist
    const { error: sessionError } = await supabase
      .schema("neilei_prod")
      .from("sessions")
      .upsert(
        {
          id: sessionId,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    if (sessionError) {
      console.error("Error creating/updating session:", sessionError);
      const errorResponse: GraphErrorResponse = {
        success: false,
        error: "Failed to create session",
      };
      return c.json(errorResponse, 500);
    }

    // Run the Venice graph
    const result = await runVeniceGraph(originalText, kinks, sessionId, 1);

    // Store the request and response in the database
    const { error: requestError } = await supabase
      .schema("neilei_prod")
      .from("requests")
      .insert({
        id: requestId,
        session_id: sessionId,
        original_input: {
          originalText,
          kinks,
        },
        response: JSON.parse(
          JSON.stringify({
            requestId: requestId,
            sessionId: result.sessionId,
            originalText: result.originalText,
            prompt: result.prompt,
            kinks: result.kinks,
            kinksInferred: result.kinksInferred,
            veniceResponse: result.veniceResponse,
            rewrittenText: result.rewrittenText,
            rationale: result.rationale,
            feedback: result.feedback,
            iteration: result.iteration,
            iterationHistory: result.iterationHistory,
            horniness: result.horniness,
            kinkInclusion: result.kinkInclusion,
            contentPreservationScore: result.contentPreservationScore,
            structurePreservationScore: result.structurePreservationScore,
          })
        ),
        allow_external_grading: false,
      });

    if (requestError) {
      console.error("Error storing request:", requestError);
      // Don't fail the request if we can't store it, just log the error
    }

    const response: GraphSuccessResponse = {
      success: true,
      result: {
        requestId: requestId,
        veniceResponse: extractVeniceResponseText(result.veniceResponse),
        finalAnalysis: result.finalAnalysis ?? "",
        kinks: result.kinks,
        horniness: result.horniness,
        kinkInclusion: result.kinkInclusion,
        contentPreservationScore: result.contentPreservationScore,
        structurePreservationScore: result.structurePreservationScore,
        iterations: result.iteration,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error("Error processing request:", error);

    if (error instanceof z.ZodError) {
      const errorResponse: GraphErrorResponse = {
        success: false,
        error: "Invalid request data",
        details: error.errors,
      };
      return c.json(errorResponse, 400);
    }

    const errorResponse: GraphErrorResponse = {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
    return c.json(errorResponse, 500);
  }
});

// Export types
export type { GraphErrorResponse, GraphResult, GraphSuccessResponse };

// Start server
const port = parseInt(process.env.PORT || "3001");
console.log(`Server running on port ${port}`);
serve({
  fetch: app.fetch,
  port,
});
