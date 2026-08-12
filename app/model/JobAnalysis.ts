export type JobAnalysis = {
  job: {
    title: string;
    company: string | null;
    location: string | null;
    salary: string | null;
    employmentType: string | null;
    responsibilities: string[];
    requirements: string[];
  };

  match: {
    score: number;
    recommendation: "apply" | "maybe" | "skip";
    strengths: string[];
    missingRequirements: string[];
    reasoning: string;
    requirements: {
      requirement: string;
      importance: "critical" | "required" | "preferred";
      weight: number;
      status: "match" | "partial" | "unknown" | "missing";
      evidence: string;
    }[];
  };
};