"use client";

import { useState } from "react";
import { JobAnalysis } from "./model/JobAnalysis";

export default function Home() {
  const [jobUrl, setJobUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);

  const handleSearch = async () => {
    console.log("Searching for job at URL:", jobUrl);
    try {
      setLoading(true);
      setAnalysis(null);
      setCoverLetter(null);
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobUrl }),
      });
      const data = await response.json();
      setAnalysis(data.job);
      console.log("Job analysis result:", data);
    } catch (error) {
      console.error("Error searching for job:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    console.log("Generating cover letter for job at URL:", jobUrl);
    try {
      setLoading(true);
      const response = await fetch("/api/jobs/cover-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ analysis }),
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

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center gap-10 py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="bg-blue-200 w-full p-5 rounded-3xl">
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
        </div>
        <div>
          <h1 className="font-bold text-3xl m-3">Job Analysis</h1>
          {analysis ? (
            <div className="flex flex-col gap-8 m-3 mt-10">
              <div>
                <strong>Job Title:</strong> {analysis.job.title}<br />
              </div>
              <div>
                <strong>Company:</strong> {analysis.job.company}<br />
                <strong>Location:</strong> {analysis.job.location}<br />
                <strong>Salary:</strong> {analysis.job.salary}<br />
                <strong>Employment Type:</strong> {analysis.job.employmentType}<br />
              </div>

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

              <div className="p-5 rounded-4xl bg-blue-100 px-10">
                <div className="flex items-center gap-2">
                  <strong>Match Score:</strong> 
                  <div className={`
                    rounded-full border-2 font-bold w-fit px-10 
                    ${analysis.match.score >= 75 ? 
                      "bg-green-300 border-green-700 text-green-700" : analysis.match.score < 30 ? 
                      "bg-red-300 border-red-700 text-red-700" : "bg-yellow-300 border-yellow-700 text-yellow-700"}`
                    }
                  >
                    {analysis.match.score}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <strong>Recommendation:</strong> 
                  <div className={`
                    rounded-full border-2 font-bold w-fit px-10 
                    ${analysis.match.recommendation === "apply" ?
                      "bg-green-300 border-green-700 text-green-700" : analysis.match.recommendation === "skip" ? 
                      "bg-red-300 border-red-700 text-red-700" : "bg-yellow-300 border-yellow-700 text-yellow-700"}`}>
                    {analysis.match.recommendation}
                  </div>
                </div>                
              </div>

              <div>
                <strong>Requirements Analysis:</strong>
                <ul>
                  {analysis?.match?.requirements?.map((req, index) => (
                    <li key={index} className="ml-4">
                      - {req.requirement} (Importance: {req.importance}, Weight: {req.weight}, Status: {req.status})
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

              <div className="text-justify">
                <strong>Reasoning:</strong> 
                <span className="ml-4">{analysis.match.reasoning}</span>
              </div>

              <button 
                onClick={handleGenerateCoverLetter}
                className="rounded-full bg-blue-500 text-white
                font-semibold px-4 py-2 w-fit
                hover:bg-blue-300 hover:cursor-pointer transition-colors duration-300"
              >
                Generate Cover Letter
              </button>
            </div>
          ) : (
            <span>No analysis available</span>
          )}
        </div>

        {coverLetter && (
          <div>
            <h1 className="font-bold text-3xl m-3">Generated Cover Letter</h1>
            <pre className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap">{coverLetter}</pre>
          </div>
        )}
      </main>
    </div>
  );
}
