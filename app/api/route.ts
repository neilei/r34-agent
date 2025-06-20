import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: "Rule34 API is running" });
}
