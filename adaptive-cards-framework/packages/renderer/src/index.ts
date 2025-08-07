import {
  AdaptiveCard,
  CardElement,
  Action,
  RenderContext,
  createDefaultRenderContext,
  TextBlock,
  Image,
  Container,
  InputText,
  ActionSet,
  ActionSubmit,
  ActionOpenUrl,
  ActionShowCard,
  getSpacingValue,
  getFontSize,
  getFontWeight,
} from '@adaptive-cards/core';

export interface HtmlRendererOptions {
  hostConfig?: any;
  theme?: string;
  includeStyles?: boolean;
  customStyles?: string;
  onAction?: (action: any, data?: any) => void;
  onInputChange?: (inputId: string, value: any) => void;
}

export class HtmlRenderer {
  private context: RenderContext;
  private options: HtmlRendererOptions;
  private inputValues: Record<string, any> = {};

  constructor(options: HtmlRendererOptions = {}) {
    this.options = options;
    this.context = createDefaultRenderContext(options.hostConfig);
    this.setupRenderers();
  }

  private setupRenderers(): void {
    // Element renderers
    this.context.elementRenderers = {
      TextBlock: (element: CardElement) => this.renderTextBlock(element as TextBlock),
      Image: (element: CardElement) => this.renderImage(element as Image),
      Container: (element: CardElement) => this.renderContainer(element as Container), 
      'Input.Text': (element: CardElement) => this.renderInputText(element as InputText),
      ActionSet: (element: CardElement) => this.renderActionSet(element as ActionSet),
    };

    // Action renderers
    this.context.actionRenderers = {
      'Action.Submit': (action: Action) => this.renderSubmitAction(action as ActionSubmit),
      'Action.OpenUrl': (action: Action) => this.renderOpenUrlAction(action as ActionOpenUrl),
      'Action.ShowCard': (action: Action) => this.renderShowCardAction(action as ActionShowCard),
    };
  }

  render(card: AdaptiveCard): string {
    const validation = card.validate();
    if (!validation.isValid) {
      return this.renderError(`Invalid card: ${validation.errors[0]?.message}`);
    }

    const bodyHtml = card.body.map(element => this.renderElement(element)).join('');
    const actionsHtml = card.actions && card.actions.length > 0 
      ? `<div class=\"adaptive-card__actions\">${card.actions.map(action => this.renderAction(action)).join('')}</div>`
      : '';

    const styles = this.options.includeStyles !== false ? this.getStyles() : '';
    const theme = this.options.theme || 'default';

    return `
      ${styles}
      <div class=\"adaptive-card adaptive-card--theme-${theme}\" data-card-version=\"${card.version}\">
        <div class=\"adaptive-card__body\">
          ${bodyHtml}
        </div>
        ${actionsHtml}
      </div>
    `;
  }

  private renderElement(element: CardElement): string {
    const renderer = this.context.elementRenderers[element.type];
    if (!renderer) {
      return `<div class=\"adaptive-card__unsupported\">Unsupported element: ${element.type}</div>`;
    }
    return renderer(element, this.context) as string;
  }

  private renderAction(action: Action): string {
    const renderer = this.context.actionRenderers[action.type];
    if (!renderer) {
      return `<button class=\"adaptive-card__action adaptive-card__action--unsupported\">Unsupported action: ${action.type}</button>`;
    }
    return renderer(action, this.context) as string;
  }

  private renderTextBlock(element: TextBlock): string {
    const {
      text,
      color = 'default',
      size = 'default',
      weight = 'default',
      horizontalAlignment = 'left',
      wrap = false,
      isSubtle = false,
      maxLines,
    } = element;

    const fontSize = getFontSize(size, this.context.hostConfig);
    const fontWeight = getFontWeight(weight, this.context.hostConfig);
    const spacing = getSpacingValue(element.spacing, this.context.hostConfig);

    const styles = [
      `font-size: ${fontSize}px`,
      `font-weight: ${fontWeight}`,
      `text-align: ${horizontalAlignment}`,
      `font-family: ${this.context.hostConfig.fontFamily}`,
      `white-space: ${wrap ? 'pre-wrap' : 'nowrap'}`,
      `overflow: ${wrap ? 'visible' : 'hidden'}`,
      `text-overflow: ${wrap ? 'clip' : 'ellipsis'}`,
      `opacity: ${isSubtle ? '0.7' : '1'}`,
      spacing > 0 ? `margin-top: ${spacing}px` : '',
      maxLines ? `display: -webkit-box; -webkit-line-clamp: ${maxLines}; -webkit-box-orient: vertical; overflow: hidden` : '',
    ].filter(Boolean).join('; ');

    const classes = [
      'adaptive-card__text-block',
      `adaptive-card__text-block--${color}`,
      `adaptive-card__text-block--${size}`,
      `adaptive-card__text-block--${weight}`,
      isSubtle ? 'adaptive-card__text-block--subtle' : '',
      wrap ? 'adaptive-card__text-block--wrap' : '',
    ].filter(Boolean).join(' ');

    return `<div class=\"${classes}\" style=\"${styles}\">${this.escapeHtml(text)}</div>`;
  }

  private renderImage(element: Image): string {
    const {
      url,
      altText = '',
      size = 'auto',
      style: imageStyle = 'default',
      horizontalAlignment = 'left',
      backgroundColor,
      width,
      height,
      selectAction,
    } = element;

    const spacing = getSpacingValue(element.spacing, this.context.hostConfig);

    let imageStyles = [
      'max-width: 100%',
      'height: auto',
      selectAction ? 'cursor: pointer' : '',
      imageStyle === 'person' ? 'border-radius: 50%; object-fit: cover' : '',
    ].filter(Boolean);

    // Size-specific styles
    switch (size) {
      case 'small':
        imageStyles.push('max-width: 40px', 'max-height: 40px');
        break;
      case 'medium':
        imageStyles.push('max-width: 80px', 'max-height: 80px');
        break;
      case 'large':
        imageStyles.push('max-width: 160px', 'max-height: 160px');
        break;
      case 'stretch':
        imageStyles.push('width: 100%');
        break;
    }

    if (width) imageStyles.push(`width: ${width}`);
    if (height) imageStyles.push(`height: ${height}`);

    const containerStyles = [
      `display: flex`,
      `justify-content: ${horizontalAlignment === 'center' ? 'center' : horizontalAlignment === 'right' ? 'flex-end' : 'flex-start'}`,
      backgroundColor ? `background-color: ${backgroundColor}` : '',
      spacing > 0 ? `margin-top: ${spacing}px` : '',
    ].filter(Boolean).join('; ');

    const classes = [
      'adaptive-card__image',
      `adaptive-card__image--${size}`,
      `adaptive-card__image--${imageStyle}`,
      `adaptive-card__image--align-${horizontalAlignment}`,
      selectAction ? 'adaptive-card__image--clickable' : '',
    ].filter(Boolean).join(' ');

    const imageHtml = `<img src=\"${this.escapeHtml(url)}\" alt=\"${this.escapeHtml(altText)}\" style=\"${imageStyles.join('; ')}\" />`;
    const clickHandler = selectAction ? ` onclick=\"${this.generateActionHandler(selectAction)}\"` : '';

    return `<div class=\"${classes}\" style=\"${containerStyles}\"${clickHandler}>${imageHtml}</div>`;
  }

  private renderContainer(element: Container): string {
    const {
      items,
      style: containerStyle = 'default',
      verticalContentAlignment = 'top',
      bleed = false,
      backgroundImage,
      minHeight,
      selectAction,
    } = element;

    const spacing = getSpacingValue(element.spacing, this.context.hostConfig);
    const itemsHtml = items.map(item => this.renderElement(item)).join('');

    const styles = [
      'display: flex',
      'flex-direction: column',
      'align-items: stretch',
      `justify-content: ${verticalContentAlignment === 'center' ? 'center' : verticalContentAlignment === 'bottom' ? 'flex-end' : 'flex-start'}`,
      selectAction ? 'cursor: pointer' : '',
      minHeight ? `min-height: ${minHeight}` : '',
      spacing > 0 ? `margin-top: ${spacing}px` : '',
      bleed ? 'margin: 0 -15px' : '',
    ].filter(Boolean);

    // Apply background image
    if (backgroundImage) {
      styles.push(`background-image: url(${backgroundImage.url})`);
      styles.push('background-size: cover', 'background-position: center', 'background-repeat: no-repeat');
      
      if (backgroundImage.fillMode) {
        switch (backgroundImage.fillMode) {
          case 'cover':
            styles.push('background-size: cover');
            break;
          case 'repeatHorizontally':
            styles.push('background-repeat: repeat-x', 'background-size: auto');
            break;
          case 'repeatVertically':
            styles.push('background-repeat: repeat-y', 'background-size: auto');
            break;
          case 'repeat':
            styles.push('background-repeat: repeat', 'background-size: auto');
            break;
        }
      }
    }

    const classes = [
      'adaptive-card__container',
      `adaptive-card__container--${containerStyle}`,
      `adaptive-card__container--align-${verticalContentAlignment}`,
      bleed ? 'adaptive-card__container--bleed' : '',
      selectAction ? 'adaptive-card__container--clickable' : '',
      backgroundImage ? 'adaptive-card__container--has-background' : '',
    ].filter(Boolean).join(' ');

    const clickHandler = selectAction ? ` onclick=\"${this.generateActionHandler(selectAction)}\"` : '';

    return `<div class=\"${classes}\" style=\"${styles.join('; ')}\"${clickHandler}>${itemsHtml}</div>`;
  }

  private renderInputText(element: InputText): string {
    const {
      id,
      placeholder = '',
      value = '',
      maxLength,
      isMultiline = false,
      style: inputStyle = 'text',
      label,
      isRequired = false,
      errorMessage,
    } = element;

    const spacing = getSpacingValue(element.spacing, this.context.hostConfig);

    const inputType = inputStyle === 'password' ? 'password' 
      : inputStyle === 'email' ? 'email'
      : inputStyle === 'tel' ? 'tel'
      : inputStyle === 'url' ? 'url'
      : 'text';

    const inputStyles = [
      'width: 100%',
      'padding: 8px 12px',
      'border: 1px solid #CCCCCC',
      'border-radius: 4px',
      'font-size: 14px',
      'font-family: inherit',
      'outline: none',
      'transition: border-color 0.2s ease',
    ].join('; ');

    const containerStyles = spacing > 0 ? `margin-top: ${spacing}px` : '';

    const labelHtml = label ? `
      <label for=\"${id}\" class=\"adaptive-card__input-label\">
        ${this.escapeHtml(label)}
        ${isRequired ? '<span class=\"adaptive-card__required-indicator\">*</span>' : ''}
      </label>
    ` : '';

    const inputHtml = isMultiline ? `
      <textarea
        id=\"${id}\"
        placeholder=\"${this.escapeHtml(placeholder)}\"
        style=\"${inputStyles}; min-height: 80px; resize: vertical\"
        class=\"adaptive-card__input adaptive-card__input--text adaptive-card__input--multiline\"
        ${maxLength ? `maxlength=\"${maxLength}\"` : ''}
        ${isRequired ? 'required' : ''}
        onchange=\"${this.generateInputChangeHandler(id)}\"
      >${this.escapeHtml(value)}</textarea>
    ` : `
      <input
        type=\"${inputType}\"
        id=\"${id}\"
        placeholder=\"${this.escapeHtml(placeholder)}\"
        value=\"${this.escapeHtml(value)}\"
        style=\"${inputStyles}\"
        class=\"adaptive-card__input adaptive-card__input--text\"
        ${maxLength ? `maxlength=\"${maxLength}\"` : ''}
        ${isRequired ? 'required' : ''}
        onchange=\"${this.generateInputChangeHandler(id)}\"
      />
    `;

    return `
      <div class=\"adaptive-card__input-container\" style=\"${containerStyles}\">
        ${labelHtml}
        ${inputHtml}
        ${isRequired && errorMessage ? `<div class=\"adaptive-card__input-error\">${this.escapeHtml(errorMessage)}</div>` : ''}
      </div>
    `;
  }

  private renderActionSet(element: ActionSet): string {
    const { actions } = element;
    const spacing = getSpacingValue(element.spacing, this.context.hostConfig);

    if (!actions || actions.length === 0) {
      return '';
    }

    const actionsHtml = actions.map(action => this.renderAction(action)).join('');
    const styles = spacing > 0 ? `margin-top: ${spacing}px` : '';

    return `<div class=\"adaptive-card__action-set\" style=\"${styles}\">${actionsHtml}</div>`;
  }

  private renderSubmitAction(action: ActionSubmit): string {
    const {
      title = 'Submit',
      style: actionStyle = 'default',
      isEnabled = true,
      tooltip,
      iconUrl,
      data,
    } = action;

    return this.renderActionButton({
      title,
      style: actionStyle,
      isEnabled,
      tooltip,
      iconUrl,
      type: 'submit',
      onclick: this.generateSubmitActionHandler(action, data),
    });
  }

  private renderOpenUrlAction(action: ActionOpenUrl): string {
    const {
      title = 'Open Link',
      url,
      style: actionStyle = 'default',
      isEnabled = true,
      tooltip,
      iconUrl,
    } = action;

    return this.renderActionButton({
      title,
      style: actionStyle,
      isEnabled,
      tooltip: tooltip || `Open ${url}`,
      iconUrl,
      type: 'openurl',
      onclick: this.generateOpenUrlActionHandler(action),
    });
  }

  private renderShowCardAction(action: ActionShowCard): string {
    const {
      title = 'Show Card',
      style: actionStyle = 'default',
      isEnabled = true,
      tooltip,
      iconUrl,
    } = action;

    return this.renderActionButton({
      title,
      style: actionStyle,
      isEnabled,
      tooltip,
      iconUrl,
      type: 'showcard',
      onclick: this.generateActionHandler(action),
    });
  }

  private renderActionButton(options: {
    title: string;
    style: string;
    isEnabled: boolean;
    tooltip?: string;
    iconUrl?: string;
    type: string;
    onclick: string;
  }): string {
    const { title, style, isEnabled, tooltip, iconUrl, type, onclick } = options;

    const buttonStyles = [
      'padding: 8px 16px',
      'border: none',
      'border-radius: 4px',
      'font-size: 14px',
      'font-weight: 500',
      `cursor: ${isEnabled ? 'pointer' : 'not-allowed'}`,
      `opacity: ${isEnabled ? '1' : '0.6'}`,
      'display: inline-flex',
      'align-items: center',
      'gap: 8px',
      'transition: all 0.2s ease',
      'text-decoration: none',
      'outline: none',
    ];

    // Apply style-specific colors
    switch (style) {
      case 'positive':
        buttonStyles.push('background-color: #0078D4', 'color: #FFFFFF');
        break;
      case 'destructive':
        buttonStyles.push('background-color: #D13438', 'color: #FFFFFF');
        break;
      default:
        buttonStyles.push('background-color: #F3F2F1', 'color: #323130', 'border: 1px solid #CCCCCC');
        break;
    }

    const classes = [
      'adaptive-card__action',
      `adaptive-card__action--${type}`,
      `adaptive-card__action--${style}`,
      !isEnabled ? 'adaptive-card__action--disabled' : '',
      iconUrl ? 'adaptive-card__action--has-icon' : '',
    ].filter(Boolean).join(' ');

    const iconHtml = iconUrl ? `<img src=\"${this.escapeHtml(iconUrl)}\" alt=\"\" class=\"adaptive-card__action-icon\" style=\"width: 16px; height: 16px; flex-shrink: 0\" />` : '';
    const externalIcon = type === 'openurl' ? '<svg width=\"12\" height=\"12\" viewBox=\"0 0 12 12\" fill=\"currentColor\" class=\"adaptive-card__external-link-icon\" style=\"flex-shrink: 0; margin-left: 4px\"><path d=\"M9 3V2H7V1h3v3H9zM8 4l2.5-2.5L9 0H6v1h1.5L5 3.5 6.5 5 9 2.5V4zM1 2v8h8V6H8v3H2V3h3V2H1z\" /></svg>' : '';

    return `
      <button
        type=\"button\"
        class=\"${classes}\"
        style=\"${buttonStyles.join('; ')}\"
        ${isEnabled ? `onclick=\"${onclick}\"` : 'disabled'}
        ${tooltip ? `title=\"${this.escapeHtml(tooltip)}\"` : ''}
      >
        ${iconHtml}
        <span class=\"adaptive-card__action-title\">${this.escapeHtml(title)}</span>
        ${externalIcon}
      </button>
    `;
  }

  private generateActionHandler(action: Action): string {
    return `window.adaptiveCardAction && window.adaptiveCardAction(${JSON.stringify(action)})`;
  }

  private generateSubmitActionHandler(action: ActionSubmit, data?: any): string {
    return `window.adaptiveCardSubmit && window.adaptiveCardSubmit(${JSON.stringify(action)}, ${JSON.stringify(data)})`;
  }

  private generateOpenUrlActionHandler(action: ActionOpenUrl): string {
    return `window.adaptiveCardOpenUrl && window.adaptiveCardOpenUrl(${JSON.stringify(action)}) || window.open('${action.url}', '_blank', 'noopener,noreferrer')`;
  }

  private generateInputChangeHandler(inputId: string): string {
    return `window.adaptiveCardInputChange && window.adaptiveCardInputChange('${inputId}', this.value)`;
  }

  private renderError(message: string): string {
    return `
      <div class=\"adaptive-card adaptive-card--error\">
        <div class=\"adaptive-card__error-message\">${this.escapeHtml(message)}</div>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private getStyles(): string {
    const defaultStyles = `
      <style>
        .adaptive-card {
          font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          max-width: 100%;
          background: #FFFFFF;
          border: 1px solid #E1E1E1;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .adaptive-card__body { padding: 16px; }
        .adaptive-card__actions {
          padding: 8px 16px 16px;
          border-top: 1px solid #E1E1E1;
          background: #F8F9FA;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .adaptive-card__text-block { margin: 0 0 8px 0; line-height: 1.4; }
        .adaptive-card__image { margin: 8px 0; }
        .adaptive-card__container { margin: 8px 0; }
        .adaptive-card__input-container { margin: 12px 0; }
        .adaptive-card__input { width: 100%; padding: 8px 12px; border: 1px solid #CCCCCC; border-radius: 4px; }
        .adaptive-card__action {
          padding: 8px 16px; border: none; border-radius: 4px; font-size: 14px;
          cursor: pointer; display: inline-flex; align-items: center; gap: 8px;
        }
        .adaptive-card--error { border-color: #D13438; background-color: #FDF2F2; }
        .adaptive-card__error-message { padding: 16px; color: #D13438; text-align: center; }
      </style>
    `;

    return this.options.customStyles ? defaultStyles + `<style>${this.options.customStyles}</style>` : defaultStyles;
  }
}

// Export singleton instance
export const htmlRenderer = new HtmlRenderer();

// Helper function
export function renderToHtml(card: AdaptiveCard, options?: HtmlRendererOptions): string {
  const renderer = new HtmlRenderer(options);
  return renderer.render(card);
}