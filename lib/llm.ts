import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

import type { JobAnalysis } from "../app/model/JobAnalysis";
import { ai } from "./ai";
import candidateJson from "@/data/candidate.json";
import * as cheerio from "cheerio";
import { calculateMatch } from "./scoring";
import { Candidate } from "@/app/model/Candidate";

export async function analyzeJob(jobText: string): Promise<JobAnalysis> {
  const candidate = candidateJson as Candidate;
  const response = await ai.chat.completions.create({
    model: process.env.LM_MODEL!,
    temperature: 0.1,

    messages: [
      {
        role: "system",
        content: `
          You are JobSearch, an AI job application assistant.

          Your task is to analyze a job posting against the candidate profile.

          Your responsibilities are:

          1. Extract structured information from the job posting.
          2. Identify the important job requirements.
          3. Evaluate each requirement against the candidate.
          4. Extract salary information.
          5. Extract the working arrangement.
          6. Provide concise evidence for each requirement evaluation.
          7. Identify the candidate's strongest relevant strengths.
          8. Identify requirements the candidate clearly does not meet.

          IMPORTANT:
          You are responsible for extracting and evaluating information.
          The application will calculate the final match score and recommendation
          separately. DO NOT calculate a final score and DO NOT provide a
          recommendation.

          REQUIREMENT EVALUATION

          For every important requirement, determine:

          - importance:
            - "critical": absolutely central to the role or explicitly mandatory
            - "required": clearly expected or required
            - "preferred": nice-to-have or bonus

          - status:
            - "match": candidate clearly demonstrates the requirement
            - "partial": candidate has related or transferable experience
            - "unknown": candidate profile does not provide enough information
            - "missing": candidate clearly does not meet the requirement

          IMPORTANT:
          Do NOT treat "unknown" as "missing".

          The candidate profile may not contain every skill the candidate has.
          If something is not mentioned, classify it as "unknown" unless the
          candidate profile explicitly indicates that the candidate does not
          have the requirement.

          TRANSFERABLE SKILLS

          Consider related technologies, experience, and transferable skills.

          For example:
          - MongoDB experience may partially satisfy a MySQL requirement.
          - RAG experience may partially satisfy a requirement for LangChain.
          - General Docker experience may satisfy a Docker requirement even if
            the candidate used Docker in a different environment.
          - Full-stack experience may partially satisfy a framework-specific
            backend requirement.

          Do not claim that the candidate has used a specific technology unless
          the candidate profile provides evidence for it.

          EVIDENCE

          For every requirement evaluation, provide concise evidence explaining
          why the requirement was classified as match, partial, unknown, or
          missing.

          Evidence must be based only on information provided in the candidate
          profile.

          SALARY EXTRACTION

          Extract salary information when it is available.

          Return:

          - "minimum": numeric minimum salary, or null
          - "maximum": numeric maximum salary, or null
          - "currency": currency code such as "MYR", "USD", "SGD", or null

          Rules:
          - Return numeric values only for minimum and maximum.
          - Do not include currency symbols in numeric values.
          - If the job provides a salary range, extract both values.
          - If only one salary value is provided, use that value for both
            minimum and maximum.
          - If the salary is not disclosed, return null.
          - Preserve the salary period in the job information if relevant,
            but do not put text into minimum or maximum.

          WORKING ARRANGEMENT

          Classify the job as exactly one of:

          - "remote": the role is fully remote.
          - "hybrid": the role requires both remote and on-site work.
          - "on-site": the role requires working physically at a workplace.
          - "unknown": the posting does not provide enough information.

          Do not infer the working arrangement from the company, location, or
          job title.

          JOB REQUIREMENTS

          Focus on meaningful requirements rather than extracting every sentence
          from the job description.

          Include requirements related to:
          - Technical skills
          - Years of experience
          - Education
          - Industry experience
          - Languages
          - Certifications
          - Responsibilities that imply a required capability
          - Other qualifications explicitly expected by the employer

          Do not treat generic statements such as "good communication skills"
          as highly important unless the job explicitly emphasizes them.

          STRENGTHS

          Identify the candidate's strongest relevant qualifications for this
          specific job.

          Only include strengths supported by the candidate profile.

          MISSING REQUIREMENTS

          Only include requirements classified as "missing".

          Do not include "unknown" requirements here.

          OUTPUT

          Return only valid JSON matching the following structure:

          {
            "job": {
              "title": "string",
              "company": "string or null",
              "location": "string or null",
              "salary": {
                "minimum": "number or null",
                "maximum": "number or null",
                "currency": "string or null"
              },
              "workingArrangement": "remote | hybrid | on-site | unknown",
              "employmentType": "string or null",
              "responsibilities": ["string"],
              "requirements": ["string"]
            },

            "match": {
              "strengths": ["string"],
              "missingRequirements": ["string"],
              "reasoning": "string",
              "requirements": [
                {
                  "requirement": "string",
                  "importance": "critical | required | preferred",
                  "weight": "number",
                  "status": "match | partial | unknown | missing",
                  "evidence": "string"
                }
              ]
            }
          }

          The requirement weight must be:

          - critical = 5
          - required = 3
          - preferred = 1

          Do not include "score" or "recommendation" in the response.
          Those values will be calculated by the application.

          Return only valid JSON.
          `.trim(),
      },
      {
        role: "user",
        content: `
          CANDIDATE PROFILE:

          ${JSON.stringify(candidate, null, 2)}

          JOB POSTING:

          ${jobText}

          Analyze the job posting against the candidate profile.

          Extract the job information and evaluate the candidate against the
          important job requirements.

          Do not calculate a final match score.
          Do not provide an apply/maybe/skip recommendation.
          Do not evaluate the candidate's salary or working-arrangement
          preferences as part of the technical requirement score. Those factors
          will be evaluated separately by the application.

          Return JSON using exactly this structure:

          {
            "job": {
              "title": "string",
              "company": "string or null",
              "location": "string or null",
              "salary": {
                "minimum": "number or null",
                "maximum": "number or null",
                "currency": "string or null"
              },
              "workingArrangement": "remote | hybrid | on-site | unknown",
              "employmentType": "string or null",
              "responsibilities": ["string"],
              "requirements": ["string"]
            },
            "match": {
              "requirements": [
                {
                  "requirement": "string",
                  "importance": "critical | required | preferred",
                  "weight": 0,
                  "status": "match | partial | unknown | missing",
                  "evidence": "string"
                }
              ],
              "strengths": ["string"],
              "missingRequirements": ["string"],
              "reasoning": "string"
            }
          }

          IMPORTANT:

          - Only include information supported by the job posting or candidate
            profile.
          - Do not invent candidate experience.
          - Do not assume that an unmentioned skill is missing.
          - Use "unknown" when the candidate profile does not provide enough
            information.
          - Use "partial" when the candidate has related or transferable
            experience.
          - "missingRequirements" must only contain requirements classified as
            "missing".
          - The weight must correspond to the requirement importance:
            - critical = 5
            - required = 3
            - preferred = 1

          Return only valid JSON.
          `.trim(),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("AI returned an empty response");
  }

  const parsed = JSON.parse(content) as JobAnalysis;
  const scored = calculateMatch(parsed, candidate);

  return scored as JobAnalysis;
}

export async function generateCoverLetter(
  analysis: JobAnalysis
): Promise<string> {
  const candidate = candidateJson as Candidate;
  const response = await ai.chat.completions.create({
    model: process.env.LM_MODEL!,
    temperature: 0.7,

    messages: [
      {
        role: "system",
        content: `
          You are a professional job application assistant.

          Write a concise, natural, tailored cover letter for the candidate
          based on the job and the candidate's actual experience.

          Rules:
          - Do not invent experience, skills, achievements, or qualifications.
          - Focus on the strongest relevant experience.
          - Do not simply repeat the job description.
          - Do not mention the candidate's match score.
          - Do not mention that AI was used.
          - Avoid generic filler.
          - Keep the letter concise, ideally 250-350 words.
          - Use a professional but natural tone.
                  `.trim(),
                },
                {
                  role: "user",
                  content: `
          CANDIDATE:

          ${JSON.stringify(candidate, null, 2)}

          JOB:

          ${JSON.stringify(analysis.job, null, 2)}

          MATCH ANALYSIS:

          ${JSON.stringify(analysis.match, null, 2)}

          Write a tailored cover letter for this position.
        `.trim(),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("AI returned an empty cover letter");
  }

  return content.trim();
}

export function extractPageText(html: string) {
  const $ = cheerio.load(html);

  $("script, style, noscript, iframe, svg").remove();

  const main =
    $("main").first().length
      ? $("main").first()
      : $("article").first().length
        ? $("article").first()
        : $('[role="main"]').first().length
          ? $('[role="main"]').first()
          : $("body");

  // Add newlines around block-level elements
  main.find("br").replaceWith("\n");

  main.find(
    "p, div, section, article, li, h1, h2, h3, h4, h5, h6"
  ).each((_, el) => {
    $(el).prepend("\n");
    $(el).append("\n");
  });

  return {
    title: $("title").text(),
    bodyText: main
      .text()
      .replace(/[ \t]+/g, " ")     // collapse spaces/tabs
      .replace(/\n\s*\n+/g, "\n\n") // collapse excessive blank lines
      .trim(),
  };
}