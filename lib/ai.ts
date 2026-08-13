import OpenAI from "openai";

export const ai = new OpenAI({
  baseURL: "http://localhost:1234/v1",
  apiKey: "lm-studio",
});

export async function testAI() {
  const response = await ai.chat.completions.create({
    model: process.env.LM_MODEL!,
    messages: [
      {
        role: "user",
        content: "Say hello to JobSearch in one sentence.",
      },
    ],
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content;
}