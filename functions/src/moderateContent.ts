import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not configured');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

interface ModerationResult {
  isNSFW: boolean;
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    text: string;
  }>;
  categories: {
    [key: string]: number;
  };
}

export const moderateContent = functions.https.onCall(
  async (data, context): Promise<ModerationResult> => {
    const { text, contentType = 'confession' } = data;

    if (!text || text.trim().length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'No text provided for moderation'
      );
    }

    // Compose a strict JSON schema moderation prompt
    const instruction = `You are a content moderation system for an anonymous confession app. Analyze the user text and output STRICT JSON only. No prose.
Return this JSON shape:
{
  "isNSFW": boolean,
  "issues": [ { "type": string, "severity": "low"|"medium"|"high", "text": string } ],
  "categories": {
    "hate_speech": number, "harassment": number, "bullying": number,
    "self_harm": number, "sexual_content": number, "violence": number,
    "profanity": number, "personal_attack": number, "personal_data": number,
    "spam": number, "illegal": number, "other": number
  }
}
Rules:
- Set category scores from 0.0 to 1.0 (likelihood).
- Consider content NSFW if any serious category likelihood >= 0.6 or clear violation exists.
- issues[] should include each concrete violation you detect with a short excerpt in "text".
- Be conservative for minors and sexual content.`;

    const userText = `ContentType: ${contentType}\nText: ${text}`;

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(instruction + '\n\n' + userText);
      const response = await result.response;
      const responseText = response.text();

      // Parse the response
      let parsed;
      try {
        const cleaned = responseText.trim().replace(/^```json\n|^```\n|```$/g, '');
        parsed = JSON.parse(cleaned);
      } catch (e) {
        console.error('Failed to parse Gemini moderation JSON:', e, responseText);
        throw new functions.https.HttpsError(
          'internal',
          'Invalid response from moderation model'
        );
      }

      // Normalize the response
      const categories = parsed.categories || {};
      const issues = Array.isArray(parsed.issues)
        ? parsed.issues.map((it: any) => ({
            type: String(it.type || 'other'),
            severity: ['low', 'medium', 'high'].includes(it.severity) ? it.severity : 'low',
            text: String(it.text || '')
          }))
        : [];

      return {
        isNSFW: Boolean(parsed.isNSFW) || 
               (issues.length > 0 && Object.values(categories).some(v => (typeof v === 'number' ? v : 0) >= 0.6)),
        issues,
        categories
      };
    } catch (error) {
      console.error('Content moderation error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to moderate content',
        error
      );
    }
  }
);