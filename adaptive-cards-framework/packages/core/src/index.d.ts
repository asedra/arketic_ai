export * from './types';
export * from './elements';
export * from './actions';
export * from './utils';
import { AdaptiveCard as IAdaptiveCard, CardElement, Action, RenderContext } from './types';
export declare class AdaptiveCard implements IAdaptiveCard {
    type: "AdaptiveCard";
    version: string;
    body: CardElement[];
    actions?: Action[];
    metadata?: any;
    $schema?: string;
    constructor(version?: string);
    addElement(element: CardElement): this;
    addElements(elements: CardElement[]): this;
    addAction(action: Action): this;
    addActions(actions: Action[]): this;
    setVersion(version: string): this;
    setSchema(schema: string): this;
    setMetadata(metadata: any): this;
    validate(): import("./types").ValidationResult;
    render(context: RenderContext): any;
    toJSON(): IAdaptiveCard;
    toString(): string;
    static fromJSON(json: string | object): AdaptiveCard;
}
//# sourceMappingURL=index.d.ts.map