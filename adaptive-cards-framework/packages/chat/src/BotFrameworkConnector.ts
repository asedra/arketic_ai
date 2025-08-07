import { TurnContext, ActivityHandler, MessageFactory, CardFactory, Activity } from 'botbuilder';
import { AdaptiveCard } from '@adaptive-cards/core';

/**
 * Bot Framework Connector for Adaptive Cards
 * Provides seamless integration with Microsoft Bot Framework
 */

export interface BotMessage {
  text?: string;
  card?: AdaptiveCard;
  suggestedActions?: string[];
  attachments?: any[];
  speak?: string;
  inputHint?: 'acceptingInput' | 'ignoringInput' | 'expectingInput';
}

export interface BotConfig {
  appId?: string;
  appPassword?: string;
  channelService?: string;
  openIdMetadata?: string;
}

export class AdaptiveCardBot extends ActivityHandler {
  private typingDelay: number = 1000;
  private conversationState: Map<string, any> = new Map();

  constructor() {
    super();

    // Handle incoming messages
    this.onMessage(async (context, next) => {
      await this.handleMessage(context);
      await next();
    });

    // Handle members added to conversation
    this.onMembersAdded(async (context, next) => {
      await this.sendWelcomeCard(context);
      await next();
    });
  }

  /**
   * Process incoming messages and respond with adaptive cards
   */
  private async handleMessage(context: TurnContext): Promise<void> {
    const text = context.activity.text?.toLowerCase() || '';
    
    // Show typing indicator
    await this.sendTypingIndicator(context);

    // Process different message types
    if (text.includes('help')) {
      await this.sendHelpCard(context);
    } else if (text.includes('form')) {
      await this.sendFormCard(context);
    } else if (text.includes('weather')) {
      await this.sendWeatherCard(context);
    } else if (text.includes('product')) {
      await this.sendProductCard(context);
    } else {
      await this.sendTextWithSuggestions(
        context,
        `I understand you said: "${context.activity.text}". How can I help you today?`,
        ['Show help', 'Fill a form', 'Check weather', 'View products']
      );
    }
  }

  /**
   * Send welcome card when user joins
   */
  private async sendWelcomeCard(context: TurnContext): Promise<void> {
    const welcomeCard: AdaptiveCard = {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: '🎉 Welcome to Adaptive Cards Bot!',
          size: 'Large',
          weight: 'Bolder',
          wrap: true,
        },
        {
          type: 'TextBlock',
          text: "I'm your friendly assistant powered by adaptive cards. I can help you with:",
          wrap: true,
        },
        {
          type: 'Container',
          items: [
            { type: 'TextBlock', text: '• 📝 Interactive forms', wrap: true },
            { type: 'TextBlock', text: '• 🌤️ Weather information', wrap: true },
            { type: 'TextBlock', text: '• 🛍️ Product catalogs', wrap: true },
            { type: 'TextBlock', text: '• 🎯 Custom workflows', wrap: true },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '🚀 Get Started',
          data: { action: 'getStarted' },
        },
        {
          type: 'Action.Submit',
          title: '📚 Show Examples',
          data: { action: 'showExamples' },
        },
      ],
    };

    await this.sendAdaptiveCard(context, welcomeCard, 'Welcome! I can help you with adaptive cards.');
  }

  /**
   * Send help card with available commands
   */
  private async sendHelpCard(context: TurnContext): Promise<void> {
    const helpCard: AdaptiveCard = {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: '💡 Help & Commands',
          size: 'Large',
          weight: 'Bolder',
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Say "form"', value: 'Fill out an interactive form' },
            { title: 'Say "weather"', value: 'Check weather information' },
            { title: 'Say "product"', value: 'Browse product catalog' },
            { title: 'Say "help"', value: 'Show this help menu' },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Try Form',
          data: { command: 'form' },
        },
        {
          type: 'Action.Submit',
          title: 'Check Weather',
          data: { command: 'weather' },
        },
      ],
    };

    await this.sendAdaptiveCard(context, helpCard, 'Here are the available commands:');
  }

  /**
   * Send interactive form card
   */
  private async sendFormCard(context: TurnContext): Promise<void> {
    const formCard: AdaptiveCard = {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: '📝 Quick Survey',
          size: 'Large',
          weight: 'Bolder',
        },
        {
          type: 'Input.Text',
          id: 'name',
          placeholder: 'Enter your name',
          label: 'Name',
          isRequired: true,
          errorMessage: 'Name is required',
        },
        {
          type: 'Input.Text',
          id: 'email',
          placeholder: 'your@email.com',
          label: 'Email',
          style: 'Email',
          isRequired: true,
          errorMessage: 'Valid email is required',
        },
        {
          type: 'Input.ChoiceSet',
          id: 'satisfaction',
          label: 'How satisfied are you?',
          choices: [
            { title: '😊 Very Satisfied', value: '5' },
            { title: '🙂 Satisfied', value: '4' },
            { title: '😐 Neutral', value: '3' },
            { title: '😕 Unsatisfied', value: '2' },
            { title: '😞 Very Unsatisfied', value: '1' },
          ],
          value: '4',
        },
        {
          type: 'Input.Text',
          id: 'comments',
          placeholder: 'Any additional comments?',
          label: 'Comments',
          isMultiline: true,
          maxLength: 500,
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '✅ Submit Survey',
          data: { action: 'submitSurvey' },
        },
        {
          type: 'Action.Submit',
          title: '❌ Cancel',
          data: { action: 'cancel' },
        },
      ],
    };

    await this.sendAdaptiveCard(context, formCard, 'Please fill out this quick survey:');
  }

  /**
   * Send weather card with animations
   */
  private async sendWeatherCard(context: TurnContext): Promise<void> {
    const weatherCard: AdaptiveCard = {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'ColumnSet',
          columns: [
            {
              type: 'Column',
              width: 'auto',
              items: [
                {
                  type: 'TextBlock',
                  text: '☀️',
                  size: 'ExtraLarge',
                },
              ],
            },
            {
              type: 'Column',
              width: 'stretch',
              items: [
                {
                  type: 'TextBlock',
                  text: 'San Francisco',
                  size: 'Large',
                  weight: 'Bolder',
                },
                {
                  type: 'TextBlock',
                  text: '72°F - Sunny',
                  size: 'Medium',
                },
              ],
            },
          ],
        },
        {
          type: 'FactSet',
          facts: [
            { title: '🌡️ Feels like', value: '70°F' },
            { title: '💧 Humidity', value: '45%' },
            { title: '💨 Wind', value: '12 mph' },
            { title: '👁️ Visibility', value: '10 miles' },
          ],
        },
        {
          type: 'TextBlock',
          text: '📅 5-Day Forecast',
          weight: 'Bolder',
          size: 'Medium',
          spacing: 'Large',
        },
        {
          type: 'ColumnSet',
          columns: [
            { type: 'Column', items: [{ type: 'TextBlock', text: 'Mon\n☀️\n73°' }], width: 'auto' },
            { type: 'Column', items: [{ type: 'TextBlock', text: 'Tue\n⛅\n71°' }], width: 'auto' },
            { type: 'Column', items: [{ type: 'TextBlock', text: 'Wed\n☁️\n68°' }], width: 'auto' },
            { type: 'Column', items: [{ type: 'TextBlock', text: 'Thu\n🌧️\n65°' }], width: 'auto' },
            { type: 'Column', items: [{ type: 'TextBlock', text: 'Fri\n☀️\n72°' }], width: 'auto' },
          ],
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '🔄 Refresh',
          data: { action: 'refresh', type: 'weather' },
        },
        {
          type: 'Action.OpenUrl',
          title: '📍 View Map',
          url: 'https://maps.google.com',
        },
      ],
    };

    await this.sendAdaptiveCard(context, weatherCard, "Here's the current weather:");
  }

  /**
   * Send product card with rich media
   */
  private async sendProductCard(context: TurnContext): Promise<void> {
    const productCard: AdaptiveCard = {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: '🛍️ Featured Product',
          size: 'Large',
          weight: 'Bolder',
        },
        {
          type: 'Image',
          url: 'https://via.placeholder.com/300x200',
          size: 'Stretch',
        },
        {
          type: 'TextBlock',
          text: 'Wireless Headphones Pro',
          size: 'Medium',
          weight: 'Bolder',
        },
        {
          type: 'TextBlock',
          text: '$299.99',
          size: 'Large',
          color: 'Accent',
          weight: 'Bolder',
        },
        {
          type: 'TextBlock',
          text: '⭐⭐⭐⭐⭐ (4.8/5 from 2,341 reviews)',
          wrap: true,
        },
        {
          type: 'TextBlock',
          text: 'Premium noise-canceling headphones with 30-hour battery life and superior sound quality.',
          wrap: true,
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '🛒 Add to Cart',
          style: 'positive',
          data: { action: 'addToCart', productId: '12345' },
        },
        {
          type: 'Action.Submit',
          title: '❤️ Save for Later',
          data: { action: 'saveForLater', productId: '12345' },
        },
        {
          type: 'Action.OpenUrl',
          title: '📖 View Details',
          url: 'https://example.com/product/12345',
        },
      ],
    };

    await this.sendAdaptiveCard(context, productCard, 'Check out this featured product:');
  }

  /**
   * Send adaptive card with fallback text
   */
  private async sendAdaptiveCard(
    context: TurnContext,
    card: AdaptiveCard,
    fallbackText: string
  ): Promise<void> {
    const cardAttachment = CardFactory.adaptiveCard(card);
    const message = MessageFactory.attachment(cardAttachment);
    message.text = fallbackText;
    await context.sendActivity(message);
  }

  /**
   * Send text message with suggested actions
   */
  private async sendTextWithSuggestions(
    context: TurnContext,
    text: string,
    suggestions: string[]
  ): Promise<void> {
    const message = MessageFactory.suggestedActions(suggestions, text);
    await context.sendActivity(message);
  }

  /**
   * Send typing indicator for natural conversation flow
   */
  private async sendTypingIndicator(context: TurnContext): Promise<void> {
    await context.sendActivity({ type: 'typing' } as Activity);
    await this.delay(this.typingDelay);
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Store conversation state
   */
  public setConversationState(conversationId: string, state: any): void {
    this.conversationState.set(conversationId, state);
  }

  /**
   * Retrieve conversation state
   */
  public getConversationState(conversationId: string): any {
    return this.conversationState.get(conversationId) || {};
  }
}