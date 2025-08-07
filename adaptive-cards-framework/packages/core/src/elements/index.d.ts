import { CardElement, Container, TextBlock, Image, InputText, ActionSet, Action, RenderContext } from '../types';
export declare abstract class BaseElement {
    id: string;
    type: string;
    spacing?: 'none' | 'small' | 'default' | 'medium' | 'large' | 'extraLarge' | 'padding';
    separator?: boolean;
    height?: 'auto' | 'stretch';
    isVisible: boolean;
    constructor(type: string, id?: string);
    abstract render(context: RenderContext): any;
    abstract toJSON(): CardElement;
}
export declare class ContainerElement extends BaseElement implements Container {
    type: "Container";
    items: CardElement[];
    selectAction?: Action;
    style?: 'default' | 'emphasis' | 'good' | 'attention' | 'warning' | 'accent';
    verticalContentAlignment?: 'top' | 'center' | 'bottom';
    bleed?: boolean;
    backgroundImage?: any;
    minHeight?: string;
    constructor(id?: string);
    addItem(item: CardElement): this;
    addItems(items: CardElement[]): this;
    setStyle(style: 'default' | 'emphasis' | 'good' | 'attention' | 'warning' | 'accent'): this;
    render(context: RenderContext): any;
    toJSON(): Container;
}
export declare class TextBlockElement extends BaseElement implements TextBlock {
    type: "TextBlock";
    text: string;
    color?: 'default' | 'dark' | 'light' | 'accent' | 'good' | 'warning' | 'attention';
    fontType?: 'default' | 'monospace';
    horizontalAlignment?: 'left' | 'center' | 'right';
    isSubtle?: boolean;
    maxLines?: number;
    size?: 'small' | 'default' | 'medium' | 'large' | 'extraLarge';
    weight?: 'lighter' | 'default' | 'bolder';
    wrap?: boolean;
    constructor(text: string, id?: string);
    setText(text: string): this;
    setSize(size: 'small' | 'default' | 'medium' | 'large' | 'extraLarge'): this;
    setWeight(weight: 'lighter' | 'default' | 'bolder'): this;
    setColor(color: 'default' | 'dark' | 'light' | 'accent' | 'good' | 'warning' | 'attention'): this;
    setWrap(wrap: boolean): this;
    render(context: RenderContext): any;
    toJSON(): TextBlock;
}
export declare class ImageElement extends BaseElement implements Image {
    type: "Image";
    url: string;
    altText?: string;
    backgroundColor?: string;
    horizontalAlignment?: 'left' | 'center' | 'right';
    selectAction?: Action;
    size?: 'auto' | 'stretch' | 'small' | 'medium' | 'large';
    style?: 'default' | 'person';
    width?: string;
    constructor(url: string, id?: string);
    setUrl(url: string): this;
    setAltText(altText: string): this;
    setSize(size: 'auto' | 'stretch' | 'small' | 'medium' | 'large'): this;
    setStyle(style: 'default' | 'person'): this;
    render(context: RenderContext): any;
    toJSON(): Image;
}
export declare class InputTextElement extends BaseElement implements InputText {
    type: "Input.Text";
    placeholder?: string;
    value?: string;
    maxLength?: number;
    isMultiline?: boolean;
    style?: 'text' | 'tel' | 'url' | 'email' | 'password';
    inlineAction?: Action;
    label?: string;
    isRequired?: boolean;
    errorMessage?: string;
    constructor(id?: string);
    setPlaceholder(placeholder: string): this;
    setValue(value: string): this;
    setMaxLength(maxLength: number): this;
    setMultiline(isMultiline: boolean): this;
    setRequired(isRequired: boolean): this;
    render(context: RenderContext): any;
    toJSON(): InputText;
}
export declare class ActionSetElement extends BaseElement implements ActionSet {
    type: "ActionSet";
    actions: Action[];
    constructor(id?: string);
    addAction(action: Action): this;
    addActions(actions: Action[]): this;
    render(context: RenderContext): any;
    toJSON(): ActionSet;
}
export declare const createElement: {
    container: (id?: string) => ContainerElement;
    textBlock: (text: string, id?: string) => TextBlockElement;
    image: (url: string, id?: string) => ImageElement;
    inputText: (id?: string) => InputTextElement;
    actionSet: (id?: string) => ActionSetElement;
};
//# sourceMappingURL=index.d.ts.map