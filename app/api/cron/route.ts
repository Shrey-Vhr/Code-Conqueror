import { NextRequest, NextResponse } from "next/server";
import { sweepOverdue } from "@/lib/overdue";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const secretHeader = request.headers.get("x-cron-secret");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

    if (secretHeader !== cronSecret && bearer !== cronSecret) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or missing cron secret." },
        { status: 401 }
      );
    }
  }

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

export async function POST(request: NextRequest) {
  return GET(request);
}
