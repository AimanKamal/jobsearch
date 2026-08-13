import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

import type { JobAnalysis } from "../app/model/JobAnalysis";
import { ai } from "./ai";
import candidate from "@/data/candidate.json";
import * as cheerio from "cheerio";

export async function analyzeJob(jobText: string): Promise<JobAnalysis> {
  const response = await ai.chat.completions.create({
    model: process.env.LM_MODEL!,
    temperature: 0.1,

    messages: [
      {
        role: "system",
        content: `
          You are JobSearch, an AI job application assistant.

          Your task is to:
          1. Extract structured information from a job posting.
          2. Identify the important requirements.
          3. Evaluate each requirement against the candidate.
          4. Calculate a realistic candidate-job match.
          5. Recommend whether the candidate should apply.

          REQUIREMENT EVALUATION

          For every requirement, determine:

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
          candidate profile explicitly indicates they lack it.

          TRANSFERABLE SKILLS

          Consider related technologies and transferable experience.

          For example:
          - MongoDB experience may partially satisfy a MySQL requirement.
          - RAG experience may partially satisfy a requirement for LangChain.
          - General Docker experience may satisfy a Docker requirement even if
            the candidate used Docker in a different environment.
          - Full-stack experience may partially satisfy a framework-specific
            backend requirement.

          Do not claim the candidate has used a specific technology unless the
          candidate profile provides evidence for it.

          WEIGHTS

          Assign:
          - critical = 5
          - required = 3
          - preferred = 1

          SCORING

          Use these status values when calculating the match:

          - match = 1.0
          - partial = 0.5
          - unknown = 0.75
          - missing = 0.0

          Calculate the overall score using:

          sum(weight × statusValue) / sum(weight) × 100

          Do not arbitrarily choose the final score.

          RECOMMENDATION

          Use:
          - "apply": strong overall match
          - "maybe": reasonable match but has meaningful gaps
          - "skip": poor match or missing critical requirements

          A missing critical requirement should strongly affect the recommendation.

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

          Analyze the job against the candidate.

          Return JSON using exactly this structure:

          {
            "job": {
              "title": "string",
              "company": "string or null",
              "location": "string or null",
              "salary": "string or null",
              "employmentType": "string or null",
              "responsibilities": ["string"],
              "requirements": ["string"]
            },
            "match": {
              "score": 0,
              "recommendation": "apply",
              "requirements": [
                {
                  "requirement": "string",
                  "importance": "critical",
                  "weight": 5,
                  "status": "match",
                  "evidence": "string"
                }
              ],
              "strengths": ["string"],
              "missingRequirements": ["string"],
              "reasoning": "string"
            }
          }
        `.trim(),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("AI returned an empty response");
  }

  return JSON.parse(content) as JobAnalysis;
}

export async function generateCoverLetter(
  analysis: JobAnalysis
): Promise<string> {
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