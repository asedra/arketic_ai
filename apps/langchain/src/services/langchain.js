import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HuggingFaceInference } from '@langchain/community/llms/hf';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { BufferMemory } from 'langchain/memory';
import { ConversationChain } from 'langchain/chains';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const models = {};
const chains = {};

export async function initializeLangChain() {
  try {
    if (config.langchain.openai.apiKey) {
      models.openai = new ChatOpenAI({
        openAIApiKey: config.langchain.openai.apiKey,
        modelName: config.langchain.openai.model,
        temperature: config.langchain.openai.temperature,
        maxTokens: config.langchain.openai.maxTokens,
        streaming: true
      });
      logger.info('OpenAI model initialized');
    }

    if (config.langchain.anthropic.apiKey) {
      models.anthropic = new ChatAnthropic({
        anthropicApiKey: config.langchain.anthropic.apiKey,
        modelName: config.langchain.anthropic.model,
        temperature: config.langchain.anthropic.temperature,
        maxTokens: config.langchain.anthropic.maxTokens,
        streaming: true
      });
      logger.info('Anthropic model initialized');
    }

    if (config.langchain.huggingface.apiKey) {
      models.huggingface = new HuggingFaceInference({
        apiKey: config.langchain.huggingface.apiKey,
        model: config.langchain.huggingface.model
      });
      logger.info('HuggingFace model initialized');
    }

    return models;
  } catch (error) {
    logger.error('Failed to initialize LangChain:', error);
    throw error;
  }
}

export function getModel(provider = 'openai') {
  const model = models[provider];
  if (!model) {
    throw new Error(`Model provider ${provider} not initialized`);
  }
  return model;
}

export async function createConversationChain(provider = 'openai') {
  const model = getModel(provider);
  const memory = new BufferMemory();
  
  const chain = new ConversationChain({
    llm: model,
    memory: memory,
    verbose: true
  });
  
  return chain;
}

export async function generateCompletion(prompt, options = {}) {
  const {
    provider = 'openai',
    temperature,
    maxTokens,
    stream = false
  } = options;

  try {
    const model = getModel(provider);
    
    if (temperature !== undefined || maxTokens !== undefined) {
      model.temperature = temperature ?? model.temperature;
      model.maxTokens = maxTokens ?? model.maxTokens;
    }

    if (stream) {
      return await model.stream(prompt);
    } else {
      const response = await model.invoke(prompt);
      return response.content;
    }
  } catch (error) {
    logger.error('Error generating completion:', error);
    throw error;
  }
}

export async function generateWithTemplate(template, variables, provider = 'openai') {
  try {
    const model = getModel(provider);
    const promptTemplate = PromptTemplate.fromTemplate(template);
    
    const chain = RunnableSequence.from([
      promptTemplate,
      model,
      new StringOutputParser()
    ]);
    
    const result = await chain.invoke(variables);
    return result;
  } catch (error) {
    logger.error('Error generating with template:', error);
    throw error;
  }
}

export async function* streamCompletion(prompt, options = {}) {
  const { provider = 'openai' } = options;
  
  try {
    const model = getModel(provider);
    const stream = await model.stream(prompt);
    
    for await (const chunk of stream) {
      yield chunk.content;
    }
  } catch (error) {
    logger.error('Error streaming completion:', error);
    throw error;
  }
}

export function getAvailableModels() {
  return Object.keys(models);
}

export function getModelConfig(provider) {
  if (!config.langchain[provider]) {
    return null;
  }
  return config.langchain[provider];
}