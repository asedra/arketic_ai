import { AdaptiveCard, ValidationResult } from '@adaptive-cards/core';
export declare class AdaptiveCardParser {
    private ajv;
    constructor();
    /**
     * Parse a JSON string or object into an AdaptiveCard
     */
    parse(input: string | object): AdaptiveCard;
    /**
     * Validate an Adaptive Card object
     */
    validate(cardData: any): ValidationResult;
    /**
     * Custom business rules validation
     */
    private validateBusinessRules;
    /**
     * Collect all IDs and check for duplicates
     */
    private collectIds;
    /**
     * Validate containers for common issues
     */
    private validateContainers;
    /**
     * Get supported card types
     */
    getSupportedTypes(): {
        elements: string[];
        actions: string[];
    };
    /**
     * Create a sample card for testing
     */
    createSampleCard(): AdaptiveCard;
}
export declare const parser: AdaptiveCardParser;
export { ValidationResult, ValidationError, ValidationWarning } from '@adaptive-cards/core';
//# sourceMappingURL=index.d.ts.map