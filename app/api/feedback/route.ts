import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Define the request schema
const feedbackRequestSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  feedbackId: z.string().optional(), // Optional feedback ID for updates
  isPositive: z.boolean(),
  feedback: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = feedbackRequestSchema.parse(body);

    const { requestId, feedbackId, isPositive, feedback } = validatedData;

    console.log("Feedback received:", {
      feedbackId,
      requestId,
      isPositive,
      feedback,
    });

    // If feedbackId is provided, update existing feedback
    if (feedbackId) {
      const { data, error } = await supabase
        .schema("neilei_prod")
        .from("feedback")
        .update({
          is_thumbs_up: isPositive,
          feedback_text: feedback || "",
        })
        .eq("id", feedbackId)
        .select()
        .single();

      if (error) {
        console.error("Error updating feedback:", error);
        return NextResponse.json(
          { success: false, error: "Failed to update feedback" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          requestId: data.request_id,
          isPositive: data.is_thumbs_up,
          feedback: data.feedback_text,
          createdAt: data.created_at,
        },
      });
    }

    // If no feedbackId, create new feedback
    const { data, error } = await supabase
      .schema("neilei_prod")
      .from("feedback")
      .insert({
        request_id: requestId,
        is_thumbs_up: isPositive,
        feedback_text: feedback || "",
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting feedback:", error);
      return NextResponse.json(
        { success: false, error: "Failed to save feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        requestId: data.request_id,
        isPositive: data.is_thumbs_up,
        feedback: data.feedback_text,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    console.error("Error processing feedback request:", error);

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
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
