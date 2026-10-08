const { chromium } = require("playwright");

async function recordWorkflow(url) {
  console.log("🎬 Starting recording:", url);

  const browser = await chromium.launch({
    headless: false
  });

  const page = await browser.newPage();

  const actions = [];

  try {
    console.log("🌐 Opening:", url);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    console.log("✅ Website opened");
    console.log("🔴 Recording started");
    console.log("👉 Perform your actions in the Chrome window");
    console.log("🛑 Press ENTER in this terminal when finished");

    // Inject recorder into the webpage
    await page.exposeFunction("tasklinkRecordAction", (action) => {
      console.log("📌 Recorded:", action);
      actions.push(action);
    });

    await page.addInitScript(() => {
      window.__tasklinkGetSelector = (element) => {
        if (!element) return null;

        if (element.id) {
          return `#${CSS.escape(element.id)}`;
        }

        if (element.getAttribute("data-testid")) {
          return `[data-testid="${element.getAttribute(
            "data-testid"
          )}"]`;
        }

        if (element.getAttribute("name")) {
          return `${element.tagName.toLowerCase()}[name="${element.getAttribute(
            "name"
          )}"]`;
        }

        if (element.getAttribute("placeholder")) {
          return `${element.tagName.toLowerCase()}[placeholder="${element.getAttribute(
            "placeholder"
          )}"]`;
        }

        return element.tagName.toLowerCase();
      };

      document.addEventListener(
        "click",
        (event) => {
          const element = event.target;

          if (!element || !element.tagName) return;

          const selector = window.__tasklinkGetSelector(element);

          const target =
            element.innerText ||
            element.getAttribute("aria-label") ||
            element.getAttribute("placeholder") ||
            element.tagName;

          window.tasklinkRecordAction({
            type: "click",
            selector,
            target: target.trim().slice(0, 100)
          });
        },
        true
      );

      document.addEventListener(
        "input",
        (event) => {
          const element = event.target;

          if (!element || !element.tagName) return;

          const selector = window.__tasklinkGetSelector(element);

          window.tasklinkRecordAction({
            type: "input",
            selector,
            target:
              element.getAttribute("placeholder") ||
              element.getAttribute("aria-label") ||
              element.tagName,
            value: element.value || ""
          });
        },
        true
      );
    });

    // Re-inject listeners after the page has loaded.
    await page.evaluate(() => {
      if (window.__tasklinkRecorderInstalled) return;

      window.__tasklinkRecorderInstalled = true;

      window.__tasklinkGetSelector = (element) => {
        if (!element) return null;

        if (element.id) {
          return `#${CSS.escape(element.id)}`;
        }

        if (element.getAttribute("data-testid")) {
          return `[data-testid="${element.getAttribute(
            "data-testid"
          )}"]`;
        }

        if (element.getAttribute("name")) {
          return `${element.tagName.toLowerCase()}[name="${element.getAttribute(
            "name"
          )}"]`;
        }

        if (element.getAttribute("placeholder")) {
          return `${element.tagName.toLowerCase()}[placeholder="${element.getAttribute(
            "placeholder"
          )}"]`;
        }

        return element.tagName.toLowerCase();
      };

      document.addEventListener(
        "click",
        (event) => {
          const element = event.target;

          if (!element || !element.tagName) return;

          const selector =
            window.__tasklinkGetSelector(element);

          const target =
            element.innerText ||
            element.getAttribute("aria-label") ||
            element.getAttribute("placeholder") ||
            element.tagName;

          window.tasklinkRecordAction({
            type: "click",
            selector,
            target: target.trim().slice(0, 100)
          });
        },
        true
      );

      document.addEventListener(
        "input",
        (event) => {
          const element = event.target;

          if (!element || !element.tagName) return;

          const selector =
            window.__tasklinkGetSelector(element);

          window.tasklinkRecordAction({
            type: "input",
            selector,
            target:
              element.getAttribute("placeholder") ||
              element.getAttribute("aria-label") ||
              element.tagName,
            value: element.value || ""
          });
        },
        true
      );
    });

    console.log("🔴 External website recording started");

    // Wait for ENTER in terminal
    await new Promise((resolve) => {
      process.stdin.setEncoding("utf8");

      process.stdin.resume();

      process.stdin.once("data", () => {
        resolve();
      });
    });

    console.log("🛑 Recording stopped");

    console.log("📦 Total actions:", actions.length);

    return actions;
  } catch (error) {
    console.error("❌ Recording failed:");
    console.error(error);

    throw error;
  }
}

module.exports = {
  recordWorkflow
};