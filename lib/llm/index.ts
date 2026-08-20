import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

export { analyzeJob } from "./analyze-job";
export { generateCoverLetter } from "./cover-letter";