require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { chromium } = require("playwright");

const { runTask } = require("./playwrightRunner");
const pool = require("./db");

const app = express();

app.use(cors());
app.use(express.json());


// =====================================================
// RECORDING STATE
// =====================================================

let recordingBrowser = null;
let recordingContext = null;
let recordingPage = null;

let isRecording = false;
let currentRecordingUrl = null;
let recordedActions = [];


// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {
  res.json({
    message: "TaskLink backend is running 🚀"
  });
});


// =====================================================
// POLISHED DEMO WEBSITE
// =====================================================

app.get("/test", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">

<head>

  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>TaskLink Demo Portal</title>

  <style>

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      min-height: 100%;
    }

    body {

      min-height: 100vh;

      font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

      color: #f5f5f7;

      background:
        radial-gradient(
          circle at 15% 10%,
          rgba(139, 92, 246, 0.20),
          transparent 32%
        ),

        radial-gradient(
          circle at 85% 90%,
          rgba(59, 130, 246, 0.14),
          transparent 30%
        ),

        #07080c;

      display: flex;

      align-items: center;

      justify-content: center;

      padding: 40px 20px;

    }


    /* =========================================
       PAGE
    ========================================= */

    .page {

      width: 100%;

      max-width: 1120px;

    }


    /* =========================================
       NAVBAR
    ========================================= */

    .navbar {

      display: flex;

      align-items: center;

      justify-content: space-between;

      margin-bottom: 55px;

    }


    .brand {

      display: flex;

      align-items: center;

      gap: 11px;

      font-size: 21px;

      font-weight: 750;

      letter-spacing: -0.6px;

    }


    .brand-icon {

      width: 38px;

      height: 38px;

      display: flex;

      align-items: center;

      justify-content: center;

      border-radius: 11px;

      background:
        linear-gradient(
          135deg,
          #a78bfa,
          #6347e8
        );

      box-shadow:
        0 0 30px
        rgba(139, 92, 246, 0.35);

      font-size: 18px;

    }


    .demo-badge {

      display: flex;

      align-items: center;

      gap: 8px;

      padding: 8px 13px;

      border: 1px solid #292c36;

      border-radius: 999px;

      background:
        rgba(255,255,255,0.035);

      color: #a8a9b3;

      font-size: 12px;

    }


    .dot {

      width: 7px;

      height: 7px;

      border-radius: 50%;

      background: #34d399;

      box-shadow:
        0 0 12px
        rgba(52,211,153,0.8);

    }


    /* =========================================
       MAIN LAYOUT
    ========================================= */

    .layout {

      display: grid;

      grid-template-columns:
        0.9fr
        1.1fr;

      gap: 80px;

      align-items: center;

    }


    /* =========================================
       LEFT SIDE
    ========================================= */

    .eyebrow {

      display: inline-flex;

      align-items: center;

      gap: 8px;

      color: #a78bfa;

      font-size: 11px;

      font-weight: 750;

      letter-spacing: 2px;

      text-transform: uppercase;

      margin-bottom: 20px;

    }


    .eyebrow::before {

      content: "";

      width: 24px;

      height: 1px;

      background: #8b5cf6;

    }


    h1 {

      margin: 0;

      max-width: 570px;

      font-size:
        clamp(42px, 5.2vw, 68px);

      line-height: 0.99;

      letter-spacing: -4px;

      font-weight: 750;

    }


    .gradient {

      background:
        linear-gradient(
          135deg,
          #ffffff 15%,
          #c4b5fd 55%,
          #8b5cf6 100%
        );

      -webkit-background-clip: text;

      -webkit-text-fill-color: transparent;

      background-clip: text;

    }


    .description {

      margin-top: 25px;

      max-width: 510px;

      color: #92949f;

      font-size: 15px;

      line-height: 1.75;

    }


    /* =========================================
       FEATURES
    ========================================= */

    .features {

      display: flex;

      flex-direction: column;

      gap: 13px;

      margin-top: 30px;

    }


    .feature {

      display: flex;

      align-items: center;

      gap: 11px;

      color: #b9bac4;

      font-size: 13px;

    }


    .check {

      width: 21px;

      height: 21px;

      flex-shrink: 0;

      display: flex;

      align-items: center;

      justify-content: center;

      border-radius: 6px;

      background:
        rgba(139,92,246,0.12);

      border:
        1px solid
        rgba(139,92,246,0.18);

      color: #a78bfa;

      font-size: 11px;

    }


    /* =========================================
       FORM CARD
    ========================================= */

    .card {

      position: relative;

      padding: 34px;

      border-radius: 25px;

      border:
        1px solid #292c36;

      background:
        linear-gradient(
          145deg,
          rgba(255,255,255,0.065),
          rgba(255,255,255,0.018)
        );

      box-shadow:
        0 35px 100px
        rgba(0,0,0,0.48),

        inset 0 1px 0
        rgba(255,255,255,0.045);

      backdrop-filter:
        blur(22px);

    }


    .card::before {

      content: "";

      position: absolute;

      top: -1px;

      left: 15%;

      width: 70%;

      height: 1px;

      background:
        linear-gradient(
          90deg,
          transparent,
          rgba(167,139,250,0.65),
          transparent
        );

    }


    .card-header {

      display: flex;

      align-items: center;

      justify-content: space-between;

      margin-bottom: 29px;

    }


    .card-title {

      font-size: 19px;

      font-weight: 680;

      letter-spacing: -0.3px;

    }


    .secure {

      padding: 6px 10px;

      border-radius: 7px;

      color: #6ee7b7;

      background:
        rgba(16,185,129,0.08);

      border:
        1px solid
        rgba(16,185,129,0.18);

      font-size: 10px;

      font-weight: 650;

    }


    /* =========================================
       FORM
    ========================================= */

    .field {

      margin-bottom: 18px;

    }


    .field label {

      display: block;

      margin-bottom: 8px;

      color: #9b9ca6;

      font-size: 10px;

      font-weight: 700;

      letter-spacing: 1.1px;

    }


    .field input {

      width: 100%;

      height: 49px;

      padding: 0 15px;

      border-radius: 11px;

      border:
        1px solid #2b2e38;

      outline: none;

      background:
        rgba(10,11,16,0.75);

      color: #f5f5f7;

      font-size: 14px;

      transition:
        border-color 0.2s,
        box-shadow 0.2s,
        background 0.2s;

    }


    .field input::placeholder {

      color: #555863;

    }


    .field input:hover {

      border-color: #3a3d48;

    }


    .field input:focus {

      border-color: #8b5cf6;

      background:
        rgba(15,15,23,0.95);

      box-shadow:
        0 0 0 3px
        rgba(139,92,246,0.12);

    }


    /* =========================================
       SUBMIT BUTTON
    ========================================= */

    .submit {

      width: 100%;

      height: 51px;

      margin-top: 7px;

      border: none;

      border-radius: 12px;

      cursor: pointer;

      color: white;

      font-size: 14px;

      font-weight: 700;

      letter-spacing: -0.1px;

      background:
        linear-gradient(
          135deg,
          #9b6cff,
          #6747ed
        );

      box-shadow:
        0 12px 35px
        rgba(109,74,255,0.25);

      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease,
        filter 0.18s ease;

    }


    .submit:hover {

      transform:
        translateY(-2px);

      filter:
        brightness(1.08);

      box-shadow:
        0 18px 42px
        rgba(109,74,255,0.38);

    }


    .submit:active {

      transform:
        translateY(0);

    }


    /* =========================================
       RESULT
    ========================================= */

    #success {

      display: none;

      margin-top: 17px;

      padding: 14px;

      border-radius: 11px;

      text-align: center;

      font-size: 13px;

      font-weight: 650;

    }


    .success {

      display: block !important;

      color: #6ee7b7;

      background:
        rgba(16,185,129,0.08);

      border:
        1px solid
        rgba(16,185,129,0.20);

    }


    .error {

      display: block !important;

      color: #fca5a5;

      background:
        rgba(239,68,68,0.08);

      border:
        1px solid
        rgba(239,68,68,0.20);

    }


    /* =========================================
       FOOTER
    ========================================= */

    .footer {

      margin-top: 22px;

      text-align: center;

      color: #555863;

      font-size: 10px;

    }


    /* =========================================
       RESPONSIVE
    ========================================= */

    @media (max-width: 850px) {

      body {

        padding:
          25px 18px;

      }


      .navbar {

        margin-bottom: 38px;

      }


      .layout {

        grid-template-columns: 1fr;

        gap: 45px;

      }


      h1 {

        font-size:
          clamp(40px, 11vw, 58px);

        letter-spacing: -3px;

      }


      .description {

        max-width: 650px;

      }


      .card {

        padding: 25px;

      }

    }


    @media (max-width: 480px) {

      .demo-badge {

        display: none;

      }


      .card {

        padding: 22px;

        border-radius: 20px;

      }

    }

  </style>

</head>


<body>

  <div class="page">


    <!-- NAVBAR -->

    <div class="navbar">

      <div class="brand">

        <div class="brand-icon">
          ⚡
        </div>

        TaskLink

      </div>


      <div class="demo-badge">

        <span class="dot"></span>

        Automation Demo

      </div>

    </div>


    <!-- MAIN -->

    <div class="layout">


      <!-- LEFT CONTENT -->

      <div>

        <div class="eyebrow">

          Browser Workflow Demo

        </div>


        <h1>

          Complete tasks.

          <span class="gradient">

            Automatically.

          </span>

        </h1>


        <p class="description">

          This page simulates a real business workflow.
          TaskLink records browser actions once and
          replays them automatically using Playwright
          with an Agentic AI recovery layer.

        </p>


        <div class="features">


          <div class="feature">

            <span class="check">
              ✓
            </span>

            Browser actions recorded once

          </div>


          <div class="feature">

            <span class="check">
              ✓
            </span>

            Playwright executes the workflow

          </div>


          <div class="feature">

            <span class="check">
              ✓
            </span>

            AI can recover from UI changes

          </div>


        </div>

      </div>


      <!-- FORM CARD -->

      <div class="card">


        <div class="card-header">

          <div class="card-title">

            Create your workspace

          </div>


          <div class="secure">

            ● Secure Demo

          </div>

        </div>


        <!-- NAME -->

        <div class="field">

          <label>
            FULL NAME
          </label>

          <input
            type="text"
            id="name"
            name="name"
            placeholder="Enter your full name"
          />

        </div>


        <!-- EMAIL -->

        <div class="field">

          <label>
            WORK EMAIL
          </label>

          <input
            type="email"
            id="email"
            name="email"
            placeholder="you@example.com"
          />

        </div>


        <!-- ORGANIZATION -->

        <div class="field">

          <label>
            ORGANIZATION
          </label>

          <input
            type="text"
            id="company"
            name="company"
            placeholder="Company or organization"
          />

        </div>


        <!-- BUTTON -->

        <button
          id="submitBtn"
          class="submit"
        >

          Complete Setup →

        </button>


        <!-- RESULT -->

        <div id="success"></div>


        <div class="footer">

          Powered by TaskLink · Agentic Browser Automation

        </div>


      </div>

    </div>

  </div>


  <!-- JAVASCRIPT -->

  <script>

    const submitButton =
      document.getElementById(
        "submitBtn"
      );


    submitButton.addEventListener(
      "click",
      () => {

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


        const company =
          document
            .getElementById("company")
            .value
            .trim();


        const success =
          document.getElementById(
            "success"
          );


        if (
          !name ||
          !email ||
          !company
        ) {

          success.innerText =
            "Please complete all fields.";

          success.className =
            "error";

          return;

        }


        success.innerText =
          "✓ Workflow completed successfully!";

        success.className =
          "success";

      }
    );

  </script>

</body>

</html>
  `);
});


// =====================================================
// CREATE TASK - POSTGRESQL
// =====================================================

app.post("/api/tasks", async (req, res) => {

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


  try {

    const result =
      await pool.query(
        `
        INSERT INTO tasks (
          name,
          url,
          actions
        )
        VALUES ($1, $2, $3)
        RETURNING
          id,
          name,
          url,
          actions,
          created_at AS "createdAt"
        `,
        [
          name,
          url,
          JSON.stringify(actions || [])
        ]
      );


    const task =
      result.rows[0];


    console.log(
      "✅ Task saved to PostgreSQL:",
      task
    );


    res.status(201).json({
      message: "Task created!",
      task
    });


  } catch (error) {

    console.error(
      "❌ Database error:",
      error.message
    );


    res.status(500).json({
      error: "Failed to save task"
    });

  }

});


// =====================================================
// GET ALL TASKS
// =====================================================

app.get("/api/tasks", async (req, res) => {

  try {

    const result =
      await pool.query(
        `
        SELECT
          id,
          name,
          url,
          actions,
          created_at AS "createdAt"
        FROM tasks
        ORDER BY created_at DESC
        `
      );


    res.json(
      result.rows
    );


  } catch (error) {

    console.error(
      "❌ Failed to fetch tasks:",
      error.message
    );


    res.status(500).json({
      error: "Failed to fetch tasks"
    });

  }

});


// =====================================================
// GET ONE TASK
// =====================================================

app.get(
  "/api/tasks/:id",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            id,
            name,
            url,
            actions,
            created_at AS "createdAt"
          FROM tasks
          WHERE id = $1
          `,
          [
            req.params.id
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          error: "Task not found"
        });

      }


      res.json(
        result.rows[0]
      );


    } catch (error) {

      console.error(
        "❌ Failed to fetch task:",
        error.message
      );


      res.status(500).json({
        error: "Failed to fetch task"
      });

    }

  }
);


// =====================================================
// START RECORDING
// =====================================================

app.post(
  "/api/record/start",
  async (req, res) => {

    const { url } =
      req.body;


    if (!url) {

      return res.status(400).json({
        error:
          "Website URL is required"
      });

    }


    if (isRecording) {

      return res.status(400).json({
        error:
          "Recording already running"
      });

    }


    let cleanUrl =
      url.trim();


    if (
      !cleanUrl.startsWith(
        "http://"
      ) &&
      !cleanUrl.startsWith(
        "https://"
      )
    ) {

      cleanUrl =
        `https://${cleanUrl}`;

    }


    try {

      new URL(cleanUrl);

    } catch {

      return res.status(400).json({
        error:
          "Invalid website URL"
      });

    }


    try {

      console.log(
        "🎬 Starting recording:",
        cleanUrl
      );


      recordedActions = [];

      currentRecordingUrl =
        cleanUrl;

      isRecording = true;


      recordingBrowser =
        await chromium.launch({
          headless: false
        });


      recordingContext =
        await recordingBrowser.newContext();


      recordingPage =
        await recordingContext.newPage();


      await recordingPage.goto(
        cleanUrl,
        {
          waitUntil:
            "domcontentloaded",

          timeout: 30000
        }
      );


      console.log(
        "🌐 Recording browser opened"
      );


      console.log(
        "🔴 Recording started"
      );


      // =========================================
      // CLICK RECORDER
      // =========================================

      await recordingPage.exposeFunction(
        "tasklinkRecordClick",
        (data) => {

          if (!isRecording) {
            return;
          }


          const action = {

            type: "click",

            selector:
              data.selector,

            target:
              data.target,

            timestamp:
              Date.now()

          };


          recordedActions.push(
            action
          );


          console.log(
            "🖱️ Recorded click:",
            action
          );

        }
      );


      // =========================================
      // INPUT RECORDER
      // =========================================

      await recordingPage.exposeFunction(
        "tasklinkRecordInput",
        (data) => {

          if (!isRecording) {
            return;
          }


          const action = {

            type: "input",

            selector:
              data.selector,

            target:
              data.target,

            value:
              data.value,

            timestamp:
              Date.now()

          };


          recordedActions.push(
            action
          );


          console.log(
            "⌨️ Recorded input:",
            action
          );

        }
      );


      // =========================================
      // INJECT EVENT LISTENERS
      // =========================================

      await recordingPage.evaluate(() => {

        function selectorFor(
          element
        ) {

          if (
            element.id
          ) {

            return `#${element.id}`;

          }


          if (
            element.getAttribute(
              "name"
            )
          ) {

            return `[name="${element.getAttribute(
              "name"
            )}"]`;

          }


          if (
            element.getAttribute(
              "data-testid"
            )
          ) {

            return `[data-testid="${element.getAttribute(
              "data-testid"
            )}"]`;

          }


          if (
            element.getAttribute(
              "placeholder"
            )
          ) {

            return `${element.tagName.toLowerCase()}[placeholder="${element.getAttribute(
              "placeholder"
            )}"]`;

          }


          return element.tagName
            .toLowerCase();

        }


        // =========================================
        // CLICK
        // =========================================

        document.addEventListener(
          "click",
          (event) => {

            const target =
              event.target;


            if (
              !target ||
              !target.closest
            ) {

              return;

            }


            const element =
              target.closest(
                "button, a, input, textarea, select, [role='button']"
              );


            if (!element) {
              return;
            }


            window.tasklinkRecordClick({

              selector:
                selectorFor(
                  element
                ),

              target:

                element.innerText ||

                element.getAttribute(
                  "aria-label"
                ) ||

                element.getAttribute(
                  "placeholder"
                ) ||

                element.value ||

                element.tagName

            });

          },

          true
        );


        // =========================================
        // INPUT
        // =========================================

        document.addEventListener(
          "input",
          (event) => {

            const element =
              event.target;


            if (
              !element ||
              !element.matches
            ) {

              return;

            }


            if (
              !element.matches(
                "input, textarea"
              )
            ) {

              return;

            }


            window.tasklinkRecordInput({

              selector:
                selectorFor(
                  element
                ),

              target:

                element.getAttribute(
                  "placeholder"
                ) ||

                element.getAttribute(
                  "name"
                ) ||

                element.getAttribute(
                  "aria-label"
                ) ||

                element.tagName,

              value:
                element.value

            });

          },

          true
        );

      });


      res.json({

        message:
          "Recording started",

        url:
          cleanUrl

      });


    } catch (error) {

      console.error(
        "❌ Recording start failed:",
        error
      );


      isRecording = false;


      if (
        recordingBrowser
      ) {

        await recordingBrowser.close();

      }


      recordingBrowser =
        null;

      recordingContext =
        null;

      recordingPage =
        null;


      res.status(500).json({

        error:
          "Failed to start recording",

        details:
          error.message

      });

    }

  }
);


// =====================================================
// STOP RECORDING
// =====================================================

app.post(
  "/api/record/stop",
  async (req, res) => {

    if (!isRecording) {

      return res.status(400).json({
        error:
          "No recording is currently running"
      });

    }


    try {

      console.log(
        "⏹️ Stopping recording"
      );


      isRecording =
        false;


      const actions =
        [...recordedActions];


      console.log(
        "📦 Total recorded actions:",
        actions.length
      );


      if (
        recordingBrowser
      ) {

        await recordingBrowser.close();

      }


      recordingBrowser =
        null;

      recordingContext =
        null;

      recordingPage =
        null;


      res.json({

        message:
          "Recording stopped",

        url:
          currentRecordingUrl,

        actions

      });


    } catch (error) {

      console.error(
        "❌ Recording stop failed:",
        error
      );


      res.status(500).json({

        error:
          error.message

      });

    }

  }
);


// =====================================================
// RECORDING STATUS
// =====================================================

app.get(
  "/api/record/status",
  (req, res) => {

    res.json({

      recording:
        isRecording,

      url:
        currentRecordingUrl,

      actions:
        recordedActions.length

    });

  }
);


// =====================================================
// REPLAY TASK
// =====================================================

app.post(
  "/api/tasks/:id/replay",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            id,
            name,
            url,
            actions,
            created_at AS "createdAt"
          FROM tasks
          WHERE id = $1
          `,
          [
            req.params.id
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          error:
            "Task not found"
        });

      }


      const task =
        result.rows[0];


      console.log(
        "🚀 Replaying task:",
        task.name
      );


      console.log(
        "🌐 Opening:",
        task.url
      );


      // Respond immediately.
      // Playwright continues in background.

      res.json({

        message:
          "Replay started",

        task

      });


      await runTask(
        task
      );


      console.log(
        "🎉 Replay finished:",
        task.name
      );


    } catch (error) {

      console.error(
        "❌ Replay failed:",
        error
      );

    }

  }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
  5001,
  () => {

    console.log(
      "TaskLink server running on http://localhost:5001"
    );

    console.log(
      "Test website: http://localhost:5001/test"
    );

  }
);


// Keep process alive

setInterval(
  () => {},
  1000
);