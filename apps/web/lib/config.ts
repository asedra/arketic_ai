/**
 * Configuration file for the frontend application
 */

// API Configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Application Configuration
export const APP_CONFIG = {
  name: 'Arketic AI',
  version: '1.0.0',
  description: 'Enterprise AI integration platform',
  
  // Form Designer Configuration
  forms: {
    autoSaveInterval: 30000, // 30 seconds
    maxFormElements: 100,
    maxTitleLength: 255,
    maxDescriptionLength: 1000,
    supportedCardVersion: '1.5'
  },
  
  // UI Configuration
  ui: {
    defaultTheme: 'light',
    animationDuration: 200,
    toastDuration: 3000
  }
};

// Feature Flags
export const FEATURE_FLAGS = {
  enableFormTemplates: true,
  enableFormSharing: true,
  enableFormVersioning: true,
  enableAIFormGeneration: true,
  enableAdvancedAnalytics: false
};

// Environment Checks
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isBrowser = typeof window !== 'undefined';