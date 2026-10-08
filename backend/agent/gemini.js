require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function generateWithRetry(prompt, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 Gemini request (attempt ${attempt}/${maxRetries})`);

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt
      });

      return response.text;

    } catch (error) {
      const message = error.message || "";

      if (message.includes("503") && attempt < maxRetries) {
        const waitTime = attempt * 3000;

        console.log(
          `⚠️ Gemini temporarily unavailable. Retrying in ${waitTime / 1000}s...`
        );

        await new Promise(resolve =>
          setTimeout(resolve, waitTime)
        );

      } else {
        throw error;
      }
    }
  }
}

async function askGemini(prompt) {
  return await generateWithRetry(prompt);
}

async function decideAction(goal, pageElements) {
  const prompt = `
You are the decision-making agent for TaskLink.

Task goal:
${goal}

Current webpage elements:
${JSON.stringify(pageElements, null, 2)}

Decide the best next browser action to achieve the goal.

Return ONLY valid JSON in this format:

{
  "action": "click",
  "target": "element name",
  "reason": "short explanation"
}

Possible actions:
- click
- input
- none

If no suitable action exists, return:

{
  "action": "none",
  "target": "",
  "reason": "explanation"
}
`;

  return await generateWithRetry(prompt);
}

module.exports = {
  askGemini,
  decideAction
};