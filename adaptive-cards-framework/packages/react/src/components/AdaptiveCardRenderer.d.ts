import React from 'react';
import { AdaptiveCard } from '@adaptive-cards/core';
export interface AdaptiveCardRendererProps {
    /** The adaptive card to render - can be a JSON string, object, or AdaptiveCard instance */
    card: string | object | AdaptiveCard;
    /** Custom host configuration */
    hostConfig?: any;
    /** Custom CSS class name */
    className?: string;
    /** Custom styles */
    style?: React.CSSProperties;
    /** Theme name */
    theme?: string;
    /** Callback for action execution */
    onAction?: (action: any, data?: any) => void;
    /** Callback for input value changes */
    onInputChange?: (inputId: string, value: any) => void;
    /** Callback for validation errors */
    onError?: (error: Error) => void;
    /** Enable validation */
    validate?: boolean;
}
export declare const AdaptiveCardRenderer: React.FC<AdaptiveCardRendererProps>;
//# sourceMappingURL=AdaptiveCardRenderer.d.ts.map