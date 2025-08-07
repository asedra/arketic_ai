// Export all types
export * from './types';
// Export all elements
export * from './elements';
// Export all actions
export * from './actions';
// Export utilities
export * from './utils';
import { CardValidator, CardParser } from './utils';
export class AdaptiveCard {
    constructor(version = '1.5') {
        this.type = 'AdaptiveCard';
        this.version = version;
        this.body = [];
    }
    addElement(element) {
        this.body.push(element);
        return this;
    }
    addElements(elements) {
        this.body.push(...elements);
        return this;
    }
    addAction(action) {
        if (!this.actions) {
            this.actions = [];
        }
        this.actions.push(action);
        return this;
    }
    addActions(actions) {
        if (!this.actions) {
            this.actions = [];
        }
        this.actions.push(...actions);
        return this;
    }
    setVersion(version) {
        this.version = version;
        return this;
    }
    setSchema(schema) {
        this.$schema = schema;
        return this;
    }
    setMetadata(metadata) {
        this.metadata = metadata;
        return this;
    }
    validate() {
        return CardValidator.validate(this);
    }
    render(context) {
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
    toJSON() {
        return {
            type: this.type,
            version: this.version,
            body: this.body,
            ...(this.actions && { actions: this.actions }),
            ...(this.metadata && { metadata: this.metadata }),
            ...(this.$schema && { $schema: this.$schema }),
        };
    }
    toString() {
        return CardParser.stringify(this.toJSON());
    }
    static fromJSON(json) {
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
//# sourceMappingURL=index.js.map