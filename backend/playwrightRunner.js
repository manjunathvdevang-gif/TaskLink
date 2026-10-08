const { chromium } = require("playwright");

async function runTask(task) {
  const browser = await chromium.launch({
    headless: false
  });

  const page = await browser.newPage();

  try {
    console.log("🌐 Opening:", task.url);

    await page.goto(task.url, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    console.log("✅ Website opened");

    for (const action of task.actions) {
      console.log("▶️ Executing:", action);

      if (action.type === "click") {
        await page.locator(action.selector).click({
          timeout: 10000
        });

        console.log(
          `🖱️ Clicked: ${action.target}`
        );
      }

      if (action.type === "input") {
        await page
          .locator(action.selector)
          .fill(action.value, {
            timeout: 10000
          });

        console.log(
          `⌨️ Typed: ${action.value}`
        );
      }
    }

    console.log("🎉 Task completed successfully");

  } catch (error) {
    console.error("❌ Playwright task failed:");
    console.error(error);

    throw error;
  }

  // Keep browser open so we can see the result
}

module.exports = {
  runTask
};