import { v4 as uuidv4 } from 'uuid';
import {
  CardElement,
  Container,
  TextBlock,
  Image,
  InputText,
  ActionSet,
  Action,
  AdaptiveCard,
  RenderContext,
} from '../types';

// Base Element Class
export abstract class BaseElement {
  public id: string;
  public type: string;
  public spacing?: 'none' | 'small' | 'default' | 'medium' | 'large' | 'extraLarge' | 'padding';
  public separator?: boolean;
  public height?: 'auto' | 'stretch';
  public isVisible: boolean = true;

  constructor(type: string, id?: string) {
    this.type = type;
    this.id = id || uuidv4();
  }

  abstract render(context: RenderContext): any;
  abstract toJSON(): CardElement;
}

// Container Element
export class ContainerElement extends BaseElement implements Container {
  public type = 'Container' as const;
  public items: CardElement[] = [];
  public selectAction?: Action;
  public style?: 'default' | 'emphasis' | 'good' | 'attention' | 'warning' | 'accent';
  public verticalContentAlignment?: 'top' | 'center' | 'bottom';
  public bleed?: boolean;
  public backgroundImage?: any;
  public minHeight?: string;

  constructor(id?: string) {
    super('Container', id);
  }

  addItem(item: CardElement): this {
    this.items.push(item);
    return this;
  }

  addItems(items: CardElement[]): this {
    this.items.push(...items);
    return this;
  }

  setStyle(style: 'default' | 'emphasis' | 'good' | 'attention' | 'warning' | 'accent'): this {
    this.style = style;
    return this;
  }

  render(context: RenderContext): any {
    const renderer = context.elementRenderers[this.type];
    return renderer ? renderer(this, context) : null;
  }

  toJSON(): Container {
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
export class TextBlockElement extends BaseElement implements TextBlock {
  public type = 'TextBlock' as const;
  public text: string;
  public color?: 'default' | 'dark' | 'light' | 'accent' | 'good' | 'warning' | 'attention';
  public fontType?: 'default' | 'monospace';
  public horizontalAlignment?: 'left' | 'center' | 'right';
  public isSubtle?: boolean;
  public maxLines?: number;
  public size?: 'small' | 'default' | 'medium' | 'large' | 'extraLarge';
  public weight?: 'lighter' | 'default' | 'bolder';
  public wrap?: boolean;

  constructor(text: string, id?: string) {
    super('TextBlock', id);
    this.text = text;
  }

  setText(text: string): this {
    this.text = text;
    return this;
  }

  setSize(size: 'small' | 'default' | 'medium' | 'large' | 'extraLarge'): this {
    this.size = size;
    return this;
  }

  setWeight(weight: 'lighter' | 'default' | 'bolder'): this {
    this.weight = weight;
    return this;
  }

  setColor(color: 'default' | 'dark' | 'light' | 'accent' | 'good' | 'warning' | 'attention'): this {
    this.color = color;
    return this;
  }

  setWrap(wrap: boolean): this {
    this.wrap = wrap;
    return this;
  }

  render(context: RenderContext): any {
    const renderer = context.elementRenderers[this.type];
    return renderer ? renderer(this, context) : null;
  }

  toJSON(): TextBlock {
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
export class ImageElement extends BaseElement implements Image {
  public type = 'Image' as const;
  public url: string;
  public altText?: string;
  public backgroundColor?: string;
  public horizontalAlignment?: 'left' | 'center' | 'right';
  public selectAction?: Action;
  public size?: 'auto' | 'stretch' | 'small' | 'medium' | 'large';
  public style?: 'default' | 'person';
  public width?: string;

  constructor(url: string, id?: string) {
    super('Image', id);
    this.url = url;
  }

  setUrl(url: string): this {
    this.url = url;
    return this;
  }

  setAltText(altText: string): this {
    this.altText = altText;
    return this;
  }

  setSize(size: 'auto' | 'stretch' | 'small' | 'medium' | 'large'): this {
    this.size = size;
    return this;
  }

  setStyle(style: 'default' | 'person'): this {
    this.style = style;
    return this;
  }

  render(context: RenderContext): any {
    const renderer = context.elementRenderers[this.type];
    return renderer ? renderer(this, context) : null;
  }

  toJSON(): Image {
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
export class InputTextElement extends BaseElement implements InputText {
  public type = 'Input.Text' as const;
  public placeholder?: string;
  public value?: string;
  public maxLength?: number;
  public isMultiline?: boolean;
  public style?: 'text' | 'tel' | 'url' | 'email' | 'password';
  public inlineAction?: Action;
  public label?: string;
  public isRequired?: boolean;
  public errorMessage?: string;

  constructor(id?: string) {
    super('Input.Text', id);
  }

  setPlaceholder(placeholder: string): this {
    this.placeholder = placeholder;
    return this;
  }

  setValue(value: string): this {
    this.value = value;
    return this;
  }

  setMaxLength(maxLength: number): this {
    this.maxLength = maxLength;
    return this;
  }

  setMultiline(isMultiline: boolean): this {
    this.isMultiline = isMultiline;
    return this;
  }

  setRequired(isRequired: boolean): this {
    this.isRequired = isRequired;
    return this;
  }

  render(context: RenderContext): any {
    const renderer = context.elementRenderers[this.type];
    return renderer ? renderer(this, context) : null;
  }

  toJSON(): InputText {
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
export class ActionSetElement extends BaseElement implements ActionSet {
  public type = 'ActionSet' as const;
  public actions: Action[] = [];

  constructor(id?: string) {
    super('ActionSet', id);
  }

  addAction(action: Action): this {
    this.actions.push(action);
    return this;
  }

  addActions(actions: Action[]): this {
    this.actions.push(...actions);
    return this;
  }

  render(context: RenderContext): any {
    const renderer = context.elementRenderers[this.type];
    return renderer ? renderer(this, context) : null;
  }

  toJSON(): ActionSet {
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
  container: (id?: string) => new ContainerElement(id),
  textBlock: (text: string, id?: string) => new TextBlockElement(text, id),
  image: (url: string, id?: string) => new ImageElement(url, id),
  inputText: (id?: string) => new InputTextElement(id),
  actionSet: (id?: string) => new ActionSetElement(id),
};

// Classes are already exported above