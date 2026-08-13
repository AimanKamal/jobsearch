import { NextRequest, NextResponse } from "next/server";
import { addJob, getJobs } from "@/lib/jobs";

export async function GET() {
  const jobs = await getJobs();

  return NextResponse.json(jobs);
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const job = await addJob(url);

    return NextResponse.json(job);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to add job" },
      { status: 500 }
    );
  }
}