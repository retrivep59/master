import Anthropic from '@anthropic-ai/sdk';
import * as FileSystem from 'expo-file-system';
import { AI_MODEL, AI_MAX_TOKENS, FOOD_RECOGNITION_PROMPT, buildTextParsePrompt } from '@/constants/ai';
import { FoodAnalysisResult } from '@/types/ai';

// NOTE: For production, proxy this through a backend server to avoid exposing the API key.
// The EXPO_PUBLIC_ prefix makes it available in the React Native bundle.
function getClient(): Anthropic {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
  return new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true, // Required for React Native / browser-like environments
  });
}

/**
 * Analyzes a food photo using Claude's vision API.
 * Converts local URI to base64 and sends to Claude for nutritional analysis.
 */
export async function analyzeFoodImage(imageUri: string): Promise<FoodAnalysisResult> {
  const client = getClient();

  // Read the image file as base64
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: AI_MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64,
            },
          },
          {
            type: 'text',
            text: FOOD_RECOGNITION_PROMPT,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const parsed = JSON.parse(textBlock.text) as FoodAnalysisResult;
  return parsed;
}

/**
 * Parses a natural language food description into nutritional data.
 * E.g. "I had a bowl of oatmeal with banana" → FoodAnalysisResult
 */
export async function parseFoodText(input: string): Promise<FoodAnalysisResult> {
  const client = getClient();

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: AI_MAX_TOKENS,
    messages: [
      {
        role: 'user',
        content: buildTextParsePrompt(input),
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  const parsed = JSON.parse(textBlock.text) as FoodAnalysisResult;
  return parsed;
}
