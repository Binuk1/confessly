// contentModerationService.js
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export class ContentModerationService {
  static async moderateContent(text, contentType = 'confession') {
    if (!text || text.trim().length === 0) {
      return { isClean: true, issues: [] };
    }

    try {
      const moderateContent = httpsCallable(functions, 'moderateContent');
      const result = await moderateContent({ text, contentType });
      
      if (!result || !result.data) {
        console.error('Moderation failed: No data returned');
        return { isClean: true, issues: [], error: 'Moderation service unavailable' };
      }

      // Prefer new Gemini-normalized fields if present
      const hasGemini = Array.isArray(result.issues) || typeof result.isNSFW === 'boolean' || result.categories;
      const issues = hasGemini ? this.normalizeGeminiIssues(result.issues) : this.processAbusiveContent(result);
      const isNSFW = hasGemini ? Boolean(result.isNSFW) : this.isNSFWContent(issues);
      const isClean = !isNSFW && issues.length === 0;

      console.log(`Content moderation for ${contentType}:`, {
        text: text.substring(0, 100) + '...',
        isClean,
        issues: issues.map(i => i.type)
      });

      return {
        isClean,
        issues,
        isNSFW,
        categories: result.categories || null,
        sentiment: result.sentiment || null,
        language: result.language || null
      };

    } catch (error) {
      console.error('Content moderation error:', error);
      return { 
        isClean: true, 
        issues: [], 
        isNSFW: false,
        sentiment: null,
        language: null,
        error: error.message 
      };
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
          explanation: abuseItem.explanation || null
        });
      });
    }

    return issues;
  }

  static normalizeGeminiIssues(issues) {
    if (!Array.isArray(issues)) return [];
    return issues.map(it => ({
      type: it.type || 'other',
      severity: it.severity || 'low',
      text: it.text || '',
    }));
  }

  static isNSFWContent(issues) {
    // Blur ANY content that Tisane flags as problematic
    return issues && issues.length > 0;
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
