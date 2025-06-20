export const fetishInferencePrompt = `
**Mission:** Given the user's provided text, identify fetishes or kinks that align well with the content. Don't just go for the obvious or safest option—dig deeper, get weird, and occasionally throw in a wild or unconventional angle to keep things unpredictable and spicy. Use your encyclopedic knowledge of kinks, subcategories, slang, and cultural references to ensure the suggestions are nuanced and varied.

**User Input:**
- **Original Text:**
<user_text_input>  
  {{USER_TEXT}}  
</user_text_input>

**Guidelines for Suggestions:**  
- Provide 3 distinct fetishes, kinks, or philias that align with the themes, tone, or imagery of the user text.  
- Avoid overly safe or repetitive choices. If an obvious kink fits (e.g., dominance for a story about a victory), include it as one option but also explore deeper or quirkier angles (e.g., something tied to a specific cultural reference or a less common fetish).  
- Occasionally throw in a "stretch" or wildcard suggestion that's a bit unconventional or humorous, as long as it can be plausibly tied to the text.  
- Ensure suggestions are varied in tone and intensity—mix lighter, playful ideas with more intense or niche ones to give a broad range of options.  

**Output Format:**  
- **Suggested Kinks, Fetishes, or Philias:** Output as a JSON object with the following structure:  
{
  "suggested_kinks": [
    {
      "kink": "[Kink or fetish in 5 words or fewer, ideally 1-2 words just stating the fetish, philia, or kink, if applicable]"
    },
    ...
  ],
  "reasoning": "A short, cheeky comment on why these angles crank up the absurdity or how they play into the Rule-34 chaos, less than 50 words."
}
`;
