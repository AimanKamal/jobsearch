
import type { RouteContext } from "@/lib/api";
import { getJobs, saveJobs } from "@/lib/jobs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    console.log(`Resetting job with ID: ${id}`);

    // Reset the job status to "queued" and clear any previous analysis or error
    // get the jobs from the database or storage
    const jobs = await getJobs();

    const jobIndex = jobs.findIndex((job) => job.jobId === id);

    if (jobIndex === -1) {
      return new NextResponse(JSON.stringify({ error: "Job not found" }), { status: 404 });
    }

    jobs[jobIndex].status = "queued";
    jobs[jobIndex].analysis = undefined;
    jobs[jobIndex].error = undefined;
    jobs[jobIndex].startedAt = undefined;
    jobs[jobIndex].completedAt = undefined;

    // Save the updated jobs back to the database or storage
    await saveJobs(jobs);

    return new NextResponse(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new NextResponse(JSON.stringify({ error: "Failed to reset job" }), { status: 500 });
  }
};