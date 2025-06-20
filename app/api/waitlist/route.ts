import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Define the request schema
const waitlistRequestSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = waitlistRequestSchema.parse(body);

    const { email } = validatedData;

    // Insert email into the waitlist
    const { data, error } = await supabase
      .schema("neilei_prod")
      .from("waitlist")
      .insert({
        email: email,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting into waitlist:", error);

      // Check if it's a duplicate email error
      if (error.code === "23505") {
        return NextResponse.json(
          { success: false, error: "Email already exists in waitlist" },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { success: false, error: "Failed to add to waitlist" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        email: data.email,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    console.error("Error processing waitlist request:", error);

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
