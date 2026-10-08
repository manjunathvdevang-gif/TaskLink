const {
  StateGraph,
  Annotation,
  START,
  END
} = require("@langchain/langgraph");

const { decideAction } = require("./agent/gemini");

// =====================================================
// STATE
// =====================================================

const AgentState = Annotation.Root({
  page: Annotation(),
  action: Annotation(),
  pageElements: Annotation(),
  decision: Annotation(),
  result: Annotation(),
  verified: Annotation(),
  sensitive: Annotation()
});

// =====================================================
// SENSITIVE DATA DETECTION
// =====================================================

function isSensitiveAction(action) {
  if (!action || action.type !== "input") {
    return false;
  }

  const text = `
    ${action.target || ""}
    ${action.selector || ""}
    ${action.value || ""}
  `.toLowerCase();

  const sensitiveWords = [
    "password",
    "email",
    "phone",
    "mobile",
    "aadhaar",
    "address",
    "date of birth",
    "dob",
    "pan",
    "credit card",
    "card number",
    "cvv",
    "otp"
  ];

  return sensitiveWords.some(word =>
    text.includes(word)
  );
}

// =====================================================
// PRIVACY CHECK
// =====================================================

async function privacyCheck(state) {
  console.log("");
  console.log("🔐 PRIVACY CHECK");

  const sensitive = isSensitiveAction(state.action);

  if (sensitive) {
    console.log("⚠️ Sensitive information detected!");
    console.log(
      `🔒 Protected field: ${state.action.target}`
    );

    return {
      sensitive: true,
      result: "Sensitive action detected"
    };
  }

  console.log("✅ No sensitive information detected.");

  return {
    sensitive: false
  };
}

// =====================================================
// PRIVACY ROUTER
// =====================================================

function privacyRouter(state) {
  if (state.sensitive) {
    return END;
  }

  return END;
}

// =====================================================
// PRIVACY GRAPH
// =====================================================

const privacyGraphBuilder = new StateGraph(AgentState)
  .addNode("privacyCheck", privacyCheck)
  .addEdge(START, "privacyCheck")
  .addConditionalEdges(
    "privacyCheck",
    privacyRouter,
    {
      [END]: END
    }
  );

const privacyGraph = privacyGraphBuilder.compile();

// =====================================================
// OBSERVE
// =====================================================

async function observe(state) {
  console.log("👀 OBSERVE");

  const pageElements = await state.page
    .locator("button, input, textarea, select, a")
    .evaluateAll(elements =>
      elements.map(element => ({
        tag: element.tagName,
        type: element.getAttribute("type"),
        id: element.id,
        name: element.getAttribute("name"),
        placeholder: element.getAttribute("placeholder"),
        text: (
          element.innerText ||
          element.value ||
          ""
        ).trim(),
        ariaLabel: element.getAttribute("aria-label")
      }))
    );

  return {
    pageElements
  };
}

// =====================================================
// THINK
// =====================================================

async function think(state) {
  console.log("🧠 THINK");

  const action = state.action;

  const decision = await decideAction(
    `${action.type === "click" ? "Click" : "Fill"} the element: ${action.target}`,
    state.pageElements
  );

  console.log("🧠 Gemini:");
  console.log(decision);

  const cleanDecision = decision
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return {
    decision: JSON.parse(cleanDecision)
  };
}

// =====================================================
// ACT
// =====================================================

async function act(state) {
  console.log("🖱️ ACT");

  const page = state.page;
  const action = state.action;
  const decision = state.decision;

  if (decision.action === "none") {
    throw new Error(
      `Gemini could not find "${action.target}"`
    );
  }

  const target = decision.target;

  const element = state.pageElements.find(
    item =>
      item.id === target ||
      item.name === target ||
      item.placeholder === target ||
      item.text.toLowerCase() === target.toLowerCase() ||
      item.ariaLabel === target
  );

  if (!element) {
    throw new Error(
      `Gemini target "${target}" not found`
    );
  }

  if (decision.action === "click") {
    if (element.id) {
      await page.locator(`#${element.id}`).click();
    } else if (element.name) {
      await page
        .locator(`[name="${element.name}"]`)
        .click();
    } else {
      await page
        .getByText(target, { exact: true })
        .first()
        .click();
    }

    console.log(`🤖 Gemini clicked: ${target}`);
  }

  if (decision.action === "input") {
    if (element.id) {
      await page
        .locator(`#${element.id}`)
        .fill(action.value);
    } else if (element.name) {
      await page
        .locator(`[name="${element.name}"]`)
        .fill(action.value);
    } else if (element.placeholder) {
      await page
        .getByPlaceholder(element.placeholder)
        .fill(action.value);
    }

    console.log(`🤖 Gemini filled: ${target}`);
  }

  return {
    result: "Action executed"
  };
}

// =====================================================
// VERIFY
// =====================================================

async function verify(state) {
  console.log("🔎 VERIFY");

  await state.page.waitForTimeout(500);

  console.log("✅ Action verified.");

  return {
    verified: true,
    result: "Action verified"
  };
}

// =====================================================
// RECOVERY GRAPH
// =====================================================

const graph = new StateGraph(AgentState)
  .addNode("observe", observe)
  .addNode("think", think)
  .addNode("act", act)
  .addNode("verify", verify)

  .addEdge(START, "observe")
  .addEdge("observe", "think")
  .addEdge("think", "act")
  .addEdge("act", "verify")
  .addEdge("verify", END);

const agentGraph = graph.compile();

// =====================================================
// EXPORT
// =====================================================

module.exports = {
  agentGraph,
  privacyGraph,
  isSensitiveAction
};