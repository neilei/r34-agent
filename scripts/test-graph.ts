import { runVeniceGraph } from "../agents/rule34/rule34-text-graph";

async function testGraph() {
  console.log("Starting graph test...");

  try {
    // const result = await runVeniceGraph(
    //   "The quick brown fox jumps over the lazy dog",
    //   ["acrobatics","zoophilia"],
    //   "123e4567-e89b-12d3-a456-426614174000"
    // );
    const result = await runVeniceGraph(
      `And oh, it's…burning, oh, four or five hundred feet into the sky. It's a terrific crash, ladies 
 and gentlemen. The smoke and the flames now and the frame is crashing to the ground, not quite to the mooring mast. 
 Oh, the humanity and all the passengers screaming around here. I told you. It's -- I can't even talk to people whose 
 friends were on there. It -- It's....I -- I can't talk ladies and gentlemen.`,
      ["anal", "bondage"],
      "123e4567-e89b-12d3-a456-426614174000"
    );

    console.log("Graph execution completed!");
    console.log("Final analysis:", result.finalAnalysis);
  } catch (error) {
    console.error("Error testing graph:", error);
  }
}

testGraph().catch(console.error);
