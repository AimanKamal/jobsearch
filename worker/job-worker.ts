import { getJobs, saveJobs } from "@/lib/jobs";
import { analyzeJob } from "@/lib/llm";
import { extractPageText } from "@/lib/llm";

const COOLDOWN = process.env.SLEEP_TIME_MS ? parseInt(process.env.SLEEP_TIME_MS) : 5000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processNextJob() {
  const jobs = await getJobs();

  const job = jobs.find((job) => job.status === "queued");

  if (!job) {
    return false;
  }

  console.log(`Analyzing: ${job.url}`);

  job.status = "processing";
  job.startedAt = new Date().toISOString();

  await saveJobs(jobs);

  try {
    const response = await fetch(job.url);

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();

    const jobText = extractPageText(html);

    const analysis = await analyzeJob(jobText.bodyText);

    job.status = "completed";
    job.completedAt = new Date().toISOString();
    job.analysis = analysis;

    await saveJobs(jobs);

    console.log(
      `Completed: ${analysis.job.title} (${analysis.match.score}%)`
    );
  } catch (error) {
    job.status = "failed";
    job.error =
      error instanceof Error
        ? error.message
        : "Unknown error";

    await saveJobs(jobs);

    console.error(`Failed: ${job.url}`, error);
  }

  return true;
}

async function main() {
  console.log("JobSearch worker started.");

  while (true) {
    const processed = await processNextJob();

    if (!processed) {
      await sleep(5000);
      continue;
    }

    console.log("Cooling down for 5 minutes...");

    await sleep(COOLDOWN);
  }
}

main().catch(console.error);