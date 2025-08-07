// Default Host Configuration
export const defaultHostConfig = {
    spacing: {
        small: 3,
        default: 8,
        medium: 20,
        large: 30,
        extraLarge: 40,
        padding: 15,
    },
    separator: {
        lineThickness: 1,
        lineColor: '#EEEEEE',
    },
    fontFamily: 'Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
    fontSizes: {
        small: 12,
        default: 14,
        medium: 17,
        large: 21,
        extraLarge: 26,
    },
    fontWeights: {
        lighter: 200,
        default: 400,
        bolder: 600,
    },
    containerStyles: {
        default: {
            backgroundColor: '#FFFFFF',
            foregroundColors: {
                default: { default: '#333333', subtle: '#EE333333' },
                dark: { default: '#000000', subtle: '#EE000000' },
                light: { default: '#FFFFFF', subtle: '#EEFFFFFF' },
                accent: { default: '#2E89FC', subtle: '#EE2E89FC' },
                good: { default: '#00FF00', subtle: '#EE00FF00' },
                warning: { default: '#FFD700', subtle: '#EEFFD700' },
                attention: { default: '#FF0000', subtle: '#EEFF0000' },
            },
        },
        emphasis: {
            backgroundColor: '#F5F5F5',
            foregroundColors: {
                default: { default: '#333333', subtle: '#EE333333' },
                dark: { default: '#000000', subtle: '#EE000000' },
                light: { default: '#FFFFFF', subtle: '#EEFFFFFF' },
                accent: { default: '#2E89FC', subtle: '#EE2E89FC' },
                good: { default: '#00FF00', subtle: '#EE00FF00' },
                warning: { default: '#FFD700', subtle: '#EEFFD700' },
                attention: { default: '#FF0000', subtle: '#EEFF0000' },
            },
        },
    },
};
// Card Validator
export class CardValidator {
    static validate(card) {
        const errors = [];
        const warnings = [];
        // Basic validation
        if (!card.type || card.type !== 'AdaptiveCard') {
            errors.push({
                message: 'Card must have type "AdaptiveCard"',
                path: 'type',
                code: 'INVALID_TYPE',
            });
        }
        if (!card.version) {
            errors.push({
                message: 'Card must have a version',
                path: 'version',
                code: 'MISSING_VERSION',
            });
        }
        if (!card.body || !Array.isArray(card.body)) {
            errors.push({
                message: 'Card must have a body array',
                path: 'body',
                code: 'MISSING_BODY',
            });
        }
        else {
            card.body.forEach((element, index) => {
                const elementErrors = this.validateElement(element, `body[${index}]`);
                errors.push(...elementErrors);
            });
        }
        if (card.actions) {
            card.actions.forEach((action, index) => {
                const actionErrors = this.validateAction(action, `actions[${index}]`);
                errors.push(...actionErrors);
            });
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
        };
    }
    static validateElement(element, path) {
        const errors = [];
        if (!element.type) {
            errors.push({
                message: 'Element must have a type',
                path: `${path}.type`,
                code: 'MISSING_TYPE',
            });
        }
        // Type-specific validation
        switch (element.type) {
            case 'TextBlock':
                if (!element.text) {
                    errors.push({
                        message: 'TextBlock must have text property',
                        path: `${path}.text`,
                        code: 'MISSING_TEXT',
                    });
                }
                break;
            case 'Image':
                if (!element.url) {
                    errors.push({
                        message: 'Image must have url property',
                        path: `${path}.url`,
                        code: 'MISSING_URL',
                    });
                }
                break;
            case 'Input.Text':
                if (!element.id) {
                    errors.push({
                        message: 'Input.Text must have an id',
                        path: `${path}.id`,
                        code: 'MISSING_ID',
                    });
                }
                break;
            case 'Container':
                const container = element;
                if (!container.items || !Array.isArray(container.items)) {
                    errors.push({
                        message: 'Container must have items array',
                        path: `${path}.items`,
                        code: 'MISSING_ITEMS',
                    });
                }
                else {
                    container.items.forEach((item, index) => {
                        const itemErrors = this.validateElement(item, `${path}.items[${index}]`);
                        errors.push(...itemErrors);
                    });
                }
                break;
        }
        return errors;
    }
    static validateAction(action, path) {
        const errors = [];
        if (!action.type) {
            errors.push({
                message: 'Action must have a type',
                path: `${path}.type`,
                code: 'MISSING_TYPE',
            });
        }
        // Type-specific validation
        switch (action.type) {
            case 'Action.OpenUrl':
                if (!action.url) {
                    errors.push({
                        message: 'Action.OpenUrl must have url property',
                        path: `${path}.url`,
                        code: 'MISSING_URL',
                    });
                }
                break;
            case 'Action.ShowCard':
                if (!action.card) {
                    errors.push({
                        message: 'Action.ShowCard must have card property',
                        path: `${path}.card`,
                        code: 'MISSING_CARD',
                    });
                }
                break;
        }
        return errors;
    }
}
// Card Parser
export class CardParser {
    static parse(cardJson) {
        const cardData = typeof cardJson === 'string' ? JSON.parse(cardJson) : cardJson;
        // Basic structure validation
        if (!cardData.type || cardData.type !== 'AdaptiveCard') {
            throw new Error('Invalid card: must be of type AdaptiveCard');
        }
        // Return the parsed card (for now, we'll just return the object)
        // In a full implementation, we'd create proper class instances
        return cardData;
    }
    static stringify(card) {
        return JSON.stringify(card, null, 2);
    }
}
// Utility functions
export function createDefaultRenderContext(hostConfig) {
    return {
        hostConfig: { ...defaultHostConfig, ...hostConfig },
        elementRenderers: {},
        actionRenderers: {},
    };
}
export function mergeHostConfig(base, override) {
    return {
        ...base,
        ...override,
        spacing: { ...base.spacing, ...override.spacing },
        separator: { ...base.separator, ...override.separator },
        fontSizes: { ...base.fontSizes, ...override.fontSizes },
        fontWeights: { ...base.fontWeights, ...override.fontWeights },
        containerStyles: {
            ...base.containerStyles,
            ...override.containerStyles,
        },
    };
}
export function getSpacingValue(spacing, hostConfig) {
    if (!spacing)
        return 0;
    return hostConfig.spacing[spacing] || 0;
}
export function getFontSize(size, hostConfig) {
    if (!size)
        return hostConfig.fontSizes.default;
    return hostConfig.fontSizes[size] || hostConfig.fontSizes.default;
}
export function getFontWeight(weight, hostConfig) {
    if (!weight)
        return hostConfig.fontWeights.default;
    return hostConfig.fontWeights[weight] || hostConfig.fontWeights.default;
}
// Sample card data for testing
export const sampleCards = {
    simple: {
        type: 'AdaptiveCard',
        version: '1.5',
        body: [
            {
                type: 'TextBlock',
                text: 'Hello, World!',
                size: 'large',
                weight: 'bolder',
            },
        ],
    },
    complex: {
        type: 'AdaptiveCard',
        version: '1.5',
        body: [
            {
                type: 'Container',
                items: [
                    {
                        type: 'TextBlock',
                        text: 'Adaptive Card Demo',
                        size: 'large',
                        weight: 'bolder',
                        horizontalAlignment: 'center',
                    },
                    {
                        type: 'Image',
                        url: 'https://via.placeholder.com/300x200',
                        altText: 'Sample image',
                        size: 'medium',
                        horizontalAlignment: 'center',
                    },
                    {
                        type: 'TextBlock',
                        text: 'This is a sample adaptive card with multiple elements.',
                        wrap: true,
                    },
                    {
                        type: 'Input.Text',
                        id: 'userInput',
                        placeholder: 'Enter your feedback',
                        isMultiline: true,
                    },
                ],
            },
        ],
        actions: [
            {
                type: 'Action.Submit',
                title: 'Submit',
                data: { action: 'submit' },
            },
            {
                type: 'Action.OpenUrl',
                title: 'Learn More',
                url: 'https://adaptivecards.io',
            },
        ],
    },
};
// Classes are already exported above
//# sourceMappingURL=index.js.map