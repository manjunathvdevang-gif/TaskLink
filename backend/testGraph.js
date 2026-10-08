const { agentGraph } = require("./agentGraph");

async function test() {
  const result = await agentGraph.invoke({
    task: "Click Submit",
    currentStep: "",
    status: "Starting",
  });

  console.log("\n🎯 FINAL STATE:");
  console.log(result);
}

test();