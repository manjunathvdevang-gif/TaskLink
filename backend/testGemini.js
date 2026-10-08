const { askGemini } = require("./agent/gemini");

async function test() {
  try {
    const answer = await askGemini(
      "Explain in one sentence what TaskLink is."
    );

    console.log("🤖 Gemini:", answer);
  } catch (error) {
    console.error("❌ Gemini error:", error.message);
  }
}

test();