const { chromium } = require("playwright");


/* =========================================================
   GENERIC SELECTOR CHECK
========================================================= */

function isGenericSelector(selector) {
  if (!selector) {
    return true;
  }

  const value = selector.trim().toLowerCase();

  return [
    "a",
    "button",
    "input",
    "textarea",
    "select"
  ].includes(value);
}


/* =========================================================
   FIND INPUT / TEXTBOX
========================================================= */

async function findInput(page, action) {

  const selector = action.selector || "";
  const target = (action.target || "").trim();

  console.log("🔎 Finding input...");
  console.log("   selector:", selector);
  console.log("   target:", target);


  /*
   * -------------------------------------------------------
   * 1. Try exact selector if it is specific
   * -------------------------------------------------------
   */

  if (
    selector &&
    !isGenericSelector(selector)
  ) {

    const locator = page.locator(selector);

    if (await locator.count() > 0) {
      console.log("✅ Found using selector");

      return locator.first();
    }
  }


  /*
   * -------------------------------------------------------
   * 2. Try accessibility name
   *
   * Example:
   * Search Wikipedia
   * -------------------------------------------------------
   */

  if (target) {

    const textbox = page.getByRole(
      "textbox",
      {
        name: target,
        exact: true
      }
    );

    if (await textbox.count() > 0) {

      console.log(
        "✅ Found using accessibility name"
      );

      return textbox.first();
    }
  }


  /*
   * -------------------------------------------------------
   * 3. Try placeholder
   * -------------------------------------------------------
   */

  if (target) {

    const placeholder =
      page.getByPlaceholder(
        target,
        {
          exact: true
        }
      );

    if (await placeholder.count() > 0) {

      console.log(
        "✅ Found using placeholder"
      );

      return placeholder.first();
    }
  }


  /*
   * -------------------------------------------------------
   * 4. Try aria-label
   * -------------------------------------------------------
   */

  if (target) {

    const aria =
      page.locator(
        `[aria-label="${target}"]`
      );

    if (await aria.count() > 0) {

      console.log(
        "✅ Found using aria-label"
      );

      return aria.first();
    }
  }


  /*
   * -------------------------------------------------------
   * 5. Generic visible input
   *
   * This is important for Wikipedia.
   * -------------------------------------------------------
   */

  const visibleInput =
    page.locator(
      'input:visible'
    );

  const inputCount =
    await visibleInput.count();

  console.log(
    `🔎 Visible inputs: ${inputCount}`
  );


  if (inputCount > 0) {

    /*
     * Prefer text/search inputs.
     */

    for (
      let i = 0;
      i < inputCount;
      i++
    ) {

      const input =
        visibleInput.nth(i);

      const type =
        await input.getAttribute("type");

      const placeholder =
        await input.getAttribute(
          "placeholder"
        );

      const ariaLabel =
        await input.getAttribute(
          "aria-label"
        );

      console.log(
        `   input ${i}: type=${type}, placeholder=${placeholder}, aria=${ariaLabel}`
      );


      if (
        type === "text" ||
        type === "search" ||
        type === null
      ) {

        return input;

      }
    }


    return visibleInput.first();
  }


  throw new Error(
    `Could not find input: ${target}`
  );
}


/* =========================================================
   FIND CLICK TARGET
========================================================= */

async function findClickTarget(page, action) {

  const selector = action.selector || "";
  const target = (action.target || "").trim();

  console.log("🔎 Finding click target...");
  console.log("   selector:", selector);
  console.log("   target:", target);


  /*
   * -------------------------------------------------------
   * 1. Specific selector
   * -------------------------------------------------------
   */

  if (
    selector &&
    !isGenericSelector(selector)
  ) {

    const locator =
      page.locator(selector);

    if (
      await locator.count() > 0
    ) {

      console.log(
        "✅ Found using specific selector"
      );

      return locator.first();
    }
  }


  /*
   * -------------------------------------------------------
   * 2. CLICK ON INPUT
   * -------------------------------------------------------
   */

  if (
    selector === "input" ||
    selector === "textarea"
  ) {

    return await findInput(
      page,
      action
    );
  }


  /*
   * -------------------------------------------------------
   * 3. BUTTON BY ROLE
   * -------------------------------------------------------
   */

  if (
    selector === "button" &&
    target
  ) {

    const button =
      page.getByRole(
        "button",
        {
          name: target,
          exact: true
        }
      );

    if (
      await button.count() > 0
    ) {

      console.log(
        "✅ Found button by role"
      );

      return button.first();
    }
  }


  /*
   * -------------------------------------------------------
   * 4. LINK BY ROLE
   * -------------------------------------------------------
   */

  if (
    selector === "a" &&
    target
  ) {

    const link =
      page.getByRole(
        "link",
        {
          name: target,
          exact: true
        }
      );

    if (
      await link.count() > 0
    ) {

      console.log(
        "✅ Found link by role"
      );

      return link.first();
    }
  }


  /*
   * -------------------------------------------------------
   * 5. BUTTON TEXT
   * -------------------------------------------------------
   */

  if (target) {

    const button =
      page.getByText(
        target,
        {
          exact: true
        }
      );

    if (
      await button.count() > 0
    ) {

      console.log(
        "✅ Found using text"
      );

      return button.first();
    }
  }


  /*
   * -------------------------------------------------------
   * 6. Generic selector fallback
   *
   * IMPORTANT:
   * Use FIRST instead of strict-mode failure.
   * -------------------------------------------------------
   */

  if (selector) {

    const locator =
      page.locator(selector);

    const count =
      await locator.count();

    console.log(
      `🔎 Selector matched ${count} elements`
    );


    if (count > 0) {

      console.log(
        "⚠️ Using first matching element"
      );

      return locator.first();
    }
  }


  throw new Error(
    `Could not find click target: ${target}`
  );
}


/* =========================================================
   NORMALIZE ACTIONS
========================================================= */

function normalizeActions(actions) {

  const result = [];

  for (
    const action of actions || []
  ) {

    /*
     * Combine consecutive input actions
     * for the same element.
     */

    if (
      action.type === "input" &&
      result.length > 0
    ) {

      const previous =
        result[result.length - 1];


      if (
        previous.type === "input" &&
        previous.selector ===
          action.selector
      ) {

        previous.value =
          action.value;

        previous.target =
          action.target;

        continue;
      }
    }


    result.push({
      ...action
    });
  }


  return result;
}


/* =========================================================
   MAIN TASK RUNNER
========================================================= */

async function runTask(task) {

  let browser = null;

  try {

    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "🚀 TASKLINK REPLAY STARTED"
    );
    console.log(
      "========================================"
    );


    console.log(
      "📋 Task:",
      task.name
    );

    console.log(
      "🌐 URL:",
      task.url
    );


    /*
     * -------------------------------------------------------
     * NORMALIZE ACTIONS
     * -------------------------------------------------------
     */

    const originalActions =
      task.actions || [];

    const actions =
      normalizeActions(
        originalActions
      );


    console.log(
      `📦 Original actions: ${originalActions.length}`
    );

    console.log(
      `📦 Replay actions: ${actions.length}`
    );


    /*
     * -------------------------------------------------------
     * LAUNCH BROWSER
     * -------------------------------------------------------
     */

    browser =
      await chromium.launch({
        headless: false
      });


    const page =
      await browser.newPage();


    /*
     * -------------------------------------------------------
     * OPEN WEBSITE
     * -------------------------------------------------------
     */

    console.log("");
    console.log(
      "🌐 Opening website..."
    );


    await page.goto(
      task.url,
      {
        waitUntil:
          "domcontentloaded",

        timeout:
          30000
      }
    );


    console.log(
      "✅ Website opened"
    );


    /*
     * -------------------------------------------------------
     * EXECUTE EACH ACTION
     * -------------------------------------------------------
     */

    for (
      let i = 0;
      i < actions.length;
      i++
    ) {

      const action =
        actions[i];


      console.log("");
      console.log(
        "----------------------------------------"
      );

      console.log(
        `▶️ STEP ${i + 1}/${actions.length}`
      );

      console.log(
        "TYPE:",
        action.type
      );

      console.log(
        "SELECTOR:",
        action.selector
      );

      console.log(
        "TARGET:",
        action.target
      );


      /*
       * =====================================================
       * CLICK
       * =====================================================
       */

      if (
        action.type === "click"
      ) {

        const locator =
          await findClickTarget(
            page,
            action
          );


        console.log(
          "🖱️ Clicking..."
        );


        await locator.waitFor({
          state: "visible",
          timeout: 15000
        });


        await locator.scrollIntoViewIfNeeded();


        await locator.click({
          timeout: 15000
        });


        console.log(
          `✅ CLICK SUCCESS: ${action.target}`
        );
      }


      /*
       * =====================================================
       * INPUT
       * =====================================================
       */

      else if (
        action.type === "input"
      ) {

        const locator =
          await findInput(
            page,
            action
          );


        console.log(
          `⌨️ Filling value: "${action.value}"`
        );


        await locator.waitFor({
          state: "visible",
          timeout: 15000
        });


        await locator.scrollIntoViewIfNeeded();


        /*
         * Click first so the input receives focus.
         */

        await locator.click({
          timeout: 15000
        });


        /*
         * Fill complete recorded value.
         */

        await locator.fill(
          action.value || "",
          {
            timeout: 15000
          }
        );


        console.log(
          `✅ INPUT SUCCESS: ${action.value}`
        );
      }


      /*
       * =====================================================
       * UNKNOWN ACTION
       * =====================================================
       */

      else {

        console.log(
          `⚠️ Unknown action type: ${action.type}`
        );
      }


      /*
       * Small pause between actions.
       */

      await page.waitForTimeout(
        800
      );
    }


    /*
     * -------------------------------------------------------
     * SUCCESS
     * -------------------------------------------------------
     */

    console.log("");
    console.log(
      "========================================"
    );

    console.log(
      "🎉 TASK COMPLETED SUCCESSFULLY"
    );

    console.log(
      "========================================"
    );


    console.log(
      `✅ Executed ${actions.length} actions`
    );


    return {

      success: true,

      actionsExecuted:
        actions.length

    };

  }


  /*
   * =======================================================
   * PLAYWRIGHT FAILED
   * =======================================================
   */

  catch (error) {

    console.error("");
    console.error(
      "========================================"
    );

    console.error(
      "❌ PLAYWRIGHT REPLAY FAILED"
    );

    console.error(
      "========================================"
    );


    console.error(
      error.message
    );


    /*
     * -------------------------------------------------------
     * AGENTIC RECOVERY
     *
     * Gemini is ONLY called after Playwright fails.
     * -------------------------------------------------------
     */

    try {

      console.log("");
      console.log(
        "🤖 Activating agentic recovery..."
      );


      const {
        agentGraph
      } =
        require("./agentGraph");


      const result =
        await agentGraph.invoke({

          task:
            task,

          currentStep:
            "recovery",

          status:
            `Playwright failed: ${error.message}`

        });


      console.log(
        "🤖 Agent recovery result:"
      );

      console.log(
        result
      );


      return {

        success:
          false,

        recovered:
          true,

        error:
          error.message,

        agentResult:
          result

      };

    }


    catch (agentError) {

      console.error("");
      console.error(
        "❌ AGENT RECOVERY FAILED"
      );

      console.error(
        agentError.message
      );


      return {

        success:
          false,

        recovered:
          false,

        error:
          error.message,

        agentError:
          agentError.message

      };
    }
  }
}


/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  runTask
};