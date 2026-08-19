import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

import type { JobAnalysis, JobContext } from "../app/model/JobAnalysis";
import { ai } from "./ai";
import candidateJson from "@/data/candidate.json";
import * as cheerio from "cheerio";
import { calculateMatch } from "./scoring";
import { Candidate } from "@/app/model/Candidate";
import fs from "fs";

interface CoverLetterContext {
  candidate: {
    name: string;
    summary: string;
    yearsOfExperience: number;
  };
  job: {
    title: string;
    company: string | null;
    requirements: JobAnalysis["job"]["requirements"];
  };
  match: {
    strengths?: JobAnalysis["match"]["strengths"];
    missingRequirements?: JobAnalysis["match"]["missingRequirements"];
    relatedProjects: {
      name: string;
      description: string;
    }[];
    relatedExperiences: {
      role: string;
      company: string;
    }[];
  };
}

interface CoverLetterStyle {
  tone?: "professional" | "casual" | "friendly";
  length?: string;
  structure?: string[];
  preferences?: string[];
  avoid?: string[];
}

export async function analyzeJob(jobContext: JobContext, signal: AbortSignal): Promise<JobAnalysis> {
  const candidate = candidateJson as Candidate;
  const response = await ai.chat.completions.create(
    {
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

RELATED PROJECTS

If the candidate has relevant projects, put them in relatedProjects list.
relatedProjects should be a list of objects with the following structure:
{
  "name": "string",
  "description": "string",
}
If there are no relevant projects, return an empty list.
Only return maximum of 2 highest relevance projects.


RELATED EXPERIENCE

If the candidate has relevant experience, put them in relatedExperiences list.
relatedExperiences should be a list of objects with the following structure:
{
  "role": "string",
  "company": "string",
}
If there are no relevant experience, return an empty list.
Only return maximum of 2 highest relevance experiences.

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
    "requirements": ["string"],
    "relatedProjects": [
      {
        "name": "string",
        "description": "string",
      }
    ],
    "relatedExperiences": [
      {
        "role": "string",
        "company": "string",
      }
    ]
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

${JSON.stringify(jobContext, null, 2)}

Analyze this job against the candidate profile.

For the cover-letter generation step, also identify:
- Up to 2 most relevant projects.
- Up to 2 most relevant professional experiences.

Only select projects and experiences that are directly useful for this
specific job.

Return the required JSON structure defined by the system instructions.
`.trim(),
        },
      ],
    },
    { signal }
  );

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
  const coverLetterStyle: CoverLetterStyle = fs.existsSync("./data/cover-letter-style.json")
    ? JSON.parse(fs.readFileSync("./data/cover-letter-style.json", "utf-8"))
    : {};

  const candidate = candidateJson as Candidate;
  const coverLetterContext: CoverLetterContext = {
    candidate: {
      name: candidate.profile.name,
      summary: candidate.profile.summary,
      yearsOfExperience: candidate.profile.yearsOfExperience,
    },
    job: {
      title: analysis.job.title,
      company: analysis.job.company,
      requirements: analysis.job.requirements,
    },
    match: {
      relatedProjects: analysis.job.relatedProjects.map((project) => ({
        name: project.name,
        description: project.description,
      })),
      relatedExperiences: analysis.job.relatedExperiences.map((experience) => ({
        role: experience.role,
        company: experience.company,
      })),
    },
  };

  // console.log("Generating cover letter with context:", JSON.stringify(coverLetterContext, null, 2));

  const systemPrompt = `
 You are a professional job application assistant.

Write a concise, natural, tailored cover letter for the candidate
based on the job and the candidate's actual experience.

STYLE: 
${JSON.stringify(coverLetterStyle, null, 2)}

Rules:
- Never invent or infer facts.
- Only mention technologies when they are explicitly associated
  with the relevant experience or project.
- Do not mention AI.
- Write naturally, as if the candidate wrote it themselves.
- DO NOT use em dashes or other fancy punctuation.
- Paragraphs should communicate a single idea. Avoid mixing multiple ideas in a single paragraph.
- Short, concise sentences. Avoid long, complex sentences.

Avoid stacking multiple adjectives before nouns.

Prefer concrete statements over claims about the candidate.

Instead of:
"I have extensive experience building scalable, production-grade applications."

Prefer:
"I've spent the last five years building web applications and SaaS products."

Instead of:
"I am confident my frontend expertise aligns well with your requirements."

Prefer:
"Most of my recent work has been with React, Next.js, and TypeScript."

Do not try to sound impressive.
Let the candidate's actual experience make the letter convincing.

EVIDENCE SELECTION

Use only the strongest and most relevant evidence for this job.

Mention no more than:
- 2 projects or work experiences
- 4 technologies
- 2 additional technical skills

Do not attempt to mention every matching requirement.

A technology may only be mentioned when it is explicitly associated
with the project or experience being discussed.

Never combine technologies, responsibilities, or deployment details
from different projects or experiences.
`;

  const userPrompt = `CANDIDATE:

${JSON.stringify(coverLetterContext.candidate, null, 2)}

JOB:

${JSON.stringify(coverLetterContext.job, null, 2)}

MATCH ANALYSIS:

${JSON.stringify(coverLetterContext.match, null, 2)}

Write a tailored cover letter for this position.`;

console.log("Generating cover letter with prompts:", {
  systemPrompt: systemPrompt.trim(),
  userPrompt: userPrompt.trim(),
});

  const response = await ai.chat.completions.create({
    model: process.env.LM_MODEL!,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: systemPrompt.trim(),
      },
      {
        role: "user",
        content: userPrompt.trim(),
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