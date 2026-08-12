import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { testAI } from "@/app/lib/ai";
import { analyzeJob } from "@/app/lib/llm";


interface JobPostRequestBody extends NextRequest{
  jobUrl: string;
}

const MAX_JOB_LENGTH = 30_000;

function extractPageText(html: string) {
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

export async function POST(request: JobPostRequestBody) {
  const { jobUrl } = await request.json();

  if (!jobUrl) {
    return NextResponse.json({ message: "Job URL is required" }, { status: 400 });
  }

  const jobPage = await fetch(jobUrl);

  if (!jobPage.ok) {
    return NextResponse.json({ message: "Failed to fetch job page" }, { status: 500 });
  }

  const jobHtml = await jobPage.text();

  const {title, bodyText} = extractPageText(jobHtml);

  const jobText = bodyText.slice(0, MAX_JOB_LENGTH);

  // console.log({
  //   title,
  //   bodyLength: jobText.length,
  //   preview: jobText.slice(0, 3000),
  // });

  const job = await analyzeJob(jobText);

  const result = { job };
  return NextResponse.json(result, { status: 201 });
}