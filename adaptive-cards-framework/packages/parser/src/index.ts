import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { AdaptiveCard, ValidationResult, ValidationError, ValidationWarning } from '@adaptive-cards/core';

// JSON Schema for Adaptive Cards validation
const adaptiveCardSchema = {
  type: 'object',
  properties: {
    type: { const: 'AdaptiveCard' },
    version: { type: 'string', pattern: '^\\d+\\.\\d+$' },
    body: {
      type: 'array',
      items: { $ref: '#/$defs/element' },
    },
    actions: {
      type: 'array',
      items: { $ref: '#/$defs/action' },
    },
    metadata: { type: 'object' },
    $schema: { type: 'string', format: 'uri' },
  },
  required: ['type', 'version', 'body'],
  additionalProperties: true,
  $defs: {
    element: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        id: { type: 'string' },
        spacing: {
          type: 'string',
          enum: ['none', 'small', 'default', 'medium', 'large', 'extraLarge', 'padding'],
        },
        separator: { type: 'boolean' },
        height: {
          type: 'string',
          enum: ['auto', 'stretch'],
        },
        isVisible: { type: 'boolean' },
        requires: { type: 'object' },
      },
      required: ['type'],
      allOf: [
        {
          if: { properties: { type: { const: 'TextBlock' } } },
          then: {
            properties: {
              text: { type: 'string' },
              color: {
                type: 'string',
                enum: ['default', 'dark', 'light', 'accent', 'good', 'warning', 'attention'],
              },
              fontType: {
                type: 'string',
                enum: ['default', 'monospace'],
              },
              horizontalAlignment: {
                type: 'string',
                enum: ['left', 'center', 'right'],
              },
              isSubtle: { type: 'boolean' },
              maxLines: { type: 'number', minimum: 1 },
              size: {
                type: 'string',
                enum: ['small', 'default', 'medium', 'large', 'extraLarge'],
              },
              weight: {
                type: 'string',
                enum: ['lighter', 'default', 'bolder'],
              },
              wrap: { type: 'boolean' },
            },
            required: ['text'],
          },
        },
        {
          if: { properties: { type: { const: 'Image' } } },
          then: {
            properties: {
              url: { type: 'string', format: 'uri' },
              altText: { type: 'string' },
              backgroundColor: { type: 'string' },
              horizontalAlignment: {
                type: 'string',
                enum: ['left', 'center', 'right'],
              },
              selectAction: { $ref: '#/$defs/action' },
              size: {
                type: 'string',
                enum: ['auto', 'stretch', 'small', 'medium', 'large'],
              },
              style: {
                type: 'string',
                enum: ['default', 'person'],
              },
              width: { type: 'string' },
            },
            required: ['url'],
          },
        },
        {
          if: { properties: { type: { const: 'Input.Text' } } },
          then: {
            properties: {
              placeholder: { type: 'string' },
              value: { type: 'string' },
              maxLength: { type: 'number', minimum: 0 },
              isMultiline: { type: 'boolean' },
              style: {
                type: 'string',
                enum: ['text', 'tel', 'url', 'email', 'password'],
              },
              inlineAction: { $ref: '#/$defs/action' },
              label: { type: 'string' },
              isRequired: { type: 'boolean' },
              errorMessage: { type: 'string' },
            },
            required: ['id'],
          },
        },
        {
          if: { properties: { type: { const: 'Container' } } },
          then: {
            properties: {
              items: {
                type: 'array',
                items: { $ref: '#/$defs/element' },
              },
              selectAction: { $ref: '#/$defs/action' },
              style: {
                type: 'string',
                enum: ['default', 'emphasis', 'good', 'attention', 'warning', 'accent'],
              },
              verticalContentAlignment: {
                type: 'string',
                enum: ['top', 'center', 'bottom'],
              },
              bleed: { type: 'boolean' },
              backgroundImage: {
                type: 'object',
                properties: {
                  url: { type: 'string', format: 'uri' },
                  fillMode: {
                    type: 'string',
                    enum: ['cover', 'repeatHorizontally', 'repeatVertically', 'repeat'],
                  },
                  horizontalAlignment: {
                    type: 'string',
                    enum: ['left', 'center', 'right'],
                  },
                  verticalAlignment: {
                    type: 'string',
                    enum: ['top', 'center', 'bottom'],
                  },
                },
                required: ['url'],
              },
              minHeight: { type: 'string' },
            },
            required: ['items'],
          },
        },
        {
          if: { properties: { type: { const: 'ActionSet' } } },
          then: {
            properties: {
              actions: {
                type: 'array',
                items: { $ref: '#/$defs/action' },
              },
            },
            required: ['actions'],
          },
        },
      ],
    },
    action: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        id: { type: 'string' },
        title: { type: 'string' },
        iconUrl: { type: 'string', format: 'uri' },
        style: {
          type: 'string',
          enum: ['default', 'positive', 'destructive'],
        },
        fallback: {
          oneOf: [
            { $ref: '#/$defs/action' },
            { const: 'drop' },
          ],
        },
        tooltip: { type: 'string' },
        isEnabled: { type: 'boolean' },
        mode: {
          type: 'string',
          enum: ['primary', 'secondary'],
        },
        requires: { type: 'object' },
      },
      required: ['type'],
      allOf: [
        {
          if: { properties: { type: { const: 'Action.Submit' } } },
          then: {
            properties: {
              data: {},
              associatedInputs: {
                type: 'string',
                enum: ['auto', 'none'],
              },
            },
          },
        },
        {
          if: { properties: { type: { const: 'Action.OpenUrl' } } },
          then: {
            properties: {
              url: { type: 'string', format: 'uri' },
            },
            required: ['url'],
          },
        },
        {
          if: { properties: { type: { const: 'Action.ShowCard' } } },
          then: {
            properties: {
              card: { $ref: '#' },
            },
            required: ['card'],
          },
        },
      ],
    },
  },
};

export class AdaptiveCardParser {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    this.ajv.addSchema(adaptiveCardSchema, 'adaptive-card');
  }

  /**
   * Parse a JSON string or object into an AdaptiveCard
   */
  parse(input: string | object): AdaptiveCard {
    let cardData: any;

    try {
      cardData = typeof input === 'string' ? JSON.parse(input) : input;
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const validation = this.validate(cardData);
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => e.message).join(', ');
      throw new Error(`Invalid Adaptive Card: ${errorMessages}`);
    }

    return AdaptiveCard.fromJSON(cardData);
  }

  /**
   * Validate an Adaptive Card object
   */
  validate(cardData: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Schema validation
    const isValid = this.ajv.validate('adaptive-card', cardData);

    if (!isValid && this.ajv.errors) {
      for (const error of this.ajv.errors) {
        errors.push({
          message: error.message || 'Unknown validation error',
          path: error.instancePath || error.schemaPath || '',
          code: error.keyword?.toUpperCase() || 'VALIDATION_ERROR',
        });
      }
    }

    // Custom business logic validation
    this.validateBusinessRules(cardData, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Custom business rules validation
   */
  private validateBusinessRules(cardData: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Check version compatibility
    if (cardData.version) {
      const version = parseFloat(cardData.version);
      if (version < 1.0 || version > 1.5) {
        warnings.push({
          message: `Version ${cardData.version} may not be fully supported. Recommended versions: 1.0-1.5`,
          path: 'version',
          code: 'VERSION_WARNING',
        });
      }
    }

    // Check for duplicate IDs
    const ids = new Set<string>();
    this.collectIds(cardData, ids, errors);

    // Check for empty containers
    if (cardData.body) {
      this.validateContainers(cardData.body, errors, warnings);
    }

    // Check action limits (Microsoft recommends max 6 actions)
    if (cardData.actions && cardData.actions.length > 6) {
      warnings.push({
        message: 'More than 6 actions may not render properly on some platforms',
        path: 'actions',
        code: 'ACTION_LIMIT_WARNING',
      });
    }
  }

  /**
   * Collect all IDs and check for duplicates
   */
  private collectIds(obj: any, ids: Set<string>, errors: ValidationError[], path: string = ''): void {
    if (obj && typeof obj === 'object') {
      if (obj.id) {
        if (ids.has(obj.id)) {
          errors.push({
            message: `Duplicate ID found: ${obj.id}`,
            path: path + '.id',
            code: 'DUPLICATE_ID',
          });
        } else {
          ids.add(obj.id);
        }
      }

      // Recursively check nested objects
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            this.collectIds(item, ids, errors, `${path}.${key}[${index}]`);
          });
        } else if (value && typeof value === 'object') {
          this.collectIds(value, ids, errors, `${path}.${key}`);
        }
      }
    }
  }

  /**
   * Validate containers for common issues
   */
  private validateContainers(elements: any[], errors: ValidationError[], warnings: ValidationWarning[], path: string = 'body'): void {
    elements.forEach((element, index) => {
      const elementPath = `${path}[${index}]`;

      if (element.type === 'Container') {
        if (!element.items || element.items.length === 0) {
          warnings.push({
            message: 'Empty container found',
            path: elementPath,
            code: 'EMPTY_CONTAINER',
          });
        } else {
          // Recursively validate nested containers
          this.validateContainers(element.items, errors, warnings, `${elementPath}.items`);
        }
      }
    });
  }

  /**
   * Get supported card types
   */
  getSupportedTypes(): {
    elements: string[];
    actions: string[];
  } {
    return {
      elements: [
        'TextBlock',
        'Image',
        'Container',
        'Input.Text',
        'ActionSet',
      ],
      actions: [
        'Action.Submit',
        'Action.OpenUrl',
        'Action.ShowCard',
      ],
    };
  }

  /**
   * Create a sample card for testing
   */
  createSampleCard(): AdaptiveCard {
    const sampleCardData = {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: 'Sample Adaptive Card',
          size: 'large',
          weight: 'bolder',
        },
        {
          type: 'Container',
          items: [
            {
              type: 'Image',
              url: 'https://via.placeholder.com/300x200',
              altText: 'Sample image',
            },
            {
              type: 'TextBlock',
              text: 'This is a sample card created by the parser.',
              wrap: true,
            },
            {
              type: 'Input.Text',
              id: 'feedback',
              placeholder: 'Enter your feedback',
            },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Submit',
        },
      ],
    };

    return this.parse(sampleCardData);
  }
}

// Export singleton instance
export const parser = new AdaptiveCardParser();

// Export types
export { ValidationResult, ValidationError, ValidationWarning } from '@adaptive-cards/core';