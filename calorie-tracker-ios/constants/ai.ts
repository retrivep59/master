export const AI_MODEL = 'claude-haiku-4-5-20251001';
export const AI_MAX_TOKENS = 1024;

export const FOOD_RECOGNITION_PROMPT = `You are a precise nutritional analysis AI. Analyze the food visible in this image and return ONLY a valid JSON object with this exact structure (no markdown, no preamble):
{
  "confidence": "high",
  "foods": [
    {
      "name": "Food Name",
      "estimatedCalories": 350,
      "estimatedProtein": 12,
      "estimatedCarbs": 45,
      "estimatedFat": 14,
      "servingDescription": "1 medium bowl (~250g)",
      "portionNotes": "Based on typical serving size visible in image"
    }
  ],
  "totalCalories": 350,
  "explanation": "Identified grilled chicken with rice",
  "disclaimer": "Estimates may vary ±20%"
}

Rules:
- confidence: "high" if clearly identifiable, "medium" if somewhat unclear, "low" if guessing
- Include ALL food items visible in the image as separate entries
- Use realistic calorie/macro estimates for the visible portion size
- Return ONLY the JSON object, nothing else`;

export function buildTextParsePrompt(input: string): string {
  return `You are a precise nutritional analysis AI. Parse this food log and return ONLY a valid JSON object (no markdown, no preamble):

User said: "${input}"

{
  "confidence": "high",
  "foods": [
    {
      "name": "Food Name",
      "estimatedCalories": 300,
      "estimatedProtein": 10,
      "estimatedCarbs": 40,
      "estimatedFat": 10,
      "servingDescription": "1 serving",
      "portionNotes": "Standard serving assumed"
    }
  ],
  "totalCalories": 300,
  "explanation": "Parsed from user input",
  "disclaimer": "Estimates may vary ±20%"
}

Rules:
- Parse ALL food items mentioned
- Use realistic calorie/macro estimates
- Return ONLY the JSON object`;
}
