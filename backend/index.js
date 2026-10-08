const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { chromium } = require("playwright");

const { runTask } = require("./playwrightRunner");

const app = express();

app.use(cors());
app.use(express.json());

/* =====================================================
   TEMPORARY TASK STORAGE
===================================================== */

const tasks = [];

/* =====================================================
   RECORDING STATE
===================================================== */

let recordingBrowser = null;
let recordingContext = null;
let recordingPage = null;

let isRecording = false;
let currentRecordingUrl = null;
let recordedActions = [];

/* =====================================================
   HOME
===================================================== */

app.get("/", (req, res) => {
  res.json({
    message: "TaskLink backend is running 🚀"
  });
});

/* =====================================================
   LOCAL TEST WEBSITE
===================================================== */

app.get("/test", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>TaskLink Test Website</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f4f4f4;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }

    .container {
      background: white;
      padding: 40px;
      width: 420px;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.12);
    }

    h1 {
      margin-top: 0;
    }

    p {
      color: #666;
    }

    label {
      display: block;
      margin-top: 15px;
      margin-bottom: 6px;
      font-weight: bold;
    }

    input {
      width: 100%;
      padding: 12px;
      border: 1px solid #ccc;
      border-radius: 8px;
      font-size: 16px;
    }

    button {
      width: 100%;
      padding: 13px;
      margin-top: 25px;
      border: none;
      border-radius: 8px;
      background: #222;
      color: white;
      font-size: 16px;
      cursor: pointer;
    }

    #success {
      margin-top: 20px;
      text-align: center;
      font-weight: bold;
      font-size: 17px;
    }
  </style>
</head>

<body>

  <div class="container">

    <h1>TaskLink Test 🚀</h1>

    <p>
      This website is used to test TaskLink browser automation.
    </p>

    <label>Name</label>

    <input
      type="text"
      id="name"
      name="name"
      placeholder="Enter your name"
    />

    <label>Email</label>

    <input
      type="email"
      id="email"
      name="email"
      placeholder="Enter your email"
    />

    <button id="submitBtn">
      Submit
    </button>

    <div id="success"></div>

  </div>

  <script>

    document
      .getElementById("submitBtn")
      .addEventListener("click", () => {

        const name =
          document
            .getElementById("name")
            .value
            .trim();

        const email =
          document
            .getElementById("email")
            .value
            .trim();

        const success =
          document.getElementById("success");

        if (!name || !email) {

          success.innerText =
            "Please fill all fields ❌";

          success.style.color = "red";

          return;
        }

        success.innerText =
          "Task completed successfully! ✅";

        success.style.color = "green";

      });

  </script>

</body>
</html>
  `);
});

/* =====================================================
   CREATE TASK
===================================================== */

app.post("/api/tasks", (req, res) => {

  const {
    name,
    url,
    actions
  } = req.body;

  if (!name) {
    return res.status(400).json({
      error: "Task name is required"
    });
  }

  if (!url) {
    return res.status(400).json({
      error: "Website URL is required"
    });
  }

  const task = {
    id: crypto.randomUUID(),
    name,
    url,
    actions: actions || [],
    createdAt: new Date().toISOString()
  };

  tasks.push(task);

  console.log("✅ Task created:", task);

  res.status(201).json({
    message: "Task created!",
    task
  });
});

/* =====================================================
   GET ALL TASKS
===================================================== */

app.get("/api/tasks", (req, res) => {
  res.json(tasks);
});

/* =====================================================
   GET ONE TASK
===================================================== */

app.get("/api/tasks/:id", (req, res) => {

  const task = tasks.find(
    task => task.id === req.params.id
  );

  if (!task) {
    return res.status(404).json({
      error: "Task not found"
    });
  }

  res.json(task);
});

/* =====================================================
   CREATE SELECTOR
===================================================== */

function getSelector(element) {

  if (element.id) {
    return `#${element.id}`;
  }

  if (element.getAttribute("name")) {
    return `[name="${element.getAttribute("name")}"]`;
  }

  if (element.getAttribute("data-testid")) {
    return `[data-testid="${element.getAttribute("data-testid")}"]`;
  }

  if (element.getAttribute("placeholder")) {
    return `${element.tagName.toLowerCase()}[placeholder="${element.getAttribute("placeholder")}"]`;
  }

  const tag = element.tagName.toLowerCase();

  const sameElements =
    Array.from(
      document.querySelectorAll(tag)
    );

  const index =
    sameElements.indexOf(element) + 1;

  return `${tag}:nth-of-type(${index})`;
}

/* =====================================================
   START RECORDING
===================================================== */

app.post("/api/record/start", async (req, res) => {

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      error: "Website URL is required"
    });
  }

  if (isRecording) {
    return res.status(400).json({
      error: "Recording already running"
    });
  }

  let cleanUrl = url.trim();

  if (
    !cleanUrl.startsWith("http://") &&
    !cleanUrl.startsWith("https://")
  ) {
    cleanUrl = `https://${cleanUrl}`;
  }

  try {

    new URL(cleanUrl);

  } catch {

    return res.status(400).json({
      error: "Invalid website URL"
    });

  }

  try {

    console.log("🎬 Starting recording:", cleanUrl);

    recordedActions = [];
    currentRecordingUrl = cleanUrl;
    isRecording = true;

    recordingBrowser = await chromium.launch({
      headless: false
    });

    recordingContext =
      await recordingBrowser.newContext();

    recordingPage =
      await recordingContext.newPage();

    await recordingPage.goto(cleanUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    console.log("🌐 Recording browser opened");
    console.log("🔴 Recording started");

    /* ---------------------------------------------
       CLICK RECORDER
    --------------------------------------------- */

    await recordingPage.exposeFunction(
      "tasklinkRecordClick",
      (data) => {

        if (!isRecording) return;

        const action = {
          type: "click",
          selector: data.selector,
          target: data.target,
          timestamp: Date.now()
        };

        recordedActions.push(action);

        console.log(
          "🖱️ Recorded click:",
          action
        );
      }
    );

    /* ---------------------------------------------
       INPUT RECORDER
    --------------------------------------------- */

    await recordingPage.exposeFunction(
      "tasklinkRecordInput",
      (data) => {

        if (!isRecording) return;

        const action = {
          type: "input",
          selector: data.selector,
          target: data.target,
          value: data.value,
          timestamp: Date.now()
        };

        recordedActions.push(action);

        console.log(
          "⌨️ Recorded input:",
          action
        );
      }
    );

    /* ---------------------------------------------
       INJECT EVENT LISTENERS
    --------------------------------------------- */

    await recordingPage.evaluate(() => {

      function selectorFor(element) {

        if (element.id) {
          return `#${element.id}`;
        }

        if (element.getAttribute("name")) {
          return `[name="${element.getAttribute("name")}"]`;
        }

        if (element.getAttribute("data-testid")) {
          return `[data-testid="${element.getAttribute("data-testid")}"]`;
        }

        if (element.getAttribute("placeholder")) {
          return `${element.tagName.toLowerCase()}[placeholder="${element.getAttribute("placeholder")}"]`;
        }

        return element.tagName.toLowerCase();
      }

      /* CLICK */

      document.addEventListener(
        "click",
        (event) => {

          const element =
            event.target.closest(
              "button, a, input, textarea, select, [role='button']"
            );

          if (!element) return;

          window.tasklinkRecordClick({
            selector: selectorFor(element),
            target:
              element.innerText ||
              element.getAttribute("aria-label") ||
              element.getAttribute("placeholder") ||
              element.value ||
              element.tagName
          });

        },
        true
      );

      /* INPUT */

      document.addEventListener(
        "input",
        (event) => {

          const element = event.target;

          if (
            !element.matches(
              "input, textarea"
            )
          ) {
            return;
          }

          window.tasklinkRecordInput({
            selector: selectorFor(element),
            target:
              element.getAttribute("placeholder") ||
              element.getAttribute("name") ||
              element.getAttribute("aria-label") ||
              element.tagName,
            value: element.value
          });

        },
        true
      );

    });

    res.json({
      message: "Recording started",
      url: cleanUrl
    });

  } catch (error) {

    console.error(
      "❌ Recording start failed:",
      error
    );

    isRecording = false;

    if (recordingBrowser) {
      await recordingBrowser.close();
    }

    recordingBrowser = null;
    recordingContext = null;
    recordingPage = null;

    res.status(500).json({
      error: "Failed to start recording",
      details: error.message
    });
  }
});

/* =====================================================
   STOP RECORDING
===================================================== */

app.post("/api/record/stop", async (req, res) => {

  if (!isRecording) {

    return res.status(400).json({
      error: "No recording is currently running"
    });

  }

  try {

    console.log("⏹️ Stopping recording");

    isRecording = false;

    const actions = [...recordedActions];

    console.log(
      "📦 Total recorded actions:",
      actions.length
    );

    if (recordingBrowser) {
      await recordingBrowser.close();
    }

    recordingBrowser = null;
    recordingContext = null;
    recordingPage = null;

    res.json({
      message: "Recording stopped",
      url: currentRecordingUrl,
      actions
    });

  } catch (error) {

    console.error(
      "❌ Recording stop failed:",
      error
    );

    res.status(500).json({
      error: error.message
    });

  }
});

/* =====================================================
   RECORDING STATUS
===================================================== */

app.get("/api/record/status", (req, res) => {

  res.json({
    recording: isRecording,
    url: currentRecordingUrl,
    actions: recordedActions.length
  });

});

/* =====================================================
   REPLAY TASK
===================================================== */

app.post(
  "/api/tasks/:id/replay",
  async (req, res) => {

    const task = tasks.find(
      task =>
        task.id === req.params.id
    );

    if (!task) {

      return res.status(404).json({
        error: "Task not found"
      });

    }

    try {

      console.log(
        "🚀 Replaying task:",
        task.name
      );

      console.log(
        "🌐 Opening:",
        task.url
      );

      res.json({
        message: "Replay started",
        task
      });

      await runTask(task);

    } catch (error) {

      console.error(
        "❌ Replay failed:",
        error
      );

    }

  }
);

/* =====================================================
   START SERVER
===================================================== */

app.listen(5001, () => {

  console.log(
    "TaskLink server running on http://localhost:5001"
  );

  console.log(
    "Test website: http://localhost:5001/test"
  );

});