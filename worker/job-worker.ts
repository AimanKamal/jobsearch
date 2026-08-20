import { JobContext } from "@/app/model/JobAnalysis";
import { getJobs, isOnlyBebee, saveJobs } from "@/lib/jobs";
import { analyzeJob } from "@/lib/llm";
import { isStopping, registerController, requestShutdown, unregisterController } from "@/lib/shutdown";

// graceful shutdown handling
process.on(
  "SIGINT",
  requestShutdown
);

process.on(
  "SIGTERM",
  requestShutdown
);

const COOLDOWN = process.env.SLEEP_TIME_MS ? parseInt(process.env.SLEEP_TIME_MS) : 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, ms);

    const interval = setInterval(() => {
      if (isStopping()) {
        clearTimeout(timeout);
        clearInterval(interval);
        resolve();
      }
    }, 250);
  });
}

export function formatDuration(ms: number): string { 
  const seconds = Math.round(ms / 1000); 
  if (seconds < 60) { 
    return `${seconds}s`; 
  }
  
  const minutes = Math.floor(seconds / 60); 
  const remainingSeconds = seconds % 60; 
  return `${minutes}m ${remainingSeconds}s`; 
}

async function processNextJob() {
  const jobs = await getJobs();

  const job = jobs.find((job) => job.status === "queued");

  if (!job) {
    return false;
  }
  
  // skip if applyOptions is only BeBee
  if (isOnlyBebee(job)) {
    job.status = "skipped";
    await saveJobs(jobs);
    return false;
  }

  const controller = new AbortController();

  registerController(
    controller
  );

  const timeout = setTimeout(() => {
    controller.abort(
      "LLM request timeout"
    );
  }, process.env.LLM_TIMEOUT_MS ? parseInt(process.env.LLM_TIMEOUT_MS) : 240000);

  job.status = "processing";
  job.startedAt = new Date().toISOString();

  try {
    console.log(`Processing job: ${job.title} - ${job.company}`);

    // analyse the job
    const jobContext: JobContext = {
      title: job.title,
      company: job.company,
      location: job.location,
      extensions: job.extensions,
      detectedExtensions: job.detectedExtensions,
      description: job.description,
      jobHighlights: job.jobHighlights,
    };
    
    const analysis = await analyzeJob(jobContext, controller.signal);
    
    // set status and save analysis
    job.status = "completed";
    job.completedAt = new Date().toISOString();
    job.analysis = analysis;

    console.log(
      `Completed: ${analysis.job.title} (${analysis.match.score}%)`
    );
  } catch (error) {
    if (isStopping()) {
      console.log(
        `Job interrupted: ${job.title} - ${job.company} (${controller.signal.reason})`
      );

      job.status = "queued";
      delete job.startedAt;
    } else {
      job.status = "failed";
      job.error =
        error instanceof Error
          ? error.message
          : "Unknown error";
  
      console.error(`Failed: ${job.jobId}`, error);
    }
  } finally {
    // clean up
    clearTimeout(timeout);
    unregisterController(
      controller
    );

    // save jobs
    await saveJobs(jobs);
  }

  return true;
}

async function main() {
  console.log("JobSearch worker started.");

  while (true) {
    if (isStopping()) {
      console.log("Worker is stopping. Exiting...");
      break;
    }
    
    const processed = await processNextJob();

    // cooldown before processing the next job in minutes and seconds
    const cooldownMs = process.env.SLEEP_TIME_MS ? parseInt(process.env.SLEEP_TIME_MS) : 300000;
    console.log(`Cooling down for ${formatDuration(cooldownMs)}...`);
    await sleep(cooldownMs);

    if (!processed) {
      continue;
    }

  }
}

main().catch(console.error);