export type JobAnalysis = {
  job: {
    title: string;
    company: string | null;
    location: string | null;
    salary: {
      minimum: number | null;
      maximum: number | null;
      currency: string | null;
    } | null;
    workingArrangement:
      | "remote"
      | "hybrid"
      | "on-site"
      | "unknown";
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

export type JobRecord = {
  id: string;
  url: string;

  status: "queued" | "processing" | "completed" | "failed";

  addedAt: string;
  startedAt?: string;
  completedAt?: string;

  analysis?: JobAnalysis;
  error?: string;
};