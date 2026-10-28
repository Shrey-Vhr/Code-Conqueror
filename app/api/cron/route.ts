import { NextResponse } from "next/server";
import { sweepOverdue } from "@/lib/overdue";

export async function GET() {
  try {
    const result = await sweepOverdue();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute overdue sweep" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
