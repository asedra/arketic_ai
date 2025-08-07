import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { AdaptiveCard, createDefaultRenderContext } from '@adaptive-cards/core';
import { AdaptiveCardParser } from '@adaptive-cards/parser';
import { createReactRenderers } from '../utils/renderers';
import { AdaptiveCardProvider } from './AdaptiveCardProvider';
import clsx from 'clsx';
export const AdaptiveCardRenderer = ({ card, hostConfig, className, style, theme = 'default', onAction, onInputChange, onError, validate = true, }) => {
    const adaptiveCard = useMemo(() => {
        try {
            if (card instanceof AdaptiveCard) {
                return card;
            }
            const parser = new AdaptiveCardParser();
            return parser.parse(card);
        }
        catch (error) {
            if (onError) {
                onError(error);
            }
            else {
                console.error('Failed to parse adaptive card:', error);
            }
            return null;
        }
    }, [card, onError]);
    const renderContext = useMemo(() => {
        const baseContext = createDefaultRenderContext(hostConfig);
        const reactRenderers = createReactRenderers({
            onAction,
            onInputChange,
            theme,
        });
        return {
            ...baseContext,
            elementRenderers: {
                ...baseContext.elementRenderers,
                ...reactRenderers.elementRenderers,
            },
            actionRenderers: {
                ...baseContext.actionRenderers,
                ...reactRenderers.actionRenderers,
            },
            theme,
        };
    }, [hostConfig, onAction, onInputChange, theme]);
    if (!adaptiveCard) {
        return (_jsx("div", { className: clsx('adaptive-card adaptive-card--error', className), style: style, children: _jsxs("div", { className: "adaptive-card__error-state", children: [_jsx("div", { className: "error-icon", style: { fontSize: '3rem', marginBottom: '1rem', animation: 'wiggle 2s ease-in-out infinite' }, children: "\uD83D\uDE05" }), _jsx("div", { className: "error-title", style: { fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: '#C53030' }, children: "Oops! Card got a bit tangled up" }), _jsx("div", { className: "error-description", style: { color: '#666', lineHeight: 1.6 }, children: "We couldn't parse this card. Maybe it's trying to be too fancy? Let's give it another shot!" })] }) }));
    }
    if (validate) {
        const validation = adaptiveCard.validate();
        if (!validation.isValid) {
            const error = new Error(`Invalid card: ${validation.errors[0]?.message}`);
            if (onError) {
                onError(error);
            }
            else {
                console.error('Card validation failed:', validation.errors);
            }
            return (_jsx("div", { className: clsx('adaptive-card adaptive-card--error', className), style: style, children: _jsxs("div", { className: "adaptive-card__error-state", children: [_jsx("div", { className: "error-icon", style: { fontSize: '3rem', marginBottom: '1rem', animation: 'shake 0.5s ease-in-out' }, children: "\uD83D\uDD27" }), _jsx("div", { className: "error-title", style: { fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: '#C53030' }, children: "Card needs some fine-tuning" }), _jsx("div", { className: "error-description", style: { color: '#666', lineHeight: 1.6, marginBottom: '1rem' }, children: validation.errors[0]?.message || 'Something in this card structure needs attention.' }), _jsx("div", { className: "error-suggestion", style: { fontSize: '0.875rem', color: '#0078D4', fontStyle: 'italic' }, children: "\uD83D\uDCA1 Tip: Check the card schema and try again!" })] }) }));
        }
    }
    try {
        const rendered = adaptiveCard.render(renderContext);
        return (_jsx(AdaptiveCardProvider, { card: adaptiveCard, context: renderContext, children: _jsxs("div", { className: clsx('adaptive-card', `adaptive-card--theme-${theme}`, className), style: {
                    ...style,
                    animation: 'fadeInUp 0.8s ease-out',
                }, children: [_jsx("div", { className: "adaptive-card__body", children: rendered.elements }), rendered.actions && rendered.actions.length > 0 && (_jsx("div", { className: "adaptive-card__actions", children: rendered.actions }))] }) }));
    }
    catch (error) {
        if (onError) {
            onError(error);
        }
        else {
            console.error('Failed to render adaptive card:', error);
        }
        return (_jsx("div", { className: clsx('adaptive-card adaptive-card--error', className), style: style, children: _jsxs("div", { className: "adaptive-card__error-state", children: [_jsx("div", { className: "error-icon", style: { fontSize: '3rem', marginBottom: '1rem', animation: 'float 2s ease-in-out infinite' }, children: "\uD83C\uDFAD" }), _jsx("div", { className: "error-title", style: { fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: '#C53030' }, children: "The card is feeling a bit shy" }), _jsx("div", { className: "error-description", style: { color: '#666', lineHeight: 1.6, marginBottom: '1rem' }, children: "A rendering hiccup occurred while bringing this card to life. Don't worry, it happens to the best of us!" }), _jsx("div", { className: "error-suggestion", style: { fontSize: '0.875rem', color: '#0078D4', fontStyle: 'italic' }, children: "\uD83D\uDD04 Try refreshing or check the console for more details" })] }) }));
    }
};
//# sourceMappingURL=AdaptiveCardRenderer.js.map