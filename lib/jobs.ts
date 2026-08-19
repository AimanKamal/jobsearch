import fs from "node:fs/promises";
import path from "node:path";
import type { JobRecord } from "@/app/model/JobAnalysis";
import crypto from "node:crypto";

const jobsPath = path.join(process.cwd(), "data", "jobs.json");

async function ensureJobsFile() {
  try {
    await fs.access(jobsPath);
  } catch {
    await fs.mkdir(path.dirname(jobsPath), { recursive: true });
    await fs.writeFile(jobsPath, "[]", "utf8");
  }
}

export async function getJobs(): Promise<JobRecord[]> {
  await ensureJobsFile();

  const content = await fs.readFile(jobsPath, "utf8");

  return JSON.parse(content);
}

export async function saveJobs(jobs: JobRecord[]) {
  await ensureJobsFile();

  await fs.writeFile(
    jobsPath,
    JSON.stringify(jobs, null, 2),
    "utf8"
  );
}

export async function addJob(jobId: string): Promise<JobRecord> {
  const jobs = await getJobs();

  const existing = jobs.find((job) => job.jobId === jobId);

  if (existing) {
    return existing;
  }

  const job: JobRecord = {
    jobId,
    title: "",
    company: "",
    location: "",
    extensions: [],
    detectedExtensions: [],
    description: "",
    jobHighlights: [],
    applyOptions: [],
    status: "queued",
    addedAt: new Date().toISOString(),
  };

  jobs.push(job);

  await saveJobs(jobs);

  return job;
}