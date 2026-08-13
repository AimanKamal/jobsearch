import { Candidate } from "@/app/model/Candidate";
import { JobAnalysis } from "@/app/model/JobAnalysis";

const STATUS_VALUES = {
  match: 1,
  partial: 0.5,
  unknown: 0.75,
  missing: 0,
} as const;

const REQUIREMENT_WEIGHTS = {
  critical: 5,
  required: 3,
  preferred: 1,
} as const;

export function calculateTechnicalScore(
  requirements: JobAnalysis["match"]["requirements"]
): number {
  let earned = 0;
  let possible = 0;

  for (const requirement of requirements) {
    const weight = REQUIREMENT_WEIGHTS[requirement.importance];
    const statusValue = STATUS_VALUES[requirement.status];

    possible += weight;
    earned += weight * statusValue;
  }

  if (possible === 0) {
    return 0;
  }

  return Math.round((earned / possible) * 100);
}

export function calculateSalaryScore(
  salary: JobAnalysis["job"]["salary"],
  preference: Candidate["preferences"]["salary"]
): number {
  if (!salary) {
    return 75;
  }

  const jobMaximum = salary.maximum ?? salary.minimum;

  if (jobMaximum === null) {
    return 75;
  }

  if (jobMaximum >= preference.minimum) {
    return 100;
  }

  const ratio = jobMaximum / preference.minimum;

  return Math.round(Math.max(0, ratio * 100));
}

export function calculateWorkingArrangementScore(
  arrangement: JobAnalysis["job"]["workingArrangement"],
  preference: Candidate["preferences"]["workingArrangement"]
): number {
  if (arrangement === "unknown") {
    return 75;
  }

  if (preference.preferred.includes(arrangement)) {
    return 100;
  }

  if (preference.acceptable.includes(arrangement)) {
    return 70;
  }

  return preference.strict ? 0 : 40;
}

export function calculateFinalScore(
  technicalScore: number,
  salaryScore: number,
  arrangementScore: number,
  candidate: Candidate
): number {
  const technicalWeight = 100 -
    candidate.preferences.salary.weight -
    candidate.preferences.workingArrangement.weight;

  const salaryWeight =
    candidate.preferences.salary.weight;

  const arrangementWeight =
    candidate.preferences.workingArrangement.weight;

  const score =
    technicalScore * (technicalWeight / 100) +
    salaryScore * (salaryWeight / 100) +
    arrangementScore * (arrangementWeight / 100);

  return Math.round(score);
}

export function getRecommendation(
  score: number,
  requirements: JobAnalysis["match"]["requirements"],
  candidate: Candidate,
  arrangement: JobAnalysis["job"]["workingArrangement"]
): "apply" | "maybe" | "skip" {
  const hasMissingCriticalRequirement = requirements.some(
    (requirement) =>
      requirement.importance === "critical" &&
      requirement.status === "missing"
  );

  if (hasMissingCriticalRequirement) {
    return "skip";
  }

  if (
    candidate.preferences.workingArrangement.strict &&
    !candidate.preferences.workingArrangement.preferred.includes(
      arrangement
    )
  ) {
    return "skip";
  }

  if (score >= 80) {
    return "apply";
  }

  if (score >= 60) {
    return "maybe";
  }

  return "skip";
}

export function calculateMatch(
  analysis: JobAnalysis,
  candidate: Candidate
): JobAnalysis {
  const technicalScore = calculateTechnicalScore(
    analysis.match.requirements
  );

  const salaryScore = calculateSalaryScore(
    analysis.job.salary,
    candidate.preferences.salary
  );

  const arrangementScore = calculateWorkingArrangementScore(
    analysis.job.workingArrangement,
    candidate.preferences.workingArrangement
  );

  const finalScore = calculateFinalScore(
    technicalScore,
    salaryScore,
    arrangementScore,
    candidate
  );

  const recommendation = getRecommendation(
    finalScore,
    analysis.match.requirements,
    candidate,
    analysis.job.workingArrangement
  );

  return {
    ...analysis,

    match: {
      ...analysis.match,
      score: finalScore,
      recommendation,
    },
  };
}