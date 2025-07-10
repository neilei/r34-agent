import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ status: "Rule34 Frontend API is running" });
}
