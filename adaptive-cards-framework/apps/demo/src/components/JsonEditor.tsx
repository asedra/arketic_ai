import React, { useState, useCallback, useEffect } from 'react';
import { AdaptiveCardParser } from '@adaptive-cards/parser';
import { AdaptiveCard } from '@adaptive-cards/core';
import { sampleCards } from '../data/sampleCards';

interface JsonEditorProps {
  selectedCard: string;
  onCardUpdate?: (card: AdaptiveCard) => void;
  onError?: (error: Error) => void;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({
  selectedCard,
  onCardUpdate,
  onError,
}) => {
  const [jsonText, setJsonText] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [validationMessage, setValidationMessage] = useState('');
  const [parser] = useState(() => new AdaptiveCardParser());

  // Update JSON text when selected card changes
  useEffect(() => {
    const cardData = sampleCards[selectedCard as keyof typeof sampleCards];
    if (cardData) {
      setJsonText(JSON.stringify(cardData, null, 2));
      setIsValid(true);
      setValidationMessage('');
    }
  }, [selectedCard]);

  const validateAndUpdate = useCallback((json: string) => {
    try {
      const parsedCard = parser.parse(json);
      const validation = parsedCard.validate();
      
      if (validation.isValid) {
        setIsValid(true);
        setValidationMessage('Valid adaptive card');
        onCardUpdate?.(parsedCard);
      } else {
        setIsValid(false);
        setValidationMessage(`Validation errors: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    } catch (error) {
      setIsValid(false);
      setValidationMessage(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      onError?.(error as Error);
    }
  }, [parser, onCardUpdate, onError]);

  const handleJsonChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newJson = event.target.value;
    setJsonText(newJson);
    
    // Debounce validation
    const timeoutId = setTimeout(() => {
      if (newJson.trim()) {
        validateAndUpdate(newJson);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [validateAndUpdate]);

  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonText(formatted);
      validateAndUpdate(formatted);
    } catch (error) {
      setValidationMessage('Invalid JSON format');
      setIsValid(false);
    }
  }, [jsonText, validateAndUpdate]);

  const handleMinify = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      const minified = JSON.stringify(parsed);
      setJsonText(minified);
      validateAndUpdate(minified);
    } catch (error) {
      setValidationMessage('Invalid JSON format');
      setIsValid(false);
    }
  }, [jsonText, validateAndUpdate]);

  const handleReset = useCallback(() => {
    const cardData = sampleCards[selectedCard as keyof typeof sampleCards];
    if (cardData) {
      const resetJson = JSON.stringify(cardData, null, 2);
      setJsonText(resetJson);
      validateAndUpdate(resetJson);
    }
  }, [selectedCard, validateAndUpdate]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
      // Could show a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, [jsonText]);

  return (
    <div className=\"json-editor\">
      <h3>JSON Editor</h3>
      
      <textarea
        className=\"json-textarea\"
        value={jsonText}
        onChange={handleJsonChange}
        placeholder=\"Enter Adaptive Card JSON here...\"
        spellCheck={false}
      />
      
      <div className=\"toolbar\">
        <button
          className=\"toolbar-button\"
          onClick={handleFormat}
          title=\"Format JSON\"
        >
          Format
        </button>
        <button
          className=\"toolbar-button\"
          onClick={handleMinify}
          title=\"Minify JSON\"
        >
          Minify
        </button>
        <button
          className=\"toolbar-button\"
          onClick={handleReset}
          title=\"Reset to original\"
        >
          Reset
        </button>
        <button
          className=\"toolbar-button\"
          onClick={handleCopy}
          title=\"Copy to clipboard\"
        >
          Copy
        </button>
      </div>
      
      {validationMessage && (
        <div className={isValid ? 'success-message' : 'error-message'}>
          {validationMessage}
        </div>
      )}
    </div>
  );
};