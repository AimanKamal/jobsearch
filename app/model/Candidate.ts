export interface Candidate {
  profile: {
    name: string;
    summary: string;
    yearsOfExperience: number;
    education: {
      degree: string;
      field: string;
      institution: string;
      graduationYear: number;
    };
    languages: {
      language: string;
      proficiency: string;
    }[];
  };
  skills: {
    frontend: string[];
    backend: string[];
    databases: string[];
    devops: string[];
    ai: string[];
    testing: string[];
  };
  experience: {
    role: string;
    company: string;
    duration: string;
    description: string;
    technologies: string[];
  }[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
  }[];
  preferences: {
    salary: {
      minimum: number;
      currency: string;
      weight: number;
      strict: boolean;
    };
    workingArrangement: {
      preferred: ("remote" | "hybrid" | "on-site" | "unknown")[];
      acceptable: ("remote" | "hybrid" | "on-site" | "unknown")[];
      weight: number;
      strict: boolean;
    };
    location: {
      preferred: string[];
      weight: number;
      strict: boolean;
    };
  };
}
