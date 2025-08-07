import { v4 as uuidv4 } from 'uuid';
// Base Action Class
export class BaseAction {
    constructor(type, id) {
        this.isEnabled = true;
        this.type = type;
        this.id = id || uuidv4();
    }
    setTitle(title) {
        this.title = title;
        return this;
    }
    setStyle(style) {
        this.style = style;
        return this;
    }
    setEnabled(isEnabled) {
        this.isEnabled = isEnabled;
        return this;
    }
    setTooltip(tooltip) {
        this.tooltip = tooltip;
        return this;
    }
}
// Submit Action
export class SubmitAction extends BaseAction {
    constructor(id) {
        super('Action.Submit', id);
        this.type = 'Action.Submit';
    }
    setData(data) {
        this.data = data;
        return this;
    }
    setAssociatedInputs(associatedInputs) {
        this.associatedInputs = associatedInputs;
        return this;
    }
    render(context) {
        const renderer = context.actionRenderers[this.type];
        return renderer ? renderer(this, context) : null;
    }
    toJSON() {
        return {
            type: this.type,
            id: this.id,
            ...(this.title && { title: this.title }),
            ...(this.iconUrl && { iconUrl: this.iconUrl }),
            ...(this.style && { style: this.style }),
            ...(this.fallback && { fallback: this.fallback }),
            ...(this.tooltip && { tooltip: this.tooltip }),
            ...(this.isEnabled !== undefined && { isEnabled: this.isEnabled }),
            ...(this.mode && { mode: this.mode }),
            ...(this.requires && { requires: this.requires }),
            ...(this.data && { data: this.data }),
            ...(this.associatedInputs && { associatedInputs: this.associatedInputs }),
        };
    }
}
// OpenUrl Action
export class OpenUrlAction extends BaseAction {
    constructor(url, id) {
        super('Action.OpenUrl', id);
        this.type = 'Action.OpenUrl';
        this.url = url;
    }
    setUrl(url) {
        this.url = url;
        return this;
    }
    render(context) {
        const renderer = context.actionRenderers[this.type];
        return renderer ? renderer(this, context) : null;
    }
    toJSON() {
        return {
            type: this.type,
            id: this.id,
            url: this.url,
            ...(this.title && { title: this.title }),
            ...(this.iconUrl && { iconUrl: this.iconUrl }),
            ...(this.style && { style: this.style }),
            ...(this.fallback && { fallback: this.fallback }),
            ...(this.tooltip && { tooltip: this.tooltip }),
            ...(this.isEnabled !== undefined && { isEnabled: this.isEnabled }),
            ...(this.mode && { mode: this.mode }),
            ...(this.requires && { requires: this.requires }),
        };
    }
}
// ShowCard Action
export class ShowCardAction extends BaseAction {
    constructor(card, id) {
        super('Action.ShowCard', id);
        this.type = 'Action.ShowCard';
        this.card = card;
    }
    setCard(card) {
        this.card = card;
        return this;
    }
    render(context) {
        const renderer = context.actionRenderers[this.type];
        return renderer ? renderer(this, context) : null;
    }
    toJSON() {
        return {
            type: this.type,
            id: this.id,
            card: this.card,
            ...(this.title && { title: this.title }),
            ...(this.iconUrl && { iconUrl: this.iconUrl }),
            ...(this.style && { style: this.style }),
            ...(this.fallback && { fallback: this.fallback }),
            ...(this.tooltip && { tooltip: this.tooltip }),
            ...(this.isEnabled !== undefined && { isEnabled: this.isEnabled }),
            ...(this.mode && { mode: this.mode }),
            ...(this.requires && { requires: this.requires }),
        };
    }
}
// Factory functions for easier action creation
export const createAction = {
    submit: (id) => new SubmitAction(id),
    openUrl: (url, id) => new OpenUrlAction(url, id),
    showCard: (card, id) => new ShowCardAction(card, id),
};
// Classes are already exported above
//# sourceMappingURL=index.js.map