import { runVeniceGraph } from "@/agents/rule34/rule34-text-graph";
import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Define the request schema
const graphRequestSchema = z.object({
  originalText: z.string().min(1, "Original text is required"),
  kinks: z.array(z.string()).optional().default([]),
  sessionId: z
    .string()
    .regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      "Session ID must be a valid UUID"
    ),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const validatedData = graphRequestSchema.parse(body);

    const { originalText, kinks, sessionId } = validatedData;

    console.log("Running graph with:", {
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
      return NextResponse.json(
        { success: false, error: "Failed to create session" },
        { status: 500 }
      );
    }

    // Run the Venice graph
    const result = await runVeniceGraph(originalText, kinks, sessionId);

    // Store the request and response in the database
    const { error: requestError } = await supabase
      .schema("neilei_prod")
      .from("requests")
      .insert({
        id: result.requestId,
        session_id: sessionId,
        original_input: {
          originalText,
          kinks,
        },
        response: JSON.parse(
          JSON.stringify({
            requestId: result.requestId,
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
            kinkScore: result.kinkInclusion,
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

    return NextResponse.json({
      success: true,
      result: {
        requestId: result.requestId,
        veniceResponse: result.veniceResponse,
        finalAnalysis: result.finalAnalysis,
        kinks: result.kinks,
        horniness: result.horniness,
        kinkScore: result.kinkScore,
        contentPreservationScore: result.contentPreservationScore,
        structurePreservationScore: result.structurePreservationScore,
        iterations: result.iteration,
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
