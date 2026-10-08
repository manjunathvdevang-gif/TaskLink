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
      setResult("Backend connection failed ❌");
    }
  };

  // =========================
  // START REAL RECORDING
  // =========================

  const startRecording = async () => {
    if (!startUrl.trim()) {
      setResult("Enter a website URL first ❌");
      return;
    }

    let cleanUrl = startUrl.trim();

    // Add https:// automatically
    if (
      !cleanUrl.startsWith("http://") &&
      !cleanUrl.startsWith("https://")
    ) {
      cleanUrl = `https://${cleanUrl}`;
    }

    // Validate URL
    try {
      const parsedUrl = new URL(cleanUrl);

      if (
        parsedUrl.protocol !== "http:" &&
        parsedUrl.protocol !== "https:"
      ) {
        throw new Error("Invalid protocol");
      }
    } catch {
      setResult(
        "Enter a valid website URL ❌ Example: https://example.com"
      );
      return;
    }

    try {
      setActions([]);
      setResult(
        "Starting browser recorder... 🚀"
      );

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

      setResult(
        `Recording started on ${cleanUrl} 🎬`
      );

    } catch (error) {
      console.error(error);

      setResult(
        "Failed to start recording ❌"
      );
    }
  };

  // =========================
  // STOP REAL RECORDING
  // =========================

  const stopRecording = async () => {
    try {
      setResult(
        "Stopping recorder and collecting actions... ⏳"
      );

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
        `Recording stopped 🎬 ${data.actions?.length || 0} actions captured`
      );

    } catch (error) {
      console.error(error);

      setResult(
        "Failed to stop recording ❌"
      );
    }
  };

  // =========================
  // CREATE TASK
  // =========================

  const createTask = async () => {
    if (!taskName.trim()) {
      setResult(
        "Enter a task name first ❌"
      );
      return;
    }

    if (!startUrl.trim()) {
      setResult(
        "Enter a website URL first ❌"
      );
      return;
    }

    if (actions.length === 0) {
      setResult(
        "Record at least one action first ❌"
      );
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
        `Task "${data.task.name}" created successfully ✅`
      );

      setTaskName("");
      setStartUrl("");
      setActions([]);

    } catch (error) {
      console.error(error);

      setResult(
        "Failed to create task ❌"
      );
    }
  };

  // =========================
  // REPLAY TASK
  // =========================

  const replayTask = async (task: Task) => {
    try {
      setReplaying(true);

      setResult(
        `Starting "${task.name}"... 🚀`
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

      setResult(
        `Playwright replay started 🚀`
      );

    } catch (error) {
      console.error(error);

      setResult(
        "Playwright replay failed ❌"
      );

    } finally {
      setReplaying(false);
    }
  };

  // =========================
  // UI
  // =========================

  return (
    <div
      style={{
        padding: "30px",
        fontFamily: "Arial",
      }}
    >
      <h1>
        TaskLink 🚀
      </h1>

      <p>
        Record a browser workflow and replay it automatically.
      </p>

      {/* =========================
          TASK NAME
      ========================= */}

      <input
        type="text"
        placeholder="Enter task name"
        value={taskName}
        onChange={(e) =>
          setTaskName(e.target.value)
        }
        disabled={isRecording}
      />

      <br />
      <br />

      {/* =========================
          WEBSITE URL
      ========================= */}

      <input
        type="text"
        placeholder="Enter website URL"
        value={startUrl}
        onChange={(e) =>
          setStartUrl(e.target.value)
        }
        disabled={isRecording}
        style={{
          width: "300px",
        }}
      />

      <br />
      <br />

      {/* =========================
          RECORDING BUTTON
      ========================= */}

      {!isRecording ? (
        <button
          onClick={startRecording}
          disabled={replaying}
        >
          🔴 Start Recording
        </button>
      ) : (
        <button
          onClick={stopRecording}
        >
          ⏹ Stop Recording
        </button>
      )}

      <p>
        {isRecording
          ? "🔴 Recording external browser"
          : "⚪ Recorder stopped"}
      </p>

      {/* =========================
          STATUS
      ========================= */}

      <p>
        {result}
      </p>

      <hr />

      {/* =========================
          RECORDED ACTIONS
      ========================= */}

      <h2>
        Recorded Actions: {actions.length}
      </h2>

      {actions.length === 0 ? (
        <p>
          No actions recorded yet.
        </p>
      ) : (
        <ol>
          {actions.map(
            (action, index) => (
              <li key={index}>
                <strong>
                  {action.type === "click"
                    ? "🖱️ Click"
                    : "⌨️ Input"}{" "}
                  #{index + 1}
                </strong>

                <br />

                Target:{" "}
                {action.target}

                <br />

                Selector:{" "}
                <code>
                  {action.selector}
                </code>

                {action.type ===
                  "input" && (
                  <>
                    <br />

                    Value:{" "}
                    "{action.value}"
                  </>
                )}
              </li>
            )
          )}
        </ol>
      )}

      {/* =========================
          CREATE TASK
      ========================= */}

      <button
        onClick={createTask}
        disabled={
          isRecording ||
          replaying ||
          actions.length === 0
        }
      >
        💾 Create Task
      </button>

      <hr />

      {/* =========================
          MY TASKS
      ========================= */}

      <h2>
        My Tasks
      </h2>

      {tasks.length === 0 ? (
        <p>
          No tasks yet.
        </p>
      ) : (
        <ul>
          {tasks.map(
            (task) => (
              <li key={task.id}>
                <strong>
                  {task.name}
                </strong>

                <br />

                Website:{" "}
                {task.url}

                <br />

                Actions:{" "}
                {task.actions.length}

                <br />

                <button
                  onClick={() =>
                    replayTask(task)
                  }
                  disabled={
                    replaying ||
                    isRecording
                  }
                >
                  ▶️ Replay Task
                </button>

                <hr />
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

export default App;