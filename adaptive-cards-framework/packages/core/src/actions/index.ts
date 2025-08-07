import { v4 as uuidv4 } from 'uuid';
import {
  Action,
  ActionSubmit,
  ActionOpenUrl,
  ActionShowCard,
  AdaptiveCard,
  RenderContext,
} from '../types';

// Base Action Class
export abstract class BaseAction {
  public id: string;
  public type: string;
  public title?: string;
  public iconUrl?: string;
  public style?: 'default' | 'positive' | 'destructive';
  public fallback?: Action | 'drop';
  public tooltip?: string;
  public isEnabled: boolean = true;
  public mode?: 'primary' | 'secondary';
  public requires?: Record<string, string>;

  constructor(type: string, id?: string) {
    this.type = type;
    this.id = id || uuidv4();
  }

  abstract render(context: RenderContext): any;
  abstract toJSON(): Action;

  setTitle(title: string): this {
    this.title = title;
    return this;
  }

  setStyle(style: 'default' | 'positive' | 'destructive'): this {
    this.style = style;
    return this;
  }

  setEnabled(isEnabled: boolean): this {
    this.isEnabled = isEnabled;
    return this;
  }

  setTooltip(tooltip: string): this {
    this.tooltip = tooltip;
    return this;
  }
}

// Submit Action
export class SubmitAction extends BaseAction implements ActionSubmit {
  public type = 'Action.Submit' as const;
  public data?: any;
  public associatedInputs?: 'auto' | 'none';

  constructor(id?: string) {
    super('Action.Submit', id);
  }

  setData(data: any): this {
    this.data = data;
    return this;
  }

  setAssociatedInputs(associatedInputs: 'auto' | 'none'): this {
    this.associatedInputs = associatedInputs;
    return this;
  }

  render(context: RenderContext): any {
    const renderer = context.actionRenderers[this.type];
    return renderer ? renderer(this, context) : null;
  }

  toJSON(): ActionSubmit {
    return {
      type: this.type,
      id: this.id,
      ...(this.title && { title: this.title }),
      ...(this.iconUrl && { iconUrl: this.iconUrl }),
      ...(this.style && { style: this.style }),
      ...(this.fallback && { fallback: this.fallback }),
      ...(this.tooltip && { tooltip: this.tooltip }),
      ...(this.isEnabled !== undefined && { isEnabled: this.isEnabled }),
      ...(this.mode && { mode: this.mode }),
      ...(this.requires && { requires: this.requires }),
      ...(this.data && { data: this.data }),
      ...(this.associatedInputs && { associatedInputs: this.associatedInputs }),
    };
  }
}

// OpenUrl Action
export class OpenUrlAction extends BaseAction implements ActionOpenUrl {
  public type = 'Action.OpenUrl' as const;
  public url: string;

  constructor(url: string, id?: string) {
    super('Action.OpenUrl', id);
    this.url = url;
  }

  setUrl(url: string): this {
    this.url = url;
    return this;
  }

  render(context: RenderContext): any {
    const renderer = context.actionRenderers[this.type];
    return renderer ? renderer(this, context) : null;
  }

  toJSON(): ActionOpenUrl {
    return {
      type: this.type,
      id: this.id,
      url: this.url,
      ...(this.title && { title: this.title }),
      ...(this.iconUrl && { iconUrl: this.iconUrl }),
      ...(this.style && { style: this.style }),
      ...(this.fallback && { fallback: this.fallback }),
      ...(this.tooltip && { tooltip: this.tooltip }),
      ...(this.isEnabled !== undefined && { isEnabled: this.isEnabled }),
      ...(this.mode && { mode: this.mode }),
      ...(this.requires && { requires: this.requires }),
    };
  }
}

// ShowCard Action
export class ShowCardAction extends BaseAction implements ActionShowCard {
  public type = 'Action.ShowCard' as const;
  public card: AdaptiveCard;

  constructor(card: AdaptiveCard, id?: string) {
    super('Action.ShowCard', id);
    this.card = card;
  }

  setCard(card: AdaptiveCard): this {
    this.card = card;
    return this;
  }

  render(context: RenderContext): any {
    const renderer = context.actionRenderers[this.type];
    return renderer ? renderer(this, context) : null;
  }

  toJSON(): ActionShowCard {
    return {
      type: this.type,
      id: this.id,
      card: this.card,
      ...(this.title && { title: this.title }),
      ...(this.iconUrl && { iconUrl: this.iconUrl }),
      ...(this.style && { style: this.style }),
      ...(this.fallback && { fallback: this.fallback }),
      ...(this.tooltip && { tooltip: this.tooltip }),
      ...(this.isEnabled !== undefined && { isEnabled: this.isEnabled }),
      ...(this.mode && { mode: this.mode }),
      ...(this.requires && { requires: this.requires }),
    };
  }
}

// Factory functions for easier action creation
export const createAction = {
  submit: (id?: string) => new SubmitAction(id),
  openUrl: (url: string, id?: string) => new OpenUrlAction(url, id),
  showCard: (card: AdaptiveCard, id?: string) => new ShowCardAction(card, id),
};

// Classes are already exported above