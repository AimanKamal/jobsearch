import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

import { Candidate } from "@/app/model/Candidate";
import { JobAnalysis } from "@/app/model/JobAnalysis";
import { ai } from "../ai";
import fs from "fs";
import candidateJson from "@/data/candidate.json";

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