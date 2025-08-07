// Export main components
export { AdaptiveCardRenderer } from './components/AdaptiveCardRenderer';
export type { AdaptiveCardRendererProps } from './components/AdaptiveCardRenderer';

export { AdaptiveCardProvider, useAdaptiveCard } from './components/AdaptiveCardProvider';
export type { AdaptiveCardProviderProps, AdaptiveCardContextValue } from './components/AdaptiveCardProvider';

// Export element components
export { TextBlock } from './components/elements/TextBlock';
export { Image } from './components/elements/Image';
export { Container } from './components/elements/Container';
export { InputText } from './components/elements/InputText';
export { ActionSet } from './components/elements/ActionSet';

// Export action components
export { SubmitAction } from './components/actions/SubmitAction';
export { OpenUrlAction } from './components/actions/OpenUrlAction';

// Export utilities
export { createReactRenderers, renderElement, renderAction, defaultStyles } from './utils/renderers';
export type { RendererOptions } from './utils/renderers';

// Re-export core types for convenience
export type {
  AdaptiveCard,
  CardElement,
  Action,
  TextBlock as ITextBlock,
  Image as IImage,
  Container as IContainer,
  InputText as IInputText,
  ActionSet as IActionSet,
  ActionSubmit,
  ActionOpenUrl,
  ActionShowCard,
  RenderContext,
  HostConfig,
} from '@adaptive-cards/core';