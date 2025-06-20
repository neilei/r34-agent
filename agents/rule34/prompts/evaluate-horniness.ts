export const evaluateHorninessPrompt = `
You are a critical evaluator of Rule34 content. Your task is to analyze the following transformed text and provide a score and detailed structured feedback specifically on the criterion of Horniness.

Original Text:
"""
{{ORIGINAL_TEXT}}
"""

Transformed Text:
"""
{{REWRITTEN_TEXT}}
"""

Criterion: Horniness (0-10)
- How horny is the text? Is it confidently sexual?
- Is it creatively vulgar, sensory, and explicit?
- Does it contain a good mix of overt and implied sexual content?

Rules for Response:
- The "score" should be a number between 0 and 10 based on the criterion above.
- The "rationale" should be a short explanation of why you gave the score, no more than 100 words.
- The "whatIsWorkingWell" should be an array of specific elements that effectively contribute to the score and should be maintained or expanded. Maximum 5 items, 50 words per item.
- The "whatNeedsImprovement" should be an array of specific issues that need addressing. Maximum 5 items, at most 50 words per item. If the score is high and you're satisfied, you can have fewer or no items.
- The "specificSuggestions" should be an array of actionable suggestions to improve the score. Maximum 5 items, at most 50 words per item. If the score is high and you're satisfied, you can have fewer or no items.

Response Format:
{
    "horniness": {
        "score": (0-10),
        "rationale": "Your rationale for the score, no more than 100 words",
        "whatIsWorkingWell": ["Array of specific elements that effectively contribute to horniness and should be maintained or expanded. Maximum 5 items, max 50 words per item."],
        "whatNeedsImprovement": ["Array describing what about the horniness of the text is missing or needs improvement. Max 5 items, max 50 words per item. Supply fewer items if satisfied with the score."],
        "specificSuggestions": ["Array of actionable suggestions to increase horniness while maintaining content. Max 5 items, max 50 words per item. Supply fewer items if satisfied with the score."]
    }
}
`;