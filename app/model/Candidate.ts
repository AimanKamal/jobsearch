export interface Candidate {
  name: string;
  summary: string;
  skills: string[];
  projects: {
    name: string;
    description: string;
  }[];
}