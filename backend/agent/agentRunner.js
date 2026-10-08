const { chromium } = require("playwright");
const { decideAction } = require("./gemini");

async function runAgent() {
  const browser = await chromium.launch({
    headless: false
  });

  const page = await browser.newPage();

  try {
    // 1. Open the webpage
    await page.goto("/test");

    console.log("🌐 Page opened");

    // 2. Observe the current webpage
    const pageElements = await page.locator("button, input").evaluateAll(
      (elements) =>
        elements.map((element) => ({
          tag: element.tagName,
          type: element.getAttribute("type"),
          id: element.id,
          placeholder: element.getAttribute("placeholder"),
          name: element.getAttribute("name"),
          text: element.innerText || "",
          value: element.value || ""
        }))
    );

    console.log("👀 Page elements:");
    console.log(pageElements);

    // 3. Send goal + webpage information to Gemini
    const decision = await decideAction(
      "Click the Submit button",
      pageElements
    );

    console.log("🧠 Gemini decision:");
    console.log(decision);

    // 4. Clean Gemini response
    const cleanDecision = decision
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // 5. Convert response into JavaScript object
    const action = JSON.parse(cleanDecision);

    console.log("🎯 Action:", action);

    // 6. Execute Gemini's decision using Playwright
    if (action.action === "click") {
      const target = action.target;

      await page.locator(`#${target}`).click();

      console.log(`🖱️ Clicked: ${target}`);
    }

    // 7. Basic verification
    await page.waitForTimeout(1000);

    console.log("🔎 Checking result...");

    const successMessage = page.locator("#successMessage");

    if (await successMessage.isVisible()) {
      console.log("✅ Action verified successfully!");
    } else {
      console.log("⚠️ Action completed, but success was not detected.");
    }

    console.log("🎉 Agent execution completed");

  } catch (error) {
    console.error("❌ Agent error:", error.message);

  } finally {
    // Keep browser open for now so we can see the result
  }
}

runAgent();