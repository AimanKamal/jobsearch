export interface Job {
  title: string;
  company: string;
  location?: string;
  salary?: string;
  description: string;
  url: string;

  matchScore?: number;
  matchReason?: string;

  coverLetter?: string;

  status: "new" | "reviewed" | "applied" | "rejected";
  createdAt: Date;
}