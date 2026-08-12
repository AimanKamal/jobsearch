import { NextRequest, NextResponse } from "next/server";
import { generateCoverLetter } from "@/app/lib/llm";
import type { JobAnalysis } from "@/app/model/JobAnalysis";

export async function POST(request: NextRequest) {
  try {
    const { analysis } = await request.json();

    if (!analysis) {
      return NextResponse.json(
        { error: "Job analysis is required" },
        { status: 400 }
      );
    }

    const coverLetter = await generateCoverLetter(
      analysis as JobAnalysis
    );

    return NextResponse.json({
      success: true,
      coverLetter,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to generate cover letter" },
      { status: 500 }
    );
  }
}