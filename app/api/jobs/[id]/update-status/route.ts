

import { getJobs, saveJobs } from "@/lib/jobs";
import { NextRequest } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    console.log(`Mark as applied for job with ID: ${id}`);

    // Change the job status to "applied"
    // get the jobs from the database or storage
    const jobs = await getJobs();

    const jobIndex = jobs.findIndex((job) => job.jobId === id);

    if (jobIndex === -1) {
      return new Response(JSON.stringify({ error: "Job not found" }), { status: 404 });
    }

    jobs[jobIndex].status = status;

    // Save the updated jobs back to the database or storage
    await saveJobs(jobs);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Failed to mark job as applied" }), { status: 500 });
  }
};