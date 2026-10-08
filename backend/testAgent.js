const { decideAction } = require("./agent/gemini");

async function test() {
  try {
    const goal = "Click Create Employee";

    const pageElements = [
      "Dashboard",
      "Add New Employee",
      "Settings",
      "Logout"
    ];

    const decision = await decideAction(goal, pageElements);

    console.log("🧠 Gemini Agent Decision:");
    console.log(decision);

  } catch (error) {
    console.error("❌ Agent error:", error.message);
  }
}

test();