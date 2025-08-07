// Export all types
export * from './types';

// Export all elements
export * from './elements';

// Export all actions
export * from './actions';

// Export utilities
export * from './utils';

// Main AdaptiveCard class
import { v4 as uuidv4 } from 'uuid';
import { AdaptiveCard as IAdaptiveCard, CardElement, Action, RenderContext } from './types';
import { CardValidator, CardParser } from './utils';

export class AdaptiveCard implements IAdaptiveCard {
  public type = 'AdaptiveCard' as const;
  public version: string;
  public body: CardElement[];
  public actions?: Action[];
  public metadata?: any;
  public $schema?: string;

  constructor(version: string = '1.5') {
    this.version = version;
    this.body = [];
  }

  addElement(element: CardElement): this {
    this.body.push(element);
    return this;
  }

  addElements(elements: CardElement[]): this {
    this.body.push(...elements);
    return this;
  }

  addAction(action: Action): this {
    if (!this.actions) {
      this.actions = [];
    }
    this.actions.push(action);
    return this;
  }

  addActions(actions: Action[]): this {
    if (!this.actions) {
      this.actions = [];
    }
    this.actions.push(...actions);
    return this;
  }

  setVersion(version: string): this {
    this.version = version;
    return this;
  }

  setSchema(schema: string): this {
    this.$schema = schema;
    return this;
  }

  setMetadata(metadata: any): this {
    this.metadata = metadata;
    return this;
  }

  validate() {
    return CardValidator.validate(this);
  }

  render(context: RenderContext): any {
    // Basic rendering - delegates to context renderers
    const validation = this.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid card: ${validation.errors[0]?.message}`);
    }

    return {
      card: this,
      elements: this.body.map(element => {
        const renderer = context.elementRenderers[element.type];
        return renderer ? renderer(element, context) : element;
      }),
      actions: this.actions?.map(action => {
        const renderer = context.actionRenderers[action.type];
        return renderer ? renderer(action, context) : action;
      }),
    };
  }

  toJSON(): IAdaptiveCard {
    return {
      type: this.type,
      version: this.version,
      body: this.body,
      ...(this.actions && { actions: this.actions }),
      ...(this.metadata && { metadata: this.metadata }),
      ...(this.$schema && { $schema: this.$schema }),
    };
  }

  toString(): string {
    return CardParser.stringify(this.toJSON());
  }

  static fromJSON(json: string | object): AdaptiveCard {
    const cardData = CardParser.parse(json);
    const card = new AdaptiveCard(cardData.version);
    
    card.body = cardData.body;
    if (cardData.actions) {
      card.actions = cardData.actions;
    }
    if (cardData.metadata) {
      card.metadata = cardData.metadata;
    }
    if (cardData.$schema) {
      card.$schema = cardData.$schema;
    }

    return card;
  }
}