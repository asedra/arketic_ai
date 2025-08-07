import { AdaptiveCard, ValidationResult, HostConfig, RenderContext } from '../types';
export declare const defaultHostConfig: HostConfig;
export declare class CardValidator {
    static validate(card: AdaptiveCard): ValidationResult;
    private static validateElement;
    private static validateAction;
}
export declare class CardParser {
    static parse(cardJson: string | object): AdaptiveCard;
    static stringify(card: AdaptiveCard): string;
}
export declare function createDefaultRenderContext(hostConfig?: Partial<HostConfig>): RenderContext;
export declare function mergeHostConfig(base: HostConfig, override: Partial<HostConfig>): HostConfig;
export declare function getSpacingValue(spacing: string | undefined, hostConfig: HostConfig): number;
export declare function getFontSize(size: string | undefined, hostConfig: HostConfig): number;
export declare function getFontWeight(weight: string | undefined, hostConfig: HostConfig): number;
export declare const sampleCards: {
    simple: {
        type: string;
        version: string;
        body: {
            type: string;
            text: string;
            size: string;
            weight: string;
        }[];
    };
    complex: {
        type: string;
        version: string;
        body: {
            type: string;
            items: ({
                type: string;
                text: string;
                size: string;
                weight: string;
                horizontalAlignment: string;
                url?: undefined;
                altText?: undefined;
                wrap?: undefined;
                id?: undefined;
                placeholder?: undefined;
                isMultiline?: undefined;
            } | {
                type: string;
                url: string;
                altText: string;
                size: string;
                horizontalAlignment: string;
                text?: undefined;
                weight?: undefined;
                wrap?: undefined;
                id?: undefined;
                placeholder?: undefined;
                isMultiline?: undefined;
            } | {
                type: string;
                text: string;
                wrap: boolean;
                size?: undefined;
                weight?: undefined;
                horizontalAlignment?: undefined;
                url?: undefined;
                altText?: undefined;
                id?: undefined;
                placeholder?: undefined;
                isMultiline?: undefined;
            } | {
                type: string;
                id: string;
                placeholder: string;
                isMultiline: boolean;
                text?: undefined;
                size?: undefined;
                weight?: undefined;
                horizontalAlignment?: undefined;
                url?: undefined;
                altText?: undefined;
                wrap?: undefined;
            })[];
        }[];
        actions: ({
            type: string;
            title: string;
            data: {
                action: string;
            };
            url?: undefined;
        } | {
            type: string;
            title: string;
            url: string;
            data?: undefined;
        })[];
    };
};
//# sourceMappingURL=index.d.ts.map