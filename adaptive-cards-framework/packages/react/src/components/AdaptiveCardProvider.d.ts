import React from 'react';
import { AdaptiveCard, RenderContext } from '@adaptive-cards/core';
export interface AdaptiveCardContextValue {
    card: AdaptiveCard;
    context: RenderContext;
    inputValues: Record<string, any>;
    setInputValue: (inputId: string, value: any) => void;
    getInputValue: (inputId: string) => any;
    executeAction: (action: any, data?: any) => void;
}
export interface AdaptiveCardProviderProps {
    card: AdaptiveCard;
    context: RenderContext;
    children: React.ReactNode;
    onAction?: (action: any, data?: any) => void;
    onInputChange?: (inputId: string, value: any) => void;
}
export declare const AdaptiveCardProvider: React.FC<AdaptiveCardProviderProps>;
export declare const useAdaptiveCard: () => AdaptiveCardContextValue;
//# sourceMappingURL=AdaptiveCardProvider.d.ts.map