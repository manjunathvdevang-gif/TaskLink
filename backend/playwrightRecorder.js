const { chromium } = require("playwright");

let browser = null;
let page = null;
let recordedActions = [];
let isRecording = false;

async function startRecording(url) {
  if (isRecording) {
    throw new Error("Recording is already running");
  }

  recordedActions = [];
  isRecording = true;

  browser = await chromium.launch({
    headless: false
  });

  page = await browser.newPage();

  // Function called from inside the browser
  await page.exposeFunction(
    "__tasklinkRecord",
    (action) => {
      if (!isRecording) return;

      console.log("🎬 Recorded:", action);

      recordedActions.push(action);
    }
  );

  // Inject recorder into every page
  await page.addInitScript(() => {
    function getSelector(element) {
      if (element.id) {
        return `#${element.id}`;
      }

      const testId =
        element.getAttribute("data-testid");

      if (testId) {
        return `[data-testid="${testId}"]`;
      }

      const name =
        element.getAttribute("name");

      if (name) {
        return `${element.tagName.toLowerCase()}[name="${name}"]`;
      }

      const placeholder =
        element.getAttribute("placeholder");

      if (placeholder) {
        return `${element.tagName.toLowerCase()}[placeholder="${placeholder}"]`;
      }

      const text =
        element.innerText?.trim();

      if (
        text &&
        text.length < 80 &&
        element.children.length === 0
      ) {
        return `${element.tagName.toLowerCase()}:has-text("${text}")`;
      }

      return element.tagName.toLowerCase();
    }

    // Record clicks
    document.addEventListener(
      "click",
      (event) => {
        const element =
          event.target;

        if (
          !(element instanceof HTMLElement)
        ) {
          return;
        }

        const action = {
          type: "click",

          selector:
            getSelector(element),

          target:
            element.innerText?.trim() ||
            element.getAttribute(
              "aria-label"
            ) ||
            element.tagName
        };

        window.__tasklinkRecord(action);
      },
      true
    );

    // Record typing
    document.addEventListener(
      "input",
      (event) => {
        const element =
          event.target;

        if (
          !(element instanceof
            HTMLInputElement) &&
          !(element instanceof
            HTMLTextAreaElement) &&
          !(element instanceof
            HTMLSelectElement)
        ) {
          return;
        }

        const action = {
          type: "input",

          selector:
            getSelector(element),

          target:
            element.getAttribute(
              "placeholder"
            ) ||
            element.getAttribute(
              "name"
            ) ||
            element.tagName,

          value: element.value
        };

        window.__tasklinkRecord(action);
      },
      true
    );
  });

  console.log("🌐 Opening:", url);

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 30000
  });

  console.log(
    "🔴 External website recording started"
  );

  console.log(
    "👉 Perform your actions in the Chrome window"
  );

  return true;
}

async function stopRecording() {
  if (!isRecording) {
    throw new Error(
      "Recording is not running"
    );
  }

  isRecording = false;

  console.log(
    "⏹ Recording stopped"
  );

  console.log(
    "📦 Total actions:",
    recordedActions.length
  );

  return recordedActions;
}

function getRecordingStatus() {
  return {
    isRecording,
    actions: recordedActions
  };
}

module.exports = {
  startRecording,
  stopRecording,
  getRecordingStatus
};