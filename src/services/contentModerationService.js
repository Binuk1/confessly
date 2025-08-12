// contentModerationService.js
export class ContentModerationService {
  static async moderateContent(text, contentType = 'confession') {
    if (!text || text.trim().length === 0) {
      return { isClean: true, issues: [] };
    }

    try {
      const response = await fetch('/api/moderateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, contentType }),
      });

      if (!response.ok) {
        console.error('Moderation backend error:', response.statusText);
        return { isClean: true, issues: [], error: 'Moderation backend error' };
      }

      const result = await response.json();

      const issues = this.processAbusiveContent(result);
      const isClean = issues.length === 0;

      console.log(`Content moderation for ${contentType}:`, {
        text: text.substring(0, 100) + '...',
        isClean,
        issues: issues.map(i => i.type)
      });

      return {
        isClean,
        issues,
        sentiment: result.sentiment,
        language: result.language
      };

    } catch (error) {
      console.error('Content moderation error:', error);
      return { isClean: true, issues: [], error: error.message };
    }
  }

  static processAbusiveContent(tisaneResult) {
    const issues = [];

    if (tisaneResult.abuse && tisaneResult.abuse.length > 0) {
      tisaneResult.abuse.forEach(abuseItem => {
        issues.push({
          type: abuseItem.type,
          severity: abuseItem.severity,
          offset: abuseItem.offset,
          length: abuseItem.length,
          text: abuseItem.text,
          explanation: abuseItem.explanation
        });
      });
    }

    return issues;
  }

  static getErrorMessage(issues) {
    if (issues.length === 0) return null;

    const severityMap = {
      'hate_speech': 'hate speech',
      'harassment': 'harassment',
      'cyberbullying': 'bullying',
      'personal_attack': 'personal attacks',
      'profanity': 'inappropriate language',
      'threat': 'threatening language'
    };

    const detectedTypes = [...new Set(issues.map(i => i.type))];
    const friendlyTypes = detectedTypes.map(type => severityMap[type] || type);

    if (friendlyTypes.length === 1) {
      return `Your message contains ${friendlyTypes[0]}. Please revise your message to be more respectful.`;
    } else {
      return `Your message contains inappropriate content (${friendlyTypes.join(', ')}). Please revise your message to be more respectful.`;
    }
  }
}

// React hook example
import { useState } from 'react';
export const useContentModeration = () => {
  const [isCheckingContent, setIsCheckingContent] = useState(false);

  const checkContent = async (text, contentType) => {
    setIsCheckingContent(true);
    try {
      const result = await ContentModerationService.moderateContent(text, contentType);
      return result;
    } finally {
      setIsCheckingContent(false);
    }
  };

  return { checkContent, isCheckingContent };
};
