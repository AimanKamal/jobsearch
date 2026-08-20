import dotenv from "dotenv";
dotenv.config({
  path: ".env.local",
});

import { getJson } from "serpapi";
import fs from "fs";
import { JobRecord } from "@/app/model/JobAnalysis";

async function main() {
  console.log("Discovery worker started.");

  const queries = [
    "full stack developer jobs malaysia",
    "software engineer jobs malaysia",
    "frontend developer jobs malaysia",
    "backend developer jobs Malaysia",
  ];

  let jobsData: JobRecord[] = [];
  // collect all jobs data from SerpApi responses

  for (const query of queries) {
    const data = await getJson({
      engine: "google_jobs",
      q: query,
      location: "Malaysia",
      api_key: process.env.SERPAPI_API_KEY,
      chips: "date_posted:yesterday",
    });

    // validate and save the data to a json file
    try {
      // get current date only
      const date = new Date().toISOString().split("T")[0];

      // check if discover_jobs-<date>.json file exists, if not create it. if exist append the data to the file
      const fileExist = fs.existsSync(`./data/discover_jobs-${date}.json`);
      if (fileExist) {
        const existingData = JSON.parse(fs.readFileSync(`./data/discover_jobs-${date}.json`, "utf-8"));
        const newData = [...existingData, data];
        fs.writeFileSync(`./data/discover_jobs-${date}.json`, JSON.stringify(newData, null, 2));
        console.log(`SerpApi data appended to discover_jobs-${date}.json`);
      } else {
        fs.writeFileSync(`./data/discover_jobs-${date}.json`, JSON.stringify([data], null, 2));
        console.log(`SerpApi data saved to discover_jobs-${date}.json`);
      }
    } catch (error) {
      console.error("Error saving SerpApi data:", error);
    }

    // extract jobs data from the SerpApi response
    if (!data.jobs_results || !Array.isArray(data.jobs_results)) {
      console.error("Invalid SerpApi response:", data);
      break;
    }
    const cleanedJobsData: JobRecord[] = data.jobs_results.map((job: any) => {
      return {
        jobId: job.job_id,
        title: job.job_title,
        company: job.company_name,
        location: job.location,
        extensions: job.extensions,
        detectedExtensions: job.detected_extensions,
        description: job.description,
        jobHighlights: job.job_highlights,
        applyOptions: job.apply_options,
        status: "queued",
        addedAt: new Date().toISOString(),
      }
    });
    jobsData = [...jobsData, ...cleanedJobsData];
  }

  // read jobs.json file
  let existingJobsData: JobRecord[] = [];
  try {
    const data = fs.readFileSync("./data/jobs.json", "utf-8");
    existingJobsData = JSON.parse(data);
  } catch (error) {
    console.error("Error reading jobs.json:", error);
  }

  // deduplicate the jobs data based on job_id
  const deduplicatedJobsData = [...existingJobsData, ...jobsData].reduce((acc: JobRecord[], job: JobRecord) => {
    if (!acc.find((j) => {
      return j.title + j.company + j.location === job.title + job.company + job.location
    })) {
      acc.push(job);
    }
    return acc;
  }, []);

  console.log(`New jobs discovered: ${
    existingJobsData.length - deduplicatedJobsData.length
  }`);

  // save the deduplicated jobs data to jobs.json file
  try {
    fs.writeFileSync("./data/jobs.json", JSON.stringify(deduplicatedJobsData, null, 2));
    console.log(`Deduplicated jobs data saved to jobs.json`);
  } catch (error) {
    console.error("Error saving deduplicated jobs data:", error);
  }
}

main().catch((error) => {
  console.error("Error in discovery worker:", error);
  process.exit(1);
});