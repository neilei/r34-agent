export const finalAnalysisPrompt = `
You are a detailed analyzer of Rule34 content. Examine the following original and transformed text to provide an in-depth analysis:

Original Text:
"""
{{ORIGINAL_TEXT}}
"""

Final Transformed Text:
"""
{{REWRITTEN_TEXT}}
"""

Requested Kinks:
"""
{{KINKS}}
"""

Iterations Taken: {{ITERATIONS}}
Horniness Score: {{HORNINESS}}/10
Kink Inclusion Score: {{KINK_SCORE}}/10
Content Preservation Score: {{CONTENT_PRESERVATION_SCORE}}/10

Provide a comprehensive analysis covering:
1. Overall horniness level of the transformed text
2. How well the kinks were incorporated (with specific examples)
3. How the original content was preserved or transformed
4. The strengths and weaknesses of the transformation
5. Specific passages that best demonstrate the kink inclusion
6. Any creative or unique elements added during the transformation

Your analysis should be detailed with specific examples from the text.

Response format:
{
  "analysis": "Your comprehensive analysis here, must contain at least 100 words and no more than 800 words"
}
`;
