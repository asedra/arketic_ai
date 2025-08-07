export interface AdaptiveCard {
    type: 'AdaptiveCard';
    version: string;
    body: CardElement[];
    actions?: Action[];
    metadata?: CardMetadata;
    $schema?: string;
}
export interface CardMetadata {
    designMode?: boolean;
    [key: string]: any;
}
export interface CardElement {
    type: string;
    id?: string;
    spacing?: Spacing;
    separator?: boolean;
    height?: Height;
    isVisible?: boolean;
    requires?: Record<string, string>;
}
export interface Container extends CardElement {
    type: 'Container';
    items: CardElement[];
    selectAction?: Action;
    style?: ContainerStyle;
    verticalContentAlignment?: VerticalAlignment;
    bleed?: boolean;
    backgroundImage?: BackgroundImage;
    minHeight?: string;
}
export interface TextBlock extends CardElement {
    type: 'TextBlock';
    text: string;
    color?: TextColor;
    fontType?: FontType;
    horizontalAlignment?: HorizontalAlignment;
    isSubtle?: boolean;
    maxLines?: number;
    size?: TextSize;
    weight?: TextWeight;
    wrap?: boolean;
}
export interface Image extends CardElement {
    type: 'Image';
    url: string;
    altText?: string;
    backgroundColor?: string;
    horizontalAlignment?: HorizontalAlignment;
    selectAction?: Action;
    size?: ImageSize;
    style?: ImageStyle;
    width?: string;
}
export interface InputText extends CardElement {
    type: 'Input.Text';
    id: string;
    placeholder?: string;
    value?: string;
    maxLength?: number;
    isMultiline?: boolean;
    style?: TextInputStyle;
    inlineAction?: Action;
    label?: string;
    isRequired?: boolean;
    errorMessage?: string;
}
export interface ActionSet extends CardElement {
    type: 'ActionSet';
    actions: Action[];
}
export interface Action {
    type: string;
    id?: string;
    title?: string;
    iconUrl?: string;
    style?: ActionStyle;
    fallback?: Action | FallbackOption;
    tooltip?: string;
    isEnabled?: boolean;
    mode?: ActionMode;
    requires?: Record<string, string>;
}
export interface ActionSubmit extends Action {
    type: 'Action.Submit';
    data?: any;
    associatedInputs?: AssociatedInputs;
}
export interface ActionOpenUrl extends Action {
    type: 'Action.OpenUrl';
    url: string;
}
export interface ActionShowCard extends Action {
    type: 'Action.ShowCard';
    card: AdaptiveCard;
}
export type Spacing = 'none' | 'small' | 'default' | 'medium' | 'large' | 'extraLarge' | 'padding';
export type Height = 'auto' | 'stretch';
export type ContainerStyle = 'default' | 'emphasis' | 'good' | 'attention' | 'warning' | 'accent';
export type VerticalAlignment = 'top' | 'center' | 'bottom';
export type HorizontalAlignment = 'left' | 'center' | 'right';
export type TextColor = 'default' | 'dark' | 'light' | 'accent' | 'good' | 'warning' | 'attention';
export type FontType = 'default' | 'monospace';
export type TextSize = 'small' | 'default' | 'medium' | 'large' | 'extraLarge';
export type TextWeight = 'lighter' | 'default' | 'bolder';
export type ImageSize = 'auto' | 'stretch' | 'small' | 'medium' | 'large';
export type ImageStyle = 'default' | 'person';
export type TextInputStyle = 'text' | 'tel' | 'url' | 'email' | 'password';
export type ActionStyle = 'default' | 'positive' | 'destructive';
export type ActionMode = 'primary' | 'secondary';
export type AssociatedInputs = 'auto' | 'none';
export type FallbackOption = 'drop';
export interface BackgroundImage {
    url: string;
    fillMode?: 'cover' | 'repeatHorizontally' | 'repeatVertically' | 'repeat';
    horizontalAlignment?: HorizontalAlignment;
    verticalAlignment?: VerticalAlignment;
}
export interface RenderContext {
    hostConfig: HostConfig;
    elementRenderers: Record<string, ElementRenderer>;
    actionRenderers: Record<string, ActionRenderer>;
    theme?: string;
}
export interface HostConfig {
    spacing: {
        small: number;
        default: number;
        medium: number;
        large: number;
        extraLarge: number;
        padding: number;
    };
    separator: {
        lineThickness: number;
        lineColor: string;
    };
    fontFamily: string;
    fontSizes: {
        small: number;
        default: number;
        medium: number;
        large: number;
        extraLarge: number;
    };
    fontWeights: {
        lighter: number;
        default: number;
        bolder: number;
    };
    containerStyles: {
        default: ContainerStyleConfig;
        emphasis: ContainerStyleConfig;
    };
}
export interface ContainerStyleConfig {
    backgroundColor: string;
    foregroundColors: {
        default: ColorConfig;
        dark: ColorConfig;
        light: ColorConfig;
        accent: ColorConfig;
        good: ColorConfig;
        warning: ColorConfig;
        attention: ColorConfig;
    };
}
export interface ColorConfig {
    default: string;
    subtle: string;
}
export type ElementRenderer<T extends CardElement = CardElement> = (element: T, context: RenderContext) => any;
export type ActionRenderer<T extends Action = Action> = (action: T, context: RenderContext) => any;
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
export interface ValidationError {
    message: string;
    path: string;
    code: string;
}
export interface ValidationWarning {
    message: string;
    path: string;
    code: string;
}
//# sourceMappingURL=index.d.ts.map