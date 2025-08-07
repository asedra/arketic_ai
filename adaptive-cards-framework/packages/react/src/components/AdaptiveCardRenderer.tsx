import React, { useMemo } from 'react';
import { AdaptiveCard, RenderContext, createDefaultRenderContext } from '@adaptive-cards/core';
import { AdaptiveCardParser } from '@adaptive-cards/parser';
import { createReactRenderers } from '../utils/renderers';
import { AdaptiveCardProvider } from './AdaptiveCardProvider';
import clsx from 'clsx';

export interface AdaptiveCardRendererProps {
  /** The adaptive card to render - can be a JSON string, object, or AdaptiveCard instance */
  card: string | object | AdaptiveCard;
  /** Custom host configuration */
  hostConfig?: any;
  /** Custom CSS class name */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Theme name */
  theme?: string;
  /** Callback for action execution */
  onAction?: (action: any, data?: any) => void;
  /** Callback for input value changes */
  onInputChange?: (inputId: string, value: any) => void;
  /** Callback for validation errors */
  onError?: (error: Error) => void;
  /** Enable validation */
  validate?: boolean;
}

export const AdaptiveCardRenderer: React.FC<AdaptiveCardRendererProps> = ({
  card,
  hostConfig,
  className,
  style,
  theme = 'default',
  onAction,
  onInputChange,
  onError,
  validate = true,
}) => {
  const adaptiveCard = useMemo(() => {
    try {
      if (card instanceof AdaptiveCard) {
        return card;
      }
      
      const parser = new AdaptiveCardParser();
      return parser.parse(card);
    } catch (error) {
      if (onError) {
        onError(error as Error);
      } else {
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
    return (
      <div className={clsx('adaptive-card adaptive-card--error', className)} style={style}>
        <div className="adaptive-card__error-state">
          <div className="error-icon" style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'wiggle 2s ease-in-out infinite' }}>😅</div>
          <div className="error-title" style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: '#C53030' }}>
            Oops! Card got a bit tangled up
          </div>
          <div className="error-description" style={{ color: '#666', lineHeight: 1.6 }}>
            We couldn't parse this card. Maybe it's trying to be too fancy? Let's give it another shot!
          </div>
        </div>
      </div>
    );
  }

  if (validate) {
    const validation = adaptiveCard.validate();
    if (!validation.isValid) {
      const error = new Error(`Invalid card: ${validation.errors[0]?.message}`);
      if (onError) {
        onError(error);
      } else {
        console.error('Card validation failed:', validation.errors);
      }
      
      return (
        <div className={clsx('adaptive-card adaptive-card--error', className)} style={style}>
          <div className="adaptive-card__error-state">
            <div className="error-icon" style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'shake 0.5s ease-in-out' }}>🔧</div>
            <div className="error-title" style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: '#C53030' }}>
              Card needs some fine-tuning
            </div>
            <div className="error-description" style={{ color: '#666', lineHeight: 1.6, marginBottom: '1rem' }}>
              {validation.errors[0]?.message || 'Something in this card structure needs attention.'}
            </div>
            <div className="error-suggestion" style={{ fontSize: '0.875rem', color: '#0078D4', fontStyle: 'italic' }}>
              💡 Tip: Check the card schema and try again!
            </div>
          </div>
        </div>
      );
    }
  }

  try {
    const rendered = adaptiveCard.render(renderContext);
    
    return (
      <AdaptiveCardProvider card={adaptiveCard} context={renderContext}>
        <div 
          className={clsx('adaptive-card', `adaptive-card--theme-${theme}`, className)}
          style={{
            ...style,
            animation: 'fadeInUp 0.8s ease-out',
          }}
        >
          <div className="adaptive-card__body">
            {rendered.elements}
          </div>
          {rendered.actions && rendered.actions.length > 0 && (
            <div className="adaptive-card__actions">
              {rendered.actions}
            </div>
          )}
        </div>
      </AdaptiveCardProvider>
    );
  } catch (error) {
    if (onError) {
      onError(error as Error);
    } else {
      console.error('Failed to render adaptive card:', error);
    }
    
    return (
      <div className={clsx('adaptive-card adaptive-card--error', className)} style={style}>
        <div className="adaptive-card__error-state">
          <div className="error-icon" style={{ fontSize: '3rem', marginBottom: '1rem', animation: 'float 2s ease-in-out infinite' }}>🎭</div>
          <div className="error-title" style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', color: '#C53030' }}>
            The card is feeling a bit shy
          </div>
          <div className="error-description" style={{ color: '#666', lineHeight: 1.6, marginBottom: '1rem' }}>
            A rendering hiccup occurred while bringing this card to life. Don't worry, it happens to the best of us!
          </div>
          <div className="error-suggestion" style={{ fontSize: '0.875rem', color: '#0078D4', fontStyle: 'italic' }}>
            🔄 Try refreshing or check the console for more details
          </div>
        </div>
      </div>
    );
  }
};