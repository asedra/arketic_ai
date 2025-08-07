import { v4 as uuidv4 } from 'uuid';
// Base Element Class
export class BaseElement {
    constructor(type, id) {
        this.isVisible = true;
        this.type = type;
        this.id = id || uuidv4();
    }
}
// Container Element
export class ContainerElement extends BaseElement {
    constructor(id) {
        super('Container', id);
        this.type = 'Container';
        this.items = [];
    }
    addItem(item) {
        this.items.push(item);
        return this;
    }
    addItems(items) {
        this.items.push(...items);
        return this;
    }
    setStyle(style) {
        this.style = style;
        return this;
    }
    render(context) {
        const renderer = context.elementRenderers[this.type];
        return renderer ? renderer(this, context) : null;
    }
    toJSON() {
        return {
            type: this.type,
            id: this.id,
            items: this.items,
            ...(this.spacing && { spacing: this.spacing }),
            ...(this.separator && { separator: this.separator }),
            ...(this.height && { height: this.height }),
            ...(this.isVisible !== undefined && { isVisible: this.isVisible }),
            ...(this.selectAction && { selectAction: this.selectAction }),
            ...(this.style && { style: this.style }),
            ...(this.verticalContentAlignment && { verticalContentAlignment: this.verticalContentAlignment }),
            ...(this.bleed && { bleed: this.bleed }),
            ...(this.backgroundImage && { backgroundImage: this.backgroundImage }),
            ...(this.minHeight && { minHeight: this.minHeight }),
        };
    }
}
// TextBlock Element
export class TextBlockElement extends BaseElement {
    constructor(text, id) {
        super('TextBlock', id);
        this.type = 'TextBlock';
        this.text = text;
    }
    setText(text) {
        this.text = text;
        return this;
    }
    setSize(size) {
        this.size = size;
        return this;
    }
    setWeight(weight) {
        this.weight = weight;
        return this;
    }
    setColor(color) {
        this.color = color;
        return this;
    }
    setWrap(wrap) {
        this.wrap = wrap;
        return this;
    }
    render(context) {
        const renderer = context.elementRenderers[this.type];
        return renderer ? renderer(this, context) : null;
    }
    toJSON() {
        return {
            type: this.type,
            id: this.id,
            text: this.text,
            ...(this.spacing && { spacing: this.spacing }),
            ...(this.separator && { separator: this.separator }),
            ...(this.height && { height: this.height }),
            ...(this.isVisible !== undefined && { isVisible: this.isVisible }),
            ...(this.color && { color: this.color }),
            ...(this.fontType && { fontType: this.fontType }),
            ...(this.horizontalAlignment && { horizontalAlignment: this.horizontalAlignment }),
            ...(this.isSubtle && { isSubtle: this.isSubtle }),
            ...(this.maxLines && { maxLines: this.maxLines }),
            ...(this.size && { size: this.size }),
            ...(this.weight && { weight: this.weight }),
            ...(this.wrap !== undefined && { wrap: this.wrap }),
        };
    }
}
// Image Element
export class ImageElement extends BaseElement {
    constructor(url, id) {
        super('Image', id);
        this.type = 'Image';
        this.url = url;
    }
    setUrl(url) {
        this.url = url;
        return this;
    }
    setAltText(altText) {
        this.altText = altText;
        return this;
    }
    setSize(size) {
        this.size = size;
        return this;
    }
    setStyle(style) {
        this.style = style;
        return this;
    }
    render(context) {
        const renderer = context.elementRenderers[this.type];
        return renderer ? renderer(this, context) : null;
    }
    toJSON() {
        return {
            type: this.type,
            id: this.id,
            url: this.url,
            ...(this.spacing && { spacing: this.spacing }),
            ...(this.separator && { separator: this.separator }),
            ...(this.height && { height: this.height }),
            ...(this.isVisible !== undefined && { isVisible: this.isVisible }),
            ...(this.altText && { altText: this.altText }),
            ...(this.backgroundColor && { backgroundColor: this.backgroundColor }),
            ...(this.horizontalAlignment && { horizontalAlignment: this.horizontalAlignment }),
            ...(this.selectAction && { selectAction: this.selectAction }),
            ...(this.size && { size: this.size }),
            ...(this.style && { style: this.style }),
            ...(this.width && { width: this.width }),
        };
    }
}
// Input.Text Element
export class InputTextElement extends BaseElement {
    constructor(id) {
        super('Input.Text', id);
        this.type = 'Input.Text';
    }
    setPlaceholder(placeholder) {
        this.placeholder = placeholder;
        return this;
    }
    setValue(value) {
        this.value = value;
        return this;
    }
    setMaxLength(maxLength) {
        this.maxLength = maxLength;
        return this;
    }
    setMultiline(isMultiline) {
        this.isMultiline = isMultiline;
        return this;
    }
    setRequired(isRequired) {
        this.isRequired = isRequired;
        return this;
    }
    render(context) {
        const renderer = context.elementRenderers[this.type];
        return renderer ? renderer(this, context) : null;
    }
    toJSON() {
        return {
            type: this.type,
            id: this.id,
            ...(this.spacing && { spacing: this.spacing }),
            ...(this.separator && { separator: this.separator }),
            ...(this.height && { height: this.height }),
            ...(this.isVisible !== undefined && { isVisible: this.isVisible }),
            ...(this.placeholder && { placeholder: this.placeholder }),
            ...(this.value && { value: this.value }),
            ...(this.maxLength && { maxLength: this.maxLength }),
            ...(this.isMultiline && { isMultiline: this.isMultiline }),
            ...(this.style && { style: this.style }),
            ...(this.inlineAction && { inlineAction: this.inlineAction }),
            ...(this.label && { label: this.label }),
            ...(this.isRequired && { isRequired: this.isRequired }),
            ...(this.errorMessage && { errorMessage: this.errorMessage }),
        };
    }
}
// ActionSet Element
export class ActionSetElement extends BaseElement {
    constructor(id) {
        super('ActionSet', id);
        this.type = 'ActionSet';
        this.actions = [];
    }
    addAction(action) {
        this.actions.push(action);
        return this;
    }
    addActions(actions) {
        this.actions.push(...actions);
        return this;
    }
    render(context) {
        const renderer = context.elementRenderers[this.type];
        return renderer ? renderer(this, context) : null;
    }
    toJSON() {
        return {
            type: this.type,
            id: this.id,
            actions: this.actions,
            ...(this.spacing && { spacing: this.spacing }),
            ...(this.separator && { separator: this.separator }),
            ...(this.height && { height: this.height }),
            ...(this.isVisible !== undefined && { isVisible: this.isVisible }),
        };
    }
}
// Factory functions for easier element creation
export const createElement = {
    container: (id) => new ContainerElement(id),
    textBlock: (text, id) => new TextBlockElement(text, id),
    image: (url, id) => new ImageElement(url, id),
    inputText: (id) => new InputTextElement(id),
    actionSet: (id) => new ActionSetElement(id),
};
// Classes are already exported above
//# sourceMappingURL=index.js.map