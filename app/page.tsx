"use client";

import { useState, useEffect } from "react";
import { JobAnalysis, JobRecord } from "./model/JobAnalysis";
import CollapsibleSection from "./components/CollapsibleSection";
import { TbOutbound } from "react-icons/tb";
import { MetricContainer } from "./components/MetricContainer";

const fetchJobs = async (): Promise<{ 
  jobRecords: JobRecord[]; jobAnalyses: JobAnalysis[] 
}> => {
  const jobRecords: JobRecord[] = await fetch("/api/jobs")
    .then((res) => res.json())
    .catch((err) => {
      console.error("Failed to fetch jobs:", err);
      return [];
    });

  // filter job records to job analysis objects. if no analysis exists, skip the job record
  const jobAnalyses: JobAnalysis[] = jobRecords
    .filter((job) => job.analysis)
    .map((job) => job.analysis as JobAnalysis);

  // sort job analyses by match score in descending order
  jobAnalyses.sort((a, b) => b.match.score - a.match.score);

  return { jobRecords, jobAnalyses };
}

export default function Home() {
  const [jobUrl, setJobUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [jobRecords, setJobRecords] = useState<JobRecord[]>([]);
  const [jobs, setJobs] = useState<JobAnalysis[]>([]);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState<boolean>(false);

  const metricItems = [
    { title: "Total Jobs", value: jobRecords.length },
    { title: "Applied Jobs", value: jobRecords.filter((job) => job.status === "applied").length },
    { title: "Rejected Jobs", value: jobRecords.filter((job) => job.status === "rejected").length },
    { title: "Completed Analysis", value: jobRecords.filter((job) => job.status === "completed").length },
    { title: "Jobs in Queue", value: jobRecords.filter((job) => ["queued", "processing"].includes(job.status)).length },
    { title: "Failed Jobs", value: jobRecords.filter((job) => job.status === "failed").length },
    { title: "Skipped Jobs", value: jobRecords.filter((job) => job.status === "skipped").length },
  ];

  useEffect (() => {
    fetchJobs().then(({ jobRecords, jobAnalyses }) => {
      setJobRecords(jobRecords);
      setJobs(jobAnalyses);
    });
  }, []);

  const handleSearch = async () => {
    console.log("Searching for job at URL:", jobUrl);
    try {
      setLoading(true);
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: jobUrl }),
      });
      const data = await response.json();
      console.log("Job analysis result:", data);
    } catch (error) {
      console.error("Error searching for job:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCoverLetter = async (jobIdx: number) => {
    console.log("Generating cover letter for job at URL:", jobUrl);
    try {
      setLoading(true);
      const response = await fetch("/api/jobs/cover-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ analysis: jobs[jobIdx] }),
      });
      const data = await response.json();
      setCoverLetter(data.coverLetter);
      console.log("Cover letter result:", data);
    } catch (error) {
      console.error("Error generating cover letter:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (jobId: string) => {
    console.log("Resetting job with ID:", jobId);
    try {
      setLoading(true);
      const response = await fetch(`/api/jobs/${jobId}/reset`, {
        method: "POST",
      });
      const data = await response.json();
      console.log("Job reset result:", data);
      // Refresh the job records and analyses after reset
      const { jobRecords, jobAnalyses } = await fetchJobs();
      setJobRecords(jobRecords);
      setJobs(jobAnalyses);
    } catch (error) {
      console.error("Error resetting job:", error);
    } finally {
      setLoading(false);
    }
  };  

  const handleMarkAsApplied = async (jobId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/jobs/${jobId}/update-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "applied" }),
      });
      await response.json();
      // Refresh the job records and analyses after marking as applied
      const { jobRecords, jobAnalyses } = await fetchJobs();
      setJobRecords(jobRecords);
      setJobs(jobAnalyses);
    } catch (error) {
      console.error("Error marking job as applied:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (jobId: string) => {
    if (!jobId) {
      console.error("Job ID is undefined. Cannot reject job.");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`/api/jobs/${jobId}/update-status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "rejected" }),
      });
      await response.json();
      // Refresh the job records and analyses after marking as applied
      const { jobRecords, jobAnalyses } = await fetchJobs();
      setJobRecords(jobRecords);
      setJobs(jobAnalyses);
    } catch (error) {
      console.error("Error marking job as applied:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl 
        max-h-[100vh] flex-col items-center gap-10 py-10 px-16 bg-white dark:bg-black sm:items-start">
        {/* <div className="bg-blue-200 w-full p-5 rounded-3xl">
          <h1 className="font-bold text-3xl m-3">Job Search</h1>
          <div
            className="w-full flex gap-2 items-center p-2 rounded-lg bg-white border border-blue-400">
            <input
              type="text"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              className="w-full p-2 hover:caret"
              placeholder="Enter job URL"
            />
            <button 
              className="bg-blue-500 text-white font-semibold px-4 py-2 rounded-full 
                hover:bg-blue-300 hover:cursor-pointer transition-colors duration-300"
              onClick={handleSearch}>{loading ? "Analyzing..." : "Analyze"}</button>

          </div>
        </div> */}

        {/* Jobs in queue */}
        {!showQueue ? (
          <button 
            className="absolute right-10 bottom-10 w-[15%] p-5 bg-blue-300 rounded-3xl font-bold"
            onClick={() => setShowQueue(true)}>
            Show Jobs in Queue
          </button>
        ) : (
          <div className="absolute right-10 w-[27%] p-5 bg-white rounded-3xl">
            <div className="flex justify-between items-center">
              <h1 className="font-bold text-3xl">Jobs in Queue</h1>
              <button 
                className="bg-red-500 text-white font-semibold px-4 py-2 rounded-full 
                  hover:bg-red-300 hover:cursor-pointer transition-colors duration-300"
                onClick={() => setShowQueue(false)}>Close</button>
            </div>
            {jobRecords.length > 0 && (
              <ul className="mt-5 text-sm max-h-[80vh] overflow-y-auto">
                {jobRecords.map((job, index) => (
                  <li key={index} className={`mb-5 ${job.status === "completed" ? "bg-blue-50" : job.status === "failed" ? "bg-red-100" : job.status === "applied" ? "bg-green-200" : "bg-yellow-100"} p-4 rounded-lg`}>
                    <strong>Status:</strong> {job.status} <br />
                    {["completed", "applied"].includes(job.status) && job.analysis && (
                      <>
                        <strong>Title:</strong> {job.analysis.job.title} <br />
                        <strong>Company:</strong> {job.analysis.job.company} <br />
                      </>
                    )}

                    {/* Reset button */}
                    <button className="p-2 mt-2 bg-red-500 text-white font-bold rounded-xl" 
                      onClick={() => handleReset(job.jobId ?? "")}>
                        Reset
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {jobRecords.length === 0 && !loading && (
              <div className="m-3">
                <p>No jobs in queue. Please enter a job URL and click "Analyze".</p>
              </div>
            )}
          </div>
        )}

        {/* Analysis */}
        <div className="w-full overflow-y-auto">
          <h1 className="font-bold text-3xl">Job Analysis</h1>
          <MetricContainer items={metricItems} />
          {jobRecords.length > 0 && 
            jobRecords.filter((job) => job.status === "completed" && job.analysis).map(
              (job, index) => {
              // const jobUrl = jobRecords.find((job) => job.analysis === analysis)?.jobId || "";
              const analysis: JobAnalysis = job.analysis || {} as JobAnalysis;

              return (
                <div key={index} className={`flex flex-col gap-8 mt-10 w-full p-10 rounded-xl ${job.status === 'applied' ? 'bg-green-300/20' : 'bg-blue-50'} shadow-md`}>
                  <span className="capitalize px-2 py-1 text-xs font-semibold rounded-full bg-emerald-700 w-fit self-end text-white">
                    {job.status}
                  </span>
                  <div className="text-xl font-bold flex items-center gap-2 justify-between">
                    {/* title */}
                    {job.title}
                    {/* Recommendation */}
                    <div className={`
                      rounded-full border-2 font-semibold w-fit px-5 text-base 
                      ${analysis.match.recommendation === "apply" ?
                        "bg-green-300 border-green-700 text-green-700" : analysis.match.recommendation === "skip" ? 
                        "bg-red-300 border-red-700 text-red-700" : "bg-yellow-300 border-yellow-700 text-yellow-700"}`}>
                      {analysis.match.recommendation}
                    </div> 
                    {/* Score */}
                      <div className={`
                        rounded-full border-2 font-bold w-fit p-2 text-sm
                        ${analysis.match.score >= 75 ? 
                          "bg-green-300 border-green-700 text-green-700" : analysis.match.score < 30 ? 
                          "bg-red-300 border-red-700 text-red-700" : "bg-yellow-300 border-yellow-700 text-yellow-700"}`
                        }
                      >
                        {analysis.match.score}
                      </div>
                  </div>
                  <div>
                    <strong>Company:</strong> {analysis.job.company}<br />
                    <strong>Location:</strong> {analysis.job.location}<br />
                    <strong>Salary:</strong> {analysis.job.salary ? `${analysis.job.salary.minimum ?? ""} - ${analysis.job.salary.maximum ?? ""} ${analysis.job.salary.currency ?? ""}` : "N/A"}<br />
                    <strong>Employment Type:</strong> {analysis.job.employmentType}<br />
                  </div>

                  <div className="text-justify">
                    <strong>Reasoning:</strong>
                    <span className="ml-4">{analysis.match.reasoning}</span>
                  </div>
    
                  <CollapsibleSection title="Detailed Analysis">
                    <div className="flex flex-col gap-10">
                      <div>
                        <strong>Responsibilities:</strong>
                        <ul>
                          {analysis.job.responsibilities.map((resp, index) => (
                            <li key={index} className="ml-4">- {resp}</li>
                          ))}
                        </ul>
                      </div>
    
                      <div>
                        <strong>Requirements:</strong>
                        <ul>
                          {analysis.job.requirements.map((req, index) => (
                            <li key={index} className="ml-4">- {req}</li>
                          ))}
                        </ul>
                      </div>
    
                      <div>
                        <strong>Requirements Analysis:</strong>
                        <ul>
                          {analysis?.match?.requirements?.map((req, index) => (
                            <li key={index} className="grid grid-cols-6 gap-10 mb-5 border p-5 rounded-md">
                              <span className="col-span-3">{req.requirement}</span>
                              <span className="col-span-1 text-center">{req.importance}</span>
                              <span className="col-span-1">{req.weight}</span>
                              <span className="col-span-1">{req.status}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
    
                      <div>
                        <strong>Strengths:</strong>
                        <ul>
                          {analysis.match.strengths.map((strength, index) => (
                            <li key={index} className="ml-4 text-green-900">- {strength}</li>
                          ))}
                        </ul>
                      </div>
    
                      <div>
                        <strong>Missing Requirements:</strong>
                        <ul>
                          {analysis.match.missingRequirements.map((missing, index) => (
                            <li key={index} className="ml-4 text-red-700">- {missing}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CollapsibleSection>
    
                  <div className="flex justify-between">
                    <button 
                      onClick={() => handleGenerateCoverLetter(index)}
                      className="rounded-full bg-blue-500 text-white
                      font-semibold px-4 py-2 w-fit
                      text-sm
                      hover:bg-blue-300 hover:cursor-pointer transition-colors duration-300"
                    >
                      Generate Cover Letter
                    </button>

                    <button 
                      onClick={() => handleReject(job.jobId ?? "")}
                      className="rounded-full bg-red-500 text-white
                      font-semibold px-4 py-2 w-fit
                      text-sm
                      disabled:bg-gray-400 disabled:cursor-not-allowed
                      hover:bg-red-300 hover:cursor-pointer transition-colors duration-300"
                      disabled={job.status === "applied" || !job.jobId}
                    >
                      Reject
                    </button>

                    <button 
                      onClick={() => handleMarkAsApplied(job.jobId ?? "")}
                      className="rounded-full bg-emerald-500 text-white
                      font-semibold px-4 py-2 w-fit
                      text-sm
                      disabled:bg-gray-400 disabled:cursor-not-allowed
                      hover:bg-emerald-300 hover:cursor-pointer transition-colors duration-300"
                      disabled={job.status === "applied" || !job.jobId}
                    >
                      Mark as applied
                    </button>

                  </div>
                  <div className="flex flex-wrap gap-2">
                    {job.applyOptions.length > 0 && job.applyOptions.map((option, idx) => {
                      return (
                        <button 
                          key={idx}
                          onClick={() => window.open(option.link, "_blank")}
                          className="rounded-full bg-sky-500 text-white
                          font-semibold px-4 py-2 w-fit
                          hover:bg-sky-300 hover:cursor-pointer transition-colors duration-300
                          text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span>View Job at</span>
                            <span>{option.title}</span>
                            <TbOutbound size={18} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )
            }
          )}

          {jobs.length === 0 && !loading && (
            <div className="m-3">
              <p>No job analysis available. Please enter a job URL and click "Analyze".</p>
            </div>
          )}
        </div>

        {coverLetter && (
          <div className="absolute left-10 w-[27%] p-5 bg-white rounded-3xl overflow-y-auto max-h-[80vh]">
            <h1 className="font-bold text-3xl m-3">Generated Cover Letter</h1>
            <pre className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap">{coverLetter}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
