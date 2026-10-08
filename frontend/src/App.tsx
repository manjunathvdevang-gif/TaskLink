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
  id: number | string;
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
  const [shareLink, setShareLink] = useState("");

  const [sharedTask, setSharedTask] = useState<Task | null>(null);
  const [sharedLoading, setSharedLoading] = useState(false);

  /*
   * Detect:
   *
   * /share/1
   * /share/2
   * /share/15
   */
  const shareMatch =
    window.location.pathname.match(/^\/share\/(\d+)$/);

  const sharedTaskId = shareMatch
    ? Number(shareMatch[1])
    : null;

  /*
   * =========================
   * LOAD TASKS
   * =========================
   */

  useEffect(() => {
    if (sharedTaskId) {
      loadSharedTask(sharedTaskId);
    } else {
      loadTasks();
    }
  }, [sharedTaskId]);

  const loadTasks = async () => {
    try {
      const response = await fetch("/api/tasks");

      if (!response.ok) {
        throw new Error("Failed to load tasks");
      }

      const data = await response.json();

      setTasks(data);
    } catch (error) {
      console.error(error);

      setResult(
        "Unable to connect to backend."
      );
    }
  };

  /*
   * =========================
   * LOAD SHARED TASK
   * =========================
   */

  const loadSharedTask = async (id: number) => {
    try {
      setSharedLoading(true);

      const response = await fetch(
        `/api/tasks/${id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Workflow not found"
        );
      }

      setSharedTask(data);
    } catch (error) {
      console.error(error);
      setSharedTask(null);
    } finally {
      setSharedLoading(false);
    }
  };

  /*
   * =========================
   * START RECORDING
   * =========================
   */

  const startRecording = async () => {
    if (!startUrl.trim()) {
      setResult(
        "Please enter a website URL."
      );
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

      setResult(
        "Opening browser..."
      );

      const response = await fetch(
        "/api/record/start",
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
        throw new Error(
          data.error || "Failed to start recording"
        );
      }

      setStartUrl(cleanUrl);
      setIsRecording(true);

      setResult(
        "Recording started."
      );
    } catch (error) {
      console.error(error);

      setResult(
        "Failed to start recording."
      );
    }
  };

  /*
   * =========================
   * STOP RECORDING
   * =========================
   */

  const stopRecording = async () => {
    try {
      setResult(
        "Collecting recorded actions..."
      );

      const response = await fetch(
        "/api/record/stop",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to stop recording"
        );
      }

      setActions(
        data.actions || []
      );

      setIsRecording(false);

      setResult(
        `${data.actions?.length || 0} actions recorded.`
      );
    } catch (error) {
      console.error(error);

      setResult(
        "Failed to stop recording."
      );
    }
  };

  /*
   * =========================
   * CREATE TASK
   * =========================
   */

  const createTask = async () => {
    if (!taskName.trim()) {
      setResult(
        "Please enter a workflow name."
      );
      return;
    }

    if (!startUrl.trim()) {
      setResult(
        "Please enter a website URL."
      );
      return;
    }

    if (actions.length === 0) {
      setResult(
        "Record at least one action first."
      );
      return;
    }

    try {
      const response = await fetch(
        "/api/tasks",
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
        throw new Error(
          data.error ||
            "Failed to save workflow"
        );
      }

      setTasks((previous) => [
        data.task,
        ...previous,
      ]);

      setResult(
        `"${data.task.name}" saved successfully.`
      );

      setTaskName("");
      setStartUrl("");
      setActions([]);
    } catch (error) {
      console.error(error);

      setResult(
        "Failed to save workflow."
      );
    }
  };

  /*
   * =========================
   * REPLAY TASK
   * =========================
   */

  const replayTask = async (
    task: Task
  ) => {
    try {
      setReplaying(true);

      setResult(
        `Starting "${task.name}"...`
      );

      const response = await fetch(
        `/api/tasks/${task.id}/replay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Workflow execution failed"
        );
      }

      setResult(
        "Workflow execution started 🚀"
      );
    } catch (error) {
      console.error(error);

      setResult(
        "Workflow execution failed ❌"
      );
    } finally {
      setReplaying(false);
    }
  };

  /*
   * =========================
   * CREATE SHARE LINK
   * =========================
   */

  const shareTask = async (
    task: Task
  ) => {
    const link =
      `https://finalize-cyclist-unspoiled.ngrok-free.dev/share/${task.id}`;

    setShareLink(link);

    try {
      await navigator.clipboard.writeText(
        link
      );

      setResult(
        "Share link copied to clipboard 🔗"
      );
    } catch (error) {
      console.error(error);

      setResult(
        "Share link generated 🔗"
      );
    }
  };

  /*
   * =========================
   * COPY SHARE LINK
   * =========================
   */

  const copyShareLink = async () => {
    if (!shareLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        shareLink
      );

      setResult(
        "Share link copied 🔗"
      );
    } catch (error) {
      console.error(error);
    }
  };

  /*
   * =========================
   * SHARED WORKFLOW PAGE
   * =========================
   */

  if (sharedTaskId) {
    return (
      <div className="shared-page">
        <div className="shared-glow" />

        <div className="shared-card">
          <div className="shared-brand">
            <div className="logo-mark">
              T
            </div>

            <span>
              TaskLink
            </span>
          </div>

          {sharedLoading ? (
            <div className="shared-loading">
              <div className="loader" />

              <p>
                Loading workflow...
              </p>
            </div>
          ) : !sharedTask ? (
            <div className="shared-error">
              <div className="error-icon">
                !
              </div>

              <h1>
                Workflow not found
              </h1>

              <p>
                This workflow may have been
                deleted or the link is invalid.
              </p>

              <button
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Go to TaskLink
              </button>
            </div>
          ) : (
            <>
              <div className="shared-label">
                SHARED WORKFLOW
              </div>

              <h1 className="shared-title">
                {sharedTask.name}
              </h1>

              <p className="shared-description">
                This workflow was created
                using TaskLink and can be
                executed automatically.
              </p>

              <div className="shared-meta">
                <div>
                  <span>
                    WEBSITE
                  </span>

                  <strong>
                    {sharedTask.url}
                  </strong>
                </div>

                <div>
                  <span>
                    ACTIONS
                  </span>

                  <strong>
                    {sharedTask.actions.length}
                  </strong>
                </div>
              </div>

              <div className="shared-actions">
                {sharedTask.actions.map(
                  (
                    action,
                    index
                  ) => (
                    <div
                      className="shared-action"
                      key={index}
                    >
                      <div className="shared-action-number">
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <div>
                        <strong>
                          {action.type ===
                          "click"
                            ? "Click"
                            : "Input"}
                        </strong>

                        <span>
                          {action.target}
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>

              <button
                className="shared-run-button"
                onClick={() =>
                  replayTask(
                    sharedTask
                  )
                }
                disabled={replaying}
              >
                {replaying
                  ? "Running workflow..."
                  : "Run workflow"}

                <span>
                  →
                </span>
              </button>

              <button
                className="back-button"
                onClick={() => {
                  window.location.href =
                    "/";
                }}
              >
                ← Back to TaskLink
              </button>

              {result && (
                <div className="shared-result">
                  {result}
                </div>
              )}
            </>
          )}
        </div>

        <style>{`
          * {
            box-sizing: border-box;
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

          button {
            font: inherit;
          }

          .shared-page {
            min-height: 100vh;
            background:
              radial-gradient(
                circle at 50% 10%,
                #17132b 0%,
                #0a0a0b 35%,
                #080808 70%
              );
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 30px;
            position: relative;
            overflow: hidden;
          }

          .shared-glow {
            position: absolute;
            width: 500px;
            height: 500px;
            border-radius: 50%;
            background: rgba(139, 92, 246, .08);
            filter: blur(100px);
            top: -200px;
            left: 50%;
            transform: translateX(-50%);
          }

          .shared-card {
            position: relative;
            width: 100%;
            max-width: 650px;
            padding: 42px;
            border: 1px solid #292929;
            border-radius: 22px;
            background:
              linear-gradient(
                145deg,
                rgba(22,22,24,.96),
                rgba(11,11,12,.96)
              );
            box-shadow:
              0 40px 100px rgba(0,0,0,.55);
          }

          .shared-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 55px;
          }

          .logo-mark {
            width: 30px;
            height: 30px;
            border-radius: 8px;
            display: grid;
            place-items: center;
            background: #f1f1ee;
            color: #090909;
            font-weight: 800;
          }

          .shared-label {
            color: #9b82f6;
            font-size: 9px;
            letter-spacing: 2px;
            font-weight: 800;
            margin-bottom: 15px;
          }

          .shared-title {
            font-size: clamp(
              36px,
              7vw,
              58px
            );
            line-height: .95;
            letter-spacing: -3px;
            margin: 0;
            font-weight: 600;
          }

          .shared-description {
            color: #777;
            font-size: 13px;
            line-height: 1.7;
            max-width: 500px;
            margin: 22px 0 30px;
          }

          .shared-meta {
            display: grid;
            grid-template-columns: 1fr 120px;
            gap: 15px;
            margin-bottom: 22px;
          }

          .shared-meta > div {
            padding: 17px;
            border: 1px solid #272727;
            border-radius: 10px;
            background: #0d0d0e;
          }

          .shared-meta span {
            display: block;
            color: #555;
            font-size: 8px;
            letter-spacing: 1.5px;
            margin-bottom: 8px;
          }

          .shared-meta strong {
            display: block;
            font-size: 11px;
            color: #ccc;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }

          .shared-actions {
            border: 1px solid #272727;
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 22px;
          }

          .shared-action {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 14px 17px;
            border-bottom: 1px solid #202020;
          }

          .shared-action:last-child {
            border-bottom: 0;
          }

          .shared-action-number {
            color: #555;
            font-size: 9px;
            width: 22px;
          }

          .shared-action strong {
            display: block;
            color: #9b82f6;
            font-size: 9px;
            text-transform: uppercase;
            margin-bottom: 3px;
          }

          .shared-action span {
            color: #aaa;
            font-size: 10px;
          }

          .shared-run-button {
            width: 100%;
            padding: 15px 18px;
            border: 0;
            border-radius: 9px;
            background: #f1f1ee;
            color: #090909;
            font-weight: 700;
            font-size: 11px;
            cursor: pointer;
          }

          .shared-run-button:hover {
            background: white;
          }

          .shared-run-button span {
            float: right;
            font-size: 15px;
          }

          .shared-run-button:disabled {
            opacity: .6;
            cursor: wait;
          }

          .back-button {
            width: 100%;
            margin-top: 10px;
            padding: 12px;
            border: 1px solid #292929;
            border-radius: 9px;
            background: transparent;
            color: #777;
            font-size: 10px;
            cursor: pointer;
          }

          .back-button:hover {
            color: white;
          }

          .shared-result {
            margin-top: 15px;
            padding: 12px;
            border-radius: 8px;
            background: #121212;
            color: #888;
            font-size: 10px;
          }

          .shared-loading {
            min-height: 250px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #777;
          }

          .loader {
            width: 28px;
            height: 28px;
            border: 2px solid #292929;
            border-top-color: #9b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 15px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .shared-error {
            text-align: center;
            padding: 40px 10px;
          }

          .error-icon {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            margin: auto;
            border: 1px solid #49272d;
            color: #e45160;
          }

          .shared-error h1 {
            font-size: 25px;
            margin: 20px 0 10px;
          }

          .shared-error p {
            color: #666;
            font-size: 12px;
            margin-bottom: 25px;
          }

          .shared-error button {
            border: 0;
            background: #f1f1ee;
            color: #090909;
            border-radius: 8px;
            padding: 11px 17px;
            font-size: 10px;
            font-weight: 700;
            cursor: pointer;
          }

          @media (max-width: 650px) {
            .shared-page {
              padding: 15px;
            }

            .shared-card {
              padding: 28px 20px;
            }

            .shared-meta {
              grid-template-columns: 1fr;
            }

            .shared-brand {
              margin-bottom: 40px;
            }
          }
        `}</style>
      </div>
    );
  }

  /*
   * =========================
   * MAIN TASKLINK PAGE
   * =========================
   */

  return (
    <div className="app">

      {/* NAVBAR */}

      <nav className="navbar">
        <div className="logo">
          <div className="logo-mark">
            T
          </div>

          <span>
            TaskLink
          </span>
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
            <span className="pill-dot" />
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
            TaskLink turns browser actions
            into shareable workflows that
            can be executed automatically.
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
                <span />
                <span />
                <span />
              </div>

              <div className="address-bar">
                example.com
              </div>

            </div>

            <div className="browser-body">

              <div className="mock-sidebar">
                <div className="mock-logo" />
                <div />
                <div />
                <div />
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
                  <span className="live-dot" />
                  Recording
                </div>

                <div className="recording-action">
                  01&nbsp;&nbsp; Click
                  <span>
                    Sign in
                  </span>
                </div>

                <div className="recording-action">
                  02&nbsp;&nbsp; Input
                  <span>
                    Email
                  </span>
                </div>

              </div>

            </div>
          </div>
        </div>
      </section>

      {/* INTRO */}

      <section
        className="intro-strip"
        id="how-it-works"
      >
        <div>
          <span>01</span>

          <h3>
            Record
          </h3>

          <p>
            Perform your browser task once.
          </p>
        </div>

        <div>
          <span>02</span>

          <h3>
            Share
          </h3>

          <p>
            Turn the workflow into a
            reusable task.
          </p>
        </div>

        <div>
          <span>03</span>

          <h3>
            Run
          </h3>

          <p>
            Let TaskLink execute it
            automatically.
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
            then perform the actions you
            want to automate.
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
                  setTaskName(
                    e.target.value
                  )
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
                  setStartUrl(
                    e.target.value
                  )
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
                <span />
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
              <span />
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
              Every browser interaction is
              captured as a structured action
              that TaskLink can replay.
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
                  (
                    action,
                    index
                  ) => (
                    <div
                      className="action-row"
                      key={index}
                    >

                      <div className="action-index">
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          "0"
                        )}
                      </div>

                      <div className="action-kind">
                        {action.type ===
                        "click"
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

            {tasks.map(
              (task) => (
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

                  <div className="workflow-buttons">

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

                      <span>
                        ↗
                      </span>
                    </button>

                    <button
                      className="share-button"
                      onClick={() =>
                        shareTask(task)
                      }
                      disabled={
                        isRecording
                      }
                    >
                      🔗 Share
                    </button>

                  </div>

                </div>
              )
            )}

          </div>
        )}

        {/* SHARE LINK */}

        {shareLink && (
          <div className="share-panel">

            <div className="share-panel-top">

              <div>
                <div className="share-label">
                  WORKFLOW SHARE LINK
                </div>

                <p>
                  Send this link to anyone who
                  needs to run this workflow.
                </p>
              </div>

              <button
                className="close-share"
                onClick={() =>
                  setShareLink("")
                }
              >
                ×
              </button>

            </div>

            <div className="share-link-row">

              <input
                value={shareLink}
                readOnly
              />

              <button
                onClick={copyShareLink}
              >
                Copy
              </button>

            </div>

            <div className="share-success">
              <span>
                ●
              </span>

              Link ready to share
            </div>

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
            TaskLink is designed to evolve
            beyond fixed browser replay.
            Gemini and LangGraph allow the
            agent to understand changing
            webpages, recover from failures
            and verify its actions.
          </p>

        </div>

        <div className="ai-flow">

          <div>
            <span>01</span>
            Observe
          </div>

          <div className="flow-line" />

          <div>
            <span>02</span>
            Think
          </div>

          <div className="flow-line" />

          <div>
            <span>03</span>
            Act
          </div>

          <div className="flow-line" />

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

          <span>
            TaskLink
          </span>

        </div>

        <p>
          Record once. Automate everything.
        </p>

      </footer>

      {/* STYLES */}

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
          width:
            min(
              1200px,
              calc(100% - 48px)
            );

          margin: auto;
          height: 78px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border-bottom:
            1px solid #1c1c1c;
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
          width:
            min(
              1200px,
              calc(100% - 48px)
            );

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

          box-shadow:
            0 0 10px #9d84ff;
        }

        .hero h1 {
          font-size:
            clamp(
              54px,
              8vw,
              105px
            );

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

          margin:
            31px auto 0;

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
            0 35px 100px
            rgba(0,0,0,.55);

          transform:
            rotateX(2deg);
        }

        .browser-top {
          height: 42px;

          border-bottom:
            1px solid #252525;

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

          border-right:
            1px solid #242424;

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

          background:
            rgba(15,15,18,.94);

          box-shadow:
            0 20px 50px
            rgba(0,0,0,.35);
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

          box-shadow:
            0 0 10px #ff6475;
        }

        .recording-action {
          border-top:
            1px solid #242424;

          padding: 9px 0;

          color: #676767;

          font-size: 8px;
        }

        .recording-action span {
          float: right;
          color: #c0c0c0;
        }

        /* INTRO */

        .intro-strip {
          width:
            min(
              1200px,
              calc(100% - 48px)
            );

          margin: auto;

          border-top:
            1px solid #222;

          border-bottom:
            1px solid #222;

          display: grid;

          grid-template-columns:
            repeat(3, 1fr);

          padding: 45px 0;
        }

        .intro-strip > div {
          padding: 0 35px;

          border-right:
            1px solid #222;
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

          margin:
            12px 0 6px;

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
          width:
            min(
              1200px,
              calc(100% - 48px)
            );

          margin: auto;

          padding: 125px 0;

          border-bottom:
            1px solid #202020;
        }

        .section-heading {
          max-width: 650px;

          margin:
            22px 0 40px;
        }

        .section-heading h2,
        .actions-layout h2,
        .workflows-header h2,
        .ai-copy h2 {
          font-size:
            clamp(
              38px,
              5vw,
              66px
            );

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

        /* CREATE */

        .create-card {
          border:
            1px solid #292929;

          border-radius: 14px;

          padding: 30px;

          background: #0d0d0d;
        }

        .form-row {
          display: grid;

          grid-template-columns:
            1fr 1fr;

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

          border:
            1px solid #292929;

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

          border:
            1px solid #252525;

          border-radius: 9px;

          padding: 17px;

          display: flex;

          justify-content:
            space-between;

          align-items: center;

          gap: 20px;
        }

        .record-bar strong {
          font-size: 11px;
        }

        .record-bar p {
          color: #626262;

          font-size: 9px;

          margin:
            5px 0 0;
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

          grid-template-columns:
            .8fr 1.2fr;

          gap: 80px;

          margin-top: 35px;
        }

        .actions-panel {
          border:
            1px solid #292929;

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

          border:
            1px solid #292929;

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

          border-bottom:
            1px solid #202020;
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
          width:
            calc(100% - 30px);

          margin: 15px;

          padding: 12px;

          border: 0;

          border-radius: 7px;

          background: #eeeeeb;

          color: #090909;

          font-size: 10px;

          font-weight: 600;

          display: flex;

          justify-content:
            space-between;
        }

        /* WORKFLOWS */

        .workflows-header {
          display: flex;

          justify-content:
            space-between;

          align-items: flex-end;

          margin:
            25px 0 30px;
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

          border-top:
            1px solid #222;
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

          border:
            1px solid #2b2b2b;

          border-radius: 9px;

          display: grid;
          place-items: center;

          color: #8b7ae4;

          flex-shrink: 0;
        }

        .workflow-left h3 {
          margin: 0;

          font-size: 12px;

          font-weight: 500;
        }

        .workflow-left p {
          color: #555;

          margin:
            5px 0 0;

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

        .workflow-buttons {
          display: flex;

          gap: 7px;

          flex-shrink: 0;
        }

        .run-button,
        .share-button {
          border:
            1px solid #333;

          background: transparent;

          color: #ddd;

          padding:
            9px 13px;

          border-radius: 6px;

          font-size: 9px;

          transition: .2s;
        }

        .run-button:hover,
        .share-button:hover {
          border-color: #666;
          background: #151515;
        }

        .share-button {
          color: #b09aff;
          border-color: #493c6c;
        }

        .run-button span {
          margin-left: 10px;
        }

        .empty-workflows {
          border-top:
            1px solid #222;

          padding: 40px 0;

          color: #555;

          font-size: 10px;
        }

        /* SHARE PANEL */

        .share-panel {
          margin-top: 30px;

          padding: 24px;

          border:
            1px solid
            rgba(139,92,246,.35);

          border-radius: 14px;

          background:
            linear-gradient(
              135deg,
              rgba(139,92,246,.10),
              rgba(255,255,255,.02)
            );

          box-shadow:
            0 20px 70px
            rgba(0,0,0,.25);
        }

        .share-panel-top {
          display: flex;

          justify-content:
            space-between;

          gap: 20px;

          margin-bottom: 18px;
        }

        .share-label {
          color: #a78bfa;

          font-size: 9px;

          letter-spacing: 1.7px;

          font-weight: 800;
        }

        .share-panel-top p {
          color: #666;

          font-size: 10px;

          margin:
            7px 0 0;
        }

        .close-share {
          width: 28px;
          height: 28px;

          border:
            1px solid #333;

          border-radius: 50%;

          background: transparent;

          color: #777;

          cursor: pointer;
        }

        .share-link-row {
          display: flex;

          gap: 9px;
        }

        .share-link-row input {
          flex: 1;

          min-width: 0;

          padding:
            12px 14px;

          border:
            1px solid #292929;

          border-radius: 8px;

          background: #090909;

          color: #c4b5fd;

          outline: none;

          font-size: 10px;
        }

        .share-link-row button {
          padding:
            12px 17px;

          border: 0;

          border-radius: 8px;

          background: #f1f1ee;

          color: #090909;

          font-size: 10px;

          font-weight: 700;

          cursor: pointer;
        }

        .share-success {
          margin-top: 10px;

          color: #5fc993;

          font-size: 9px;
        }

        .share-success span {
          margin-right: 6px;
        }

        /* AI */

        .ai-section {
          display: grid;

          grid-template-columns:
            1fr 1fr;

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
          border:
            1px solid #292929;

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

          justify-content:
            space-between;

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
          width:
            min(
              1200px,
              calc(100% - 48px)
            );

          margin: auto;

          padding: 35px 0;

          display: flex;

          justify-content:
            space-between;

          color: #555;

          font-size: 9px;
        }

        /* RESPONSIVE */

        @media (max-width: 800px) {

          .nav-links {
            display: none;
          }

          .navbar {
            width:
              calc(100% - 30px);
          }

          .hero,
          .intro-strip,
          .create-section,
          .actions-section,
          .workflows-section,
          .ai-section {
            width:
              calc(100% - 30px);
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

          .workflow-card {
            align-items: flex-start;
          }

          .workflow-buttons {
            flex-direction: column;
          }

          .record-bar {
            flex-direction: column;
            align-items: flex-start;
          }

          .share-link-row {
            flex-direction: column;
          }

          .footer {
            width:
              calc(100% - 30px);
          }
        }

      `}</style>
    </div>
  );
}

export default App;