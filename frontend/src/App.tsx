import { useEffect, useState } from "react";

type Action =
  | {
      type: "click";
      selector: string;
      target: string;
    }
  | {
      type: "input";
      selector: string;
      target: string;
      value: string;
    };

type Task = {
  id: string;
  name: string;
  url: string;
  actions: Action[];
  createdAt: string;
};

function App() {
  const [taskName, setTaskName] = useState("");
  const [startUrl, setStartUrl] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  // =========================
  // LOAD TASKS
  // =========================

  const loadTasks = async () => {
    try {
      const response = await fetch(
        "http://localhost:5001/api/tasks"
      );

      const data = await response.json();

      setTasks(data);
    } catch {
      setResult("Unable to connect to backend.");
    }
  };

  // =========================
  // START RECORDING
  // =========================

  const startRecording = async () => {
    if (!startUrl.trim()) {
      setResult("Please enter a website URL.");
      return;
    }

    let cleanUrl = startUrl.trim();

    if (
      !cleanUrl.startsWith("http://") &&
      !cleanUrl.startsWith("https://")
    ) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      const parsedUrl = new URL(cleanUrl);

      if (
        parsedUrl.protocol !== "http:" &&
        parsedUrl.protocol !== "https:"
      ) {
        throw new Error("Invalid URL");
      }
    } catch {
      setResult(
        "Please enter a valid website URL."
      );
      return;
    }

    try {
      setActions([]);
      setResult("Opening browser...");

      const response = await fetch(
        "http://localhost:5001/api/record/start",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: cleanUrl,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setStartUrl(cleanUrl);
      setIsRecording(true);

      setResult("Recording started.");
    } catch (error) {
      console.error(error);
      setResult("Failed to start recording.");
    }
  };

  // =========================
  // STOP RECORDING
  // =========================

  const stopRecording = async () => {
    try {
      setResult("Collecting recorded actions...");

      const response = await fetch(
        "http://localhost:5001/api/record/stop",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setActions(data.actions || []);
      setIsRecording(false);

      setResult(
        `${data.actions?.length || 0} actions recorded.`
      );
    } catch (error) {
      console.error(error);
      setResult("Failed to stop recording.");
    }
  };

  // =========================
  // CREATE TASK
  // =========================

  const createTask = async () => {
    if (!taskName.trim()) {
      setResult("Please enter a workflow name.");
      return;
    }

    if (!startUrl.trim()) {
      setResult("Please enter a website URL.");
      return;
    }

    if (actions.length === 0) {
      setResult("Record at least one action first.");
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5001/api/tasks",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: taskName.trim(),
            url: startUrl,
            actions,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setTasks((previous) => [
        ...previous,
        data.task,
      ]);

      setResult(
        `"${data.task.name}" saved successfully.`
      );

      setTaskName("");
      setStartUrl("");
      setActions([]);
    } catch (error) {
      console.error(error);
      setResult("Failed to save workflow.");
    }
  };

  // =========================
  // REPLAY TASK
  // =========================

  const replayTask = async (task: Task) => {
    try {
      setReplaying(true);

      setResult(
        `Starting "${task.name}"...`
      );

      const response = await fetch(
        `http://localhost:5001/api/tasks/${task.id}/replay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setResult("Workflow execution started.");
    } catch (error) {
      console.error(error);
      setResult("Workflow execution failed.");
    } finally {
      setReplaying(false);
    }
  };

  return (
    <div className="app">

      {/* NAVBAR */}

      <nav className="navbar">

        <div className="logo">
          <div className="logo-mark">
            T
          </div>

          <span>TaskLink</span>
        </div>

        <div className="nav-links">
          <a href="#workflows">
            Workflows
          </a>

          <a href="#how-it-works">
            How it works
          </a>

          <a href="#about">
            About
          </a>
        </div>

        <button
          className="nav-button"
          onClick={() =>
            document
              .getElementById("create")
              ?.scrollIntoView({
                behavior: "smooth",
              })
          }
        >
          Create workflow
        </button>

      </nav>

      {/* HERO */}

      <section className="hero">

        <div className="hero-content">

          <div className="pill">
            <span className="pill-dot"></span>
            Browser automation, reimagined
          </div>

          <h1>
            Record once.
            <br />

            <span>
              Automate everything.
            </span>
          </h1>

          <p className="hero-text">
            TaskLink turns browser actions into
            shareable workflows that can be
            executed automatically.
          </p>

          <div className="hero-actions">

            <button
              className="primary-button"
              onClick={() =>
                document
                  .getElementById("create")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              Create workflow
              <span>↗</span>
            </button>

            <button
              className="secondary-button"
              onClick={() =>
                document
                  .getElementById("workflows")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              View workflows
            </button>

          </div>

        </div>

        {/* BROWSER PREVIEW */}

        <div className="browser-wrapper">

          <div className="browser-window">

            <div className="browser-top">

              <div className="browser-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <div className="address-bar">
                example.com
              </div>

            </div>

            <div className="browser-body">

              <div className="mock-sidebar">
                <div className="mock-logo"></div>
                <div></div>
                <div></div>
                <div></div>
              </div>

              <div className="mock-page">

                <div className="mock-title">
                  Welcome back
                </div>

                <div className="mock-subtitle">
                  Sign in to continue
                </div>

                <div className="mock-input">
                  Email
                </div>

                <div className="mock-input">
                  Password
                </div>

                <div className="mock-button">
                  Sign in
                </div>

              </div>

              <div className="recording-overlay">

                <div className="recording-header">
                  <span className="live-dot"></span>
                  Recording
                </div>

                <div className="recording-action">
                  01&nbsp;&nbsp; Click
                  <span>Sign in</span>
                </div>

                <div className="recording-action">
                  02&nbsp;&nbsp; Input
                  <span>Email</span>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* INTRO STRIP */}

      <section
        className="intro-strip"
        id="how-it-works"
      >

        <div>
          <span>01</span>
          <h3>Record</h3>
          <p>
            Perform your browser task once.
          </p>
        </div>

        <div>
          <span>02</span>
          <h3>Share</h3>
          <p>
            Turn the workflow into a reusable task.
          </p>
        </div>

        <div>
          <span>03</span>
          <h3>Run</h3>
          <p>
            Let TaskLink execute it automatically.
          </p>
        </div>

      </section>

      {/* CREATE */}

      <section
        className="create-section"
        id="create"
      >

        <div className="section-label">
          CREATE WORKFLOW
        </div>

        <div className="section-heading">

          <h2>
            Build your first workflow.
          </h2>

          <p>
            Tell TaskLink where to start,
            then perform the actions you want
            to automate.
          </p>

        </div>

        <div className="create-card">

          <div className="form-row">

            <div className="field">

              <label>
                Workflow name
              </label>

              <input
                type="text"
                placeholder="Employee onboarding"
                value={taskName}
                onChange={(e) =>
                  setTaskName(e.target.value)
                }
                disabled={isRecording}
              />

            </div>

            <div className="field">

              <label>
                Starting website
              </label>

              <input
                type="text"
                placeholder="https://example.com"
                value={startUrl}
                onChange={(e) =>
                  setStartUrl(e.target.value)
                }
                disabled={isRecording}
              />

            </div>

          </div>

          <div className="record-bar">

            <div>

              <strong>
                {isRecording
                  ? "Recording in progress"
                  : "Ready to record"}
              </strong>

              <p>
                {isRecording
                  ? "Use the browser window to perform your workflow."
                  : "TaskLink will open a browser and capture your actions."}
              </p>

            </div>

            {!isRecording ? (

              <button
                className="record-button"
                onClick={startRecording}
                disabled={replaying}
              >
                <span></span>
                Start recording
              </button>

            ) : (

              <button
                className="stop-button"
                onClick={stopRecording}
              >
                Stop recording
              </button>

            )}

          </div>

          {result && (

            <div className="status-message">
              <span></span>
              {result}
            </div>

          )}

        </div>

      </section>

      {/* ACTIONS */}

      <section className="actions-section">

        <div className="section-label">
          RECORDED WORKFLOW
        </div>

        <div className="actions-layout">

          <div>

            <h2>
              Your actions.
            </h2>

            <p className="section-description">
              Every browser interaction is captured
              as a structured action that TaskLink
              can replay.
            </p>

          </div>

          <div className="actions-panel">

            {actions.length === 0 ? (

              <div className="no-actions">

                <div className="empty-symbol">
                  +
                </div>

                <strong>
                  No actions recorded
                </strong>

                <p>
                  Start recording to see your
                  workflow here.
                </p>

              </div>

            ) : (

              <>

                {actions.map(
                  (action, index) => (

                    <div
                      className="action-row"
                      key={index}
                    >

                      <div className="action-index">
                        {String(index + 1).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <div className="action-kind">
                        {action.type === "click"
                          ? "CLICK"
                          : "INPUT"}
                      </div>

                      <div className="action-info">

                        <strong>
                          {action.target}
                        </strong>

                        <code>
                          {action.selector}
                        </code>

                        {action.type ===
                          "input" && (

                          <small>
                            {action.value}
                          </small>

                        )}

                      </div>

                    </div>

                  )
                )}

                <button
                  className="save-workflow"
                  onClick={createTask}
                  disabled={
                    isRecording ||
                    replaying
                  }
                >
                  Save workflow
                  <span>↗</span>
                </button>

              </>

            )}

          </div>

        </div>

      </section>

      {/* WORKFLOWS */}

      <section
        className="workflows-section"
        id="workflows"
      >

        <div className="section-label">
          YOUR WORKFLOWS
        </div>

        <div className="workflows-header">

          <h2>
            Saved workflows.
          </h2>

          <span>
            {tasks.length} total
          </span>

        </div>

        {tasks.length === 0 ? (

          <div className="empty-workflows">

            <p>
              No workflows yet.
            </p>

          </div>

        ) : (

          <div className="workflow-list">

            {tasks.map((task) => (

              <div
                className="workflow-card"
                key={task.id}
              >

                <div className="workflow-left">

                  <div className="workflow-icon">
                    ↗
                  </div>

                  <div>

                    <h3>
                      {task.name}
                    </h3>

                    <p>
                      {task.url}
                    </p>

                  </div>

                </div>

                <div className="workflow-middle">

                  <span>
                    {task.actions.length} actions
                  </span>

                  <span className="ready">
                    ● Ready
                  </span>

                </div>

                <button
                  className="run-button"
                  onClick={() =>
                    replayTask(task)
                  }
                  disabled={
                    replaying ||
                    isRecording
                  }
                >
                  {replaying
                    ? "Running..."
                    : "Run"}
                  <span>↗</span>
                </button>

              </div>

            ))}

          </div>

        )}

      </section>

      {/* AI SECTION */}

      <section
        className="ai-section"
        id="about"
      >

        <div className="ai-copy">

          <div className="section-label">
            NEXT GENERATION
          </div>

          <h2>
            Automation that
            <br />
            can understand.
          </h2>

          <p>
            TaskLink is designed to evolve beyond
            fixed browser replay. Gemini and
            LangGraph will allow the agent to
            understand changing webpages, recover
            from failures and verify its actions.
          </p>

        </div>

        <div className="ai-flow">

          <div>
            <span>01</span>
            Observe
          </div>

          <div className="flow-line"></div>

          <div>
            <span>02</span>
            Think
          </div>

          <div className="flow-line"></div>

          <div>
            <span>03</span>
            Act
          </div>

          <div className="flow-line"></div>

          <div>
            <span>04</span>
            Verify
          </div>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="footer">

        <div className="logo">

          <div className="logo-mark">
            T
          </div>

          <span>TaskLink</span>

        </div>

        <p>
          Record once. Automate everything.
        </p>

      </footer>

      {/* =========================
          STYLES
      ========================= */}

      <style>{`

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: #080808;
          color: #f5f5f2;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        button,
        input {
          font: inherit;
        }

        button {
          cursor: pointer;
        }

        /* NAVBAR */

        .navbar {
          width: min(1200px, calc(100% - 48px));
          margin: auto;
          height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #1c1c1c;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -.4px;
        }

        .logo-mark {
          width: 29px;
          height: 29px;
          border-radius: 8px;
          display: grid;
          place-items: center;
          background: #f1f1ee;
          color: #090909;
          font-size: 13px;
          font-weight: 800;
        }

        .nav-links {
          display: flex;
          gap: 32px;
        }

        .nav-links a {
          color: #777;
          text-decoration: none;
          font-size: 12px;
          transition: .2s;
        }

        .nav-links a:hover {
          color: white;
        }

        .nav-button {
          border: 1px solid #303030;
          background: #f1f1ee;
          color: #080808;
          padding: 9px 14px;
          border-radius: 7px;
          font-size: 11px;
          font-weight: 600;
        }

        /* HERO */

        .hero {
          width: min(1200px, calc(100% - 48px));
          margin: auto;
          padding: 115px 0 90px;
          text-align: center;
        }

        .hero-content {
          max-width: 800px;
          margin: auto;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #272727;
          border-radius: 30px;
          padding: 7px 12px;
          color: #8b8b8b;
          font-size: 10px;
          margin-bottom: 27px;
          background: #0d0d0d;
        }

        .pill-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #9d84ff;
          box-shadow: 0 0 10px #9d84ff;
        }

        .hero h1 {
          font-size: clamp(54px, 8vw, 105px);
          line-height: .91;
          letter-spacing: -6px;
          margin: 0;
          font-weight: 600;
        }

        .hero h1 span {
          color: #696969;
        }

        .hero-text {
          max-width: 490px;
          margin: 31px auto 0;
          color: #858585;
          font-size: 14px;
          line-height: 1.7;
        }

        .hero-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 30px;
        }

        .primary-button,
        .secondary-button {
          border-radius: 7px;
          padding: 12px 17px;
          font-size: 11px;
          font-weight: 600;
        }

        .primary-button {
          border: 0;
          background: #f1f1ee;
          color: #080808;
        }

        .primary-button span {
          margin-left: 12px;
        }

        .secondary-button {
          border: 1px solid #303030;
          background: transparent;
          color: #ddd;
        }

        /* BROWSER */

        .browser-wrapper {
          max-width: 950px;
          margin: 85px auto 0;
          perspective: 1200px;
        }

        .browser-window {
          border: 1px solid #303030;
          border-radius: 14px;
          overflow: hidden;
          background: #101010;
          box-shadow:
            0 35px 100px rgba(0,0,0,.55);
          transform: rotateX(2deg);
        }

        .browser-top {
          height: 42px;
          border-bottom: 1px solid #252525;
          display: flex;
          align-items: center;
          padding: 0 15px;
          gap: 30px;
        }

        .browser-dots {
          display: flex;
          gap: 5px;
        }

        .browser-dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #454545;
        }

        .address-bar {
          flex: 1;
          max-width: 450px;
          margin: auto;
          background: #191919;
          border: 1px solid #252525;
          border-radius: 5px;
          color: #696969;
          padding: 6px 15px;
          font-size: 9px;
          text-align: left;
        }

        .browser-body {
          height: 430px;
          display: flex;
          position: relative;
          background:
            radial-gradient(
              circle at 50% 20%,
              #202020,
              #101010 50%
            );
        }

        .mock-sidebar {
          width: 145px;
          border-right: 1px solid #242424;
          padding: 25px 15px;
        }

        .mock-sidebar div {
          height: 7px;
          width: 75px;
          background: #272727;
          margin-bottom: 15px;
          border-radius: 5px;
        }

        .mock-sidebar .mock-logo {
          width: 28px;
          height: 28px;
          margin-bottom: 30px;
          background: #4b4b4b;
        }

        .mock-page {
          width: 310px;
          margin: auto;
        }

        .mock-title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .mock-subtitle {
          color: #686868;
          font-size: 10px;
          margin-bottom: 25px;
        }

        .mock-input {
          height: 38px;
          border: 1px solid #303030;
          border-radius: 6px;
          color: #5f5f5f;
          padding: 12px;
          font-size: 9px;
          margin-bottom: 9px;
          background: #151515;
        }

        .mock-button {
          height: 38px;
          border-radius: 6px;
          background: #e9e9e5;
          color: #101010;
          text-align: center;
          padding: 12px;
          font-size: 9px;
          font-weight: 600;
        }

        .recording-overlay {
          position: absolute;
          right: 30px;
          top: 30px;
          width: 205px;
          padding: 14px;
          border: 1px solid #37313e;
          border-radius: 9px;
          background: rgba(15,15,18,.94);
          box-shadow: 0 20px 50px rgba(0,0,0,.35);
        }

        .recording-header {
          font-size: 10px;
          color: #bcbcbc;
          margin-bottom: 14px;
        }

        .live-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ff6475;
          margin-right: 7px;
          box-shadow: 0 0 10px #ff6475;
        }

        .recording-action {
          border-top: 1px solid #242424;
          padding: 9px 0;
          color: #676767;
          font-size: 8px;
        }

        .recording-action span {
          float: right;
          color: #c0c0c0;
        }

        /* STRIP */

        .intro-strip {
          width: min(1200px, calc(100% - 48px));
          margin: auto;
          border-top: 1px solid #222;
          border-bottom: 1px solid #222;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          padding: 45px 0;
        }

        .intro-strip > div {
          padding: 0 35px;
          border-right: 1px solid #222;
        }

        .intro-strip > div:first-child {
          padding-left: 0;
        }

        .intro-strip > div:last-child {
          border-right: 0;
        }

        .intro-strip span,
        .section-label {
          color: #5d5d5d;
          font-size: 9px;
          letter-spacing: 1.5px;
          font-weight: 700;
        }

        .intro-strip h3 {
          font-size: 18px;
          margin: 12px 0 6px;
          font-weight: 500;
        }

        .intro-strip p {
          color: #666;
          font-size: 11px;
          margin: 0;
        }

        /* SECTIONS */

        .create-section,
        .actions-section,
        .workflows-section,
        .ai-section {
          width: min(1200px, calc(100% - 48px));
          margin: auto;
          padding: 125px 0;
          border-bottom: 1px solid #202020;
        }

        .section-heading {
          max-width: 650px;
          margin: 22px 0 40px;
        }

        .section-heading h2,
        .actions-layout h2,
        .workflows-header h2,
        .ai-copy h2 {
          font-size: clamp(38px, 5vw, 66px);
          line-height: 1;
          letter-spacing: -3px;
          font-weight: 500;
          margin: 0;
        }

        .section-heading p,
        .section-description {
          color: #707070;
          font-size: 13px;
          line-height: 1.7;
          max-width: 460px;
          margin-top: 20px;
        }

        /* CREATE CARD */

        .create-card {
          border: 1px solid #292929;
          border-radius: 14px;
          padding: 30px;
          background: #0d0d0d;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
        }

        .field label {
          display: block;
          color: #777;
          font-size: 10px;
          margin-bottom: 8px;
        }

        .field input {
          width: 100%;
          border: 1px solid #292929;
          background: #121212;
          color: white;
          padding: 13px;
          border-radius: 7px;
          outline: none;
          font-size: 11px;
        }

        .field input:focus {
          border-color: #6253a8;
        }

        .record-bar {
          margin-top: 18px;
          border: 1px solid #252525;
          border-radius: 9px;
          padding: 17px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .record-bar strong {
          font-size: 11px;
        }

        .record-bar p {
          color: #626262;
          font-size: 9px;
          margin: 5px 0 0;
        }

        .record-button,
        .stop-button {
          padding: 11px 16px;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 600;
        }

        .record-button {
          background: #f0f0ed;
          border: 0;
          color: #080808;
        }

        .record-button span {
          display: inline-block;
          width: 6px;
          height: 6px;
          background: #e45160;
          border-radius: 50%;
          margin-right: 7px;
        }

        .stop-button {
          background: #e45160;
          border: 0;
          color: white;
        }

        .status-message {
          margin-top: 12px;
          padding: 10px;
          background: #141414;
          border-radius: 7px;
          color: #777;
          font-size: 9px;
        }

        .status-message span {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #64dca0;
          margin-right: 7px;
        }

        /* ACTIONS */

        .actions-layout {
          display: grid;
          grid-template-columns: .8fr 1.2fr;
          gap: 80px;
          margin-top: 35px;
        }

        .actions-panel {
          border: 1px solid #292929;
          border-radius: 12px;
          overflow: hidden;
          background: #0d0d0d;
        }

        .no-actions {
          padding: 70px 30px;
          text-align: center;
        }

        .empty-symbol {
          width: 40px;
          height: 40px;
          border: 1px solid #292929;
          border-radius: 50%;
          display: grid;
          place-items: center;
          margin: auto;
          color: #666;
        }

        .no-actions strong {
          display: block;
          margin-top: 15px;
          font-size: 11px;
        }

        .no-actions p {
          color: #5f5f5f;
          font-size: 9px;
        }

        .action-row {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 17px;
          border-bottom: 1px solid #202020;
        }

        .action-index {
          color: #4e4e4e;
          font-size: 9px;
        }

        .action-kind {
          color: #8572d8;
          font-size: 8px;
          font-weight: 700;
          width: 40px;
        }

        .action-info {
          min-width: 0;
        }

        .action-info strong {
          display: block;
          font-size: 10px;
        }

        .action-info code {
          display: block;
          color: #555;
          font-size: 8px;
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .action-info small {
          display: block;
          color: #777;
          font-size: 8px;
          margin-top: 4px;
        }

        .save-workflow {
          width: calc(100% - 30px);
          margin: 15px;
          padding: 12px;
          border: 0;
          border-radius: 7px;
          background: #eeeeeb;
          color: #090909;
          font-size: 10px;
          font-weight: 600;
          display: flex;
          justify-content: space-between;
        }

        /* WORKFLOWS */

        .workflows-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin: 25px 0 30px;
        }

        .workflows-header > span {
          color: #555;
          font-size: 9px;
        }

        .workflow-list {
          display: flex;
          flex-direction: column;
        }

        .workflow-card {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 20px 0;
          border-top: 1px solid #222;
        }

        .workflow-left {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 15px;
          min-width: 0;
        }

        .workflow-icon {
          width: 40px;
          height: 40px;
          border: 1px solid #2b2b2b;
          border-radius: 9px;
          display: grid;
          place-items: center;
          color: #8b7ae4;
        }

        .workflow-left h3 {
          margin: 0;
          font-size: 12px;
          font-weight: 500;
        }

        .workflow-left p {
          color: #555;
          margin: 5px 0 0;
          font-size: 9px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .workflow-middle {
          display: flex;
          gap: 20px;
          color: #555;
          font-size: 9px;
        }

        .workflow-middle .ready {
          color: #5fc993;
        }

        .run-button {
          border: 1px solid #333;
          background: transparent;
          color: #ddd;
          padding: 9px 13px;
          border-radius: 6px;
          font-size: 9px;
        }

        .run-button span {
          margin-left: 10px;
        }

        .empty-workflows {
          border-top: 1px solid #222;
          padding: 40px 0;
          color: #555;
          font-size: 10px;
        }

        /* AI */

        .ai-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 100px;
          align-items: center;
        }

        .ai-copy p {
          max-width: 450px;
          color: #686868;
          font-size: 13px;
          line-height: 1.8;
          margin-top: 25px;
        }

        .ai-flow {
          border: 1px solid #292929;
          border-radius: 14px;
          padding: 28px;
          background:
            radial-gradient(
              circle at 50% 0%,
              #17152a,
              #0d0d0d 65%
            );
        }

        .ai-flow > div:not(.flow-line) {
          padding: 16px 0;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: #ccc;
        }

        .ai-flow span {
          color: #555;
          font-size: 9px;
        }

        .flow-line {
          height: 1px;
          background: #292929;
        }

        /* FOOTER */

        .footer {
          width: min(1200px, calc(100% - 48px));
          margin: auto;
          padding: 35px 0;
          display: flex;
          justify-content: space-between;
          color: #555;
          font-size: 9px;
        }

        /* RESPONSIVE */

        @media (max-width: 800px) {

          .nav-links {
            display: none;
          }

          .navbar {
            width: calc(100% - 30px);
          }

          .hero,
          .intro-strip,
          .create-section,
          .actions-section,
          .workflows-section,
          .ai-section {
            width: calc(100% - 30px);
          }

          .hero {
            padding-top: 75px;
          }

          .hero h1 {
            letter-spacing: -3px;
          }

          .browser-body {
            height: 300px;
          }

          .mock-sidebar {
            display: none;
          }

          .recording-overlay {
            right: 15px;
            top: 15px;
            width: 170px;
          }

          .intro-strip,
          .form-row,
          .actions-layout,
          .ai-section {
            grid-template-columns: 1fr;
          }

          .intro-strip {
            gap: 30px;
          }

          .intro-strip > div {
            border-right: 0;
            padding: 0;
          }

          .actions-layout,
          .ai-section {
            gap: 40px;
          }

          .workflow-middle {
            display: none;
          }

          .record-bar {
            flex-direction: column;
            align-items: flex-start;
          }

          .footer {
            width: calc(100% - 30px);
          }

        }

      `}</style>
    </div>
  );
}

export default App;