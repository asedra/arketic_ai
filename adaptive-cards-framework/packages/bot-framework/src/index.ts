import {
  Activity,
  ActivityTypes,
  Attachment,
  CardAction,
  MessageFactory,
  TurnContext,
} from 'botbuilder-core';
import { AdaptiveCard, Action, ActionSubmit } from '@adaptive-cards/core';
import { AdaptiveCardParser } from '@adaptive-cards/parser';

export interface BotFrameworkAdapterOptions {
  enableSubmitActionHandling?: boolean;
  customActionHandlers?: Record<string, (action: Action, context: TurnContext) => Promise<void>>;
}

/**
 * Bot Framework adapter for Adaptive Cards
 */
export class BotFrameworkAdapter {
  private parser: AdaptiveCardParser;
  private options: BotFrameworkAdapterOptions;

  constructor(options: BotFrameworkAdapterOptions = {}) {
    this.parser = new AdaptiveCardParser();
    this.options = {
      enableSubmitActionHandling: true,
      ...options,
    };
  }

  /**
   * Create a Bot Framework attachment from an Adaptive Card
   */
  createAttachment(card: AdaptiveCard | string | object): Attachment {
    let adaptiveCard: AdaptiveCard;

    if (card instanceof AdaptiveCard) {
      adaptiveCard = card;
    } else {
      adaptiveCard = this.parser.parse(card);
    }

    // Validate the card
    const validation = adaptiveCard.validate();
    if (!validation.isValid) {
      throw new Error(`Invalid Adaptive Card: ${validation.errors[0]?.message}`);
    }

    return {
      contentType: 'application/vnd.microsoft.card.adaptive',
      content: adaptiveCard.toJSON(),
    };
  }

  /**
   * Create a Bot Framework activity with an Adaptive Card
   */
  createActivity(card: AdaptiveCard | string | object, text?: string): Partial<Activity> {
    const attachment = this.createAttachment(card);
    
    return MessageFactory.attachment(attachment, text);
  }

  /**
   * Send an Adaptive Card as a message
   */
  async sendCard(context: TurnContext, card: AdaptiveCard | string | object, text?: string): Promise<void> {
    const activity = this.createActivity(card, text);
    await context.sendActivity(activity);
  }

  /**
   * Handle incoming activity and process Adaptive Card actions
   */
  async handleActivity(context: TurnContext, next: () => Promise<void>): Promise<void> {
    const activity = context.activity;

    // Check if this is a submit action from an Adaptive Card
    if (activity.type === ActivityTypes.Message && activity.value) {
      const isAdaptiveCardSubmit = this.isAdaptiveCardSubmit(activity);
      
      if (isAdaptiveCardSubmit) {
        await this.handleSubmitAction(context, activity.value);
        return;
      }
    }

    // Continue with the next middleware
    await next();
  }

  /**
   * Check if the activity is an Adaptive Card submit action
   */
  private isAdaptiveCardSubmit(activity: Activity): boolean {
    return !!(
      activity.value && 
      typeof activity.value === 'object' &&
      (activity.channelData?.postback === true || activity.name === 'adaptiveCard/action')
    );
  }

  /**
   * Handle Adaptive Card submit actions
   */
  private async handleSubmitAction(context: TurnContext, submitData: any): Promise<void> {
    if (!this.options.enableSubmitActionHandling) {
      return;
    }

    // Create a mock submit action for processing
    const submitAction: ActionSubmit = {
      type: 'Action.Submit',
      data: submitData,
    };

    // Check for custom action handlers
    const handler = this.options.customActionHandlers?.[submitAction.type];
    if (handler) {
      await handler(submitAction, context);
      return;
    }

    // Default submit action handling
    await this.handleDefaultSubmitAction(context, submitData);
  }

  /**
   * Default submit action handler
   */
  private async handleDefaultSubmitAction(context: TurnContext, submitData: any): Promise<void> {
    // Echo back the submitted data (for demo purposes)
    const responseText = `Received data: ${JSON.stringify(submitData, null, 2)}`;
    await context.sendActivity(MessageFactory.text(responseText));
  }

  /**
   * Create a card action from an Adaptive Card action
   */
  createCardAction(action: Action): CardAction {
    const cardAction: CardAction = {
      type: this.mapActionType(action.type),
      title: action.title || '',
      value: action,
    };

    if (action.type === 'Action.OpenUrl') {
      cardAction.value = (action as any).url;
    }

    return cardAction;
  }

  /**
   * Map Adaptive Card action types to Bot Framework action types
   */
  private mapActionType(adaptiveActionType: string): string {
    switch (adaptiveActionType) {
      case 'Action.Submit':
        return 'postBack';
      case 'Action.OpenUrl':
        return 'openUrl';
      case 'Action.ShowCard':
        return 'showCard';
      default:
        return 'postBack';
    }
  }

  /**
   * Extract input values from Adaptive Card submit data
   */
  extractInputValues(submitData: any): Record<string, any> {
    if (!submitData || typeof submitData !== 'object') {
      return {};
    }

    // Remove action-specific properties and return only input values
    const { action, ...inputValues } = submitData;
    return inputValues;
  }

  /**
   * Create a suggested actions reply from Adaptive Card actions
   */
  createSuggestedActions(actions: Action[]): CardAction[] {
    return actions.map(action => this.createCardAction(action));
  }
}

/**
 * Middleware class for Bot Framework integration
 */
export class AdaptiveCardMiddleware {
  private adapter: BotFrameworkAdapter;

  constructor(options?: BotFrameworkAdapterOptions) {
    this.adapter = new BotFrameworkAdapter(options);
  }

  /**
   * Middleware function to handle Adaptive Card activities
   */
  async onTurn(context: TurnContext, next: () => Promise<void>): Promise<void> {
    await this.adapter.handleActivity(context, next);
  }

  /**
   * Get the adapter instance
   */
  getAdapter(): BotFrameworkAdapter {
    return this.adapter;
  }
}

/**
 * Helper functions for common Bot Framework scenarios
 */
export class BotFrameworkHelpers {
  private static adapter = new BotFrameworkAdapter();

  /**
   * Create a welcome card
   */
  static createWelcomeCard(title: string, subtitle?: string, actions?: Action[]): Attachment {
    const card = new AdaptiveCard();
    
    card.addElement({
      type: 'TextBlock',
      text: title,
      size: 'large',
      weight: 'bolder',
    });

    if (subtitle) {
      card.addElement({
        type: 'TextBlock',
        text: subtitle,
        wrap: true,
      });
    }

    if (actions) {
      card.addActions(actions);
    }

    return BotFrameworkHelpers.adapter.createAttachment(card);
  }

  /**
   * Create a form card with inputs
   */
  static createFormCard(
    title: string,
    inputs: Array<{ id: string; label: string; placeholder?: string; required?: boolean }>,
    submitButtonText: string = 'Submit'
  ): Attachment {
    const card = new AdaptiveCard();

    card.addElement({
      type: 'TextBlock',
      text: title,
      size: 'large',
      weight: 'bolder',
    });

    // Add inputs
    inputs.forEach(input => {
      card.addElement({
        type: 'Input.Text',
        id: input.id,
        label: input.label,
        placeholder: input.placeholder || '',
        isRequired: input.required || false,
      });
    });

    // Add submit action
    card.addAction({
      type: 'Action.Submit',
      title: submitButtonText,
    });

    return BotFrameworkHelpers.adapter.createAttachment(card);
  }

  /**
   * Create a confirmation card
   */
  static createConfirmationCard(
    message: string,
    confirmText: string = 'Yes',
    cancelText: string = 'No'
  ): Attachment {
    const card = new AdaptiveCard();

    card.addElement({
      type: 'TextBlock',
      text: message,
      wrap: true,
    });

    card.addActions([
      {
        type: 'Action.Submit',
        title: confirmText,
        data: { action: 'confirm', value: true },
      },
      {
        type: 'Action.Submit',
        title: cancelText,
        data: { action: 'confirm', value: false },
      },
    ]);

    return BotFrameworkHelpers.adapter.createAttachment(card);
  }

  /**
   * Create an error card
   */
  static createErrorCard(title: string, message: string): Attachment {
    const card = new AdaptiveCard();

    card.addElement({
      type: 'TextBlock',
      text: title,
      size: 'medium',
      weight: 'bolder',
      color: 'attention',
    });

    card.addElement({
      type: 'TextBlock',
      text: message,
      wrap: true,
    });

    return BotFrameworkHelpers.adapter.createAttachment(card);
  }
}

// Export the main classes and types
export { BotFrameworkAdapter, AdaptiveCardMiddleware, BotFrameworkHelpers };
export type { BotFrameworkAdapterOptions };