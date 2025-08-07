import { Action, ActionSubmit, ActionOpenUrl, ActionShowCard, AdaptiveCard, RenderContext } from '../types';
export declare abstract class BaseAction {
    id: string;
    type: string;
    title?: string;
    iconUrl?: string;
    style?: 'default' | 'positive' | 'destructive';
    fallback?: Action | 'drop';
    tooltip?: string;
    isEnabled: boolean;
    mode?: 'primary' | 'secondary';
    requires?: Record<string, string>;
    constructor(type: string, id?: string);
    abstract render(context: RenderContext): any;
    abstract toJSON(): Action;
    setTitle(title: string): this;
    setStyle(style: 'default' | 'positive' | 'destructive'): this;
    setEnabled(isEnabled: boolean): this;
    setTooltip(tooltip: string): this;
}
export declare class SubmitAction extends BaseAction implements ActionSubmit {
    type: "Action.Submit";
    data?: any;
    associatedInputs?: 'auto' | 'none';
    constructor(id?: string);
    setData(data: any): this;
    setAssociatedInputs(associatedInputs: 'auto' | 'none'): this;
    render(context: RenderContext): any;
    toJSON(): ActionSubmit;
}
export declare class OpenUrlAction extends BaseAction implements ActionOpenUrl {
    type: "Action.OpenUrl";
    url: string;
    constructor(url: string, id?: string);
    setUrl(url: string): this;
    render(context: RenderContext): any;
    toJSON(): ActionOpenUrl;
}
export declare class ShowCardAction extends BaseAction implements ActionShowCard {
    type: "Action.ShowCard";
    card: AdaptiveCard;
    constructor(card: AdaptiveCard, id?: string);
    setCard(card: AdaptiveCard): this;
    render(context: RenderContext): any;
    toJSON(): ActionShowCard;
}
export declare const createAction: {
    submit: (id?: string) => SubmitAction;
    openUrl: (url: string, id?: string) => OpenUrlAction;
    showCard: (card: AdaptiveCard, id?: string) => ShowCardAction;
};
//# sourceMappingURL=index.d.ts.map