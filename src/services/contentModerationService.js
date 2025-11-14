// contentModerationService.js
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export class ContentModerationService {
  static async moderateContent(text, contentType = 'confession') {
    if (!text || text.trim().length === 0) {
      return { isClean: true, issues: [], isNSFW: false, categories: {} };
    }

    try {
      const moderateContent = httpsCallable(functions, 'moderateContent');
      const result = await moderateContent({ 
        text, 
        contentType,
        timestamp: new Date().toISOString()
      });
      
      if (!result || !result.data) {
        return { 
          isClean: true, 
          issues: [], 
          categories: {},
          aiPowered: false
        };
      }

      // The result.data contains the ModerationResult object directly
      const { isNSFW = false, issues = [], categories = {} } = result.data;
      const isClean = !isNSFW && (!issues || issues.length === 0);

      return {
        isClean,
        issues: Array.isArray(issues) ? issues : [],
        isNSFW: Boolean(isNSFW),
        categories: categories || {}
      };

    } catch (error) {
      // On error, allow content to be posted (fail-open for better UX)
      return { 
        isClean: true, 
        issues: [], 
        categories: {},
        aiPowered: false,
        error: error.message 
      };
    }
  }

  static getErrorMessage(issues) {
    if (!issues || issues.length === 0) return null;

    const severityMap = {
      'hate_speech': 'hate speech',
      'harassment': 'harassment',
      'bullying': 'bullying',
      'personal_attack': 'personal attacks',
      'profanity': 'inappropriate language',
      'sexual_content': 'explicit content',
      'violence': 'violent content'
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

// React hook
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