import React, { createContext, useContext, useState, useCallback } from 'react';
import { AdaptiveCard, RenderContext } from '@adaptive-cards/core';

export interface AdaptiveCardContextValue {
  card: AdaptiveCard;
  context: RenderContext;
  inputValues: Record<string, any>;
  setInputValue: (inputId: string, value: any) => void;
  getInputValue: (inputId: string) => any;
  executeAction: (action: any, data?: any) => void;
}

const AdaptiveCardContext = createContext<AdaptiveCardContextValue | null>(null);

export interface AdaptiveCardProviderProps {
  card: AdaptiveCard;
  context: RenderContext;
  children: React.ReactNode;
  onAction?: (action: any, data?: any) => void;
  onInputChange?: (inputId: string, value: any) => void;
}

export const AdaptiveCardProvider: React.FC<AdaptiveCardProviderProps> = ({
  card,
  context,
  children,
  onAction,
  onInputChange,
}) => {
  const [inputValues, setInputValues] = useState<Record<string, any>>({});

  const setInputValue = useCallback((inputId: string, value: any) => {
    setInputValues(prev => ({
      ...prev,
      [inputId]: value,
    }));
    
    if (onInputChange) {
      onInputChange(inputId, value);
    }
  }, [onInputChange]);

  const getInputValue = useCallback((inputId: string) => {
    return inputValues[inputId];
  }, [inputValues]);

  const executeAction = useCallback((action: any, data?: any) => {
    if (action.type === 'Action.Submit') {
      // Collect all input values for submit actions
      const submitData = {
        ...data,
        ...inputValues,
      };
      
      if (onAction) {
        onAction(action, submitData);
      }
    } else {
      if (onAction) {
        onAction(action, data);
      }
    }
  }, [inputValues, onAction]);

  const contextValue: AdaptiveCardContextValue = {
    card,
    context,
    inputValues,
    setInputValue,
    getInputValue,
    executeAction,
  };

  return (
    <AdaptiveCardContext.Provider value={contextValue}>
      {children}
    </AdaptiveCardContext.Provider>
  );
};

export const useAdaptiveCard = (): AdaptiveCardContextValue => {
  const context = useContext(AdaptiveCardContext);
  if (!context) {
    throw new Error('useAdaptiveCard must be used within an AdaptiveCardProvider');
  }
  return context;
};