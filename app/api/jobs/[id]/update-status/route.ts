
import type { RouteContext } from "@/lib/api";
import { getJobs, saveJobs } from "@/lib/jobs";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { status } = await request.json();
    const { id } = await context.params;

    console.log(`Updating status for job with ID: ${id} to ${status}`);

    // Change the job status to the provided status
    // get the jobs from the database or storage
    const jobs = await getJobs();

    const jobIndex = jobs.findIndex((job) => job.jobId === id);

    if (jobIndex === -1) {
      return new NextResponse(JSON.stringify({ error: "Job not found" }), { status: 404 });
    }

    jobs[jobIndex].status = status;

    // Save the updated jobs back to the database or storage
    await saveJobs(jobs);

    return new NextResponse(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new NextResponse(JSON.stringify({ error: "Failed to update job status" }), { status: 500 });
  }
};