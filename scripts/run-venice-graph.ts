import dotenv from "dotenv";
import { runVeniceGraph } from "../agents/rule34/rule34-text-graph";

// Load environment variables
dotenv.config();

// Helper function to format scores
function formatScores(score: number): string {
  const stars = "★".repeat(Math.round(score / 2));
  const emptyStars = "☆".repeat(5 - Math.round(score / 2));
  return `${score}/10 ${stars}${emptyStars}`;
}

async function main() {
  // Check if Venice API key is set
  if (!process.env.VENICE_API_KEY) {
    console.error("Error: VENICE_API_KEY environment variable is not set");
    console.error("Please create a .env file with your Venice API key");
    process.exit(1);
  }

  // Hardcoded values - modify these to change the behavior
  const originalText =
    "Test your prompts, agents, and RAGs. Red teaming, pentesting, and vulnerability scanning for LLMs. Compare performance of GPT, Claude, Gemini, Llama, and more. Simple declarative configs with command line and CI/CD integration.";
  const kinks = ["gore", "anal", "ageplay"];
  const sessionId = "123e4567-e89b-12d3-a456-426614174000"; // Example UUID

  try {
    console.log("Running Venice Graph with Recursive Grading...");
    console.log(`Original Text: ${originalText}`);
    console.log(`Kinks: ${kinks.join(", ")}`);
    console.log(
      "\n🔄 Processing... This may take a few minutes as it runs up to 3 iterations.\n"
    );

    // Run the graph with the specified parameters
    const result = await runVeniceGraph(originalText, kinks, sessionId);

    // Display the results
    console.log("\n==================================================");
    console.log("🎭 FINAL RESULTS AFTER RECURSIVE GRADING");
    console.log("==================================================");

    console.log(`\n📝 ORIGINAL TEXT:`);
    console.log(`${result.originalText}`);

    console.log(`\n🔥 FINAL TRANSFORMED TEXT:`);
    console.log(`${result.veniceResponse}`);

    console.log("\n📊 SCORES:");
    console.log(`Iterations Completed: ${result.iteration - 1}`);
    console.log(`Horniness Score: ${formatScores(result.horniness)}`);
    console.log(`Kink Inclusion Score: ${formatScores(result.kinkInclusion)}`);
    console.log(
      `Content Preservation: ${formatScores(result.contentPreservationScore)}`
    );
    console.log(
      `Structure Preservation: ${formatScores(
        result.structurePreservationScore
      )}`
    );

    console.log("\n🔍 ANALYSIS:");
    console.log(result.finalAnalysis);
  } catch (error) {
    console.error("Error running Venice Graph:", error);
  }
}

// Run the main function
main().catch(console.error);
