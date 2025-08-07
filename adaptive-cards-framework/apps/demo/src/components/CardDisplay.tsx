import React, { useState, useCallback, useEffect } from 'react';
import { AdaptiveCardRenderer } from '@adaptive-cards/react';
import { sampleCards } from '../data/sampleCards';

interface CardDisplayProps {
  selectedCard: string;
  onAction?: (action: any, data?: any) => void;
  onInputChange?: (inputId: string, value: any) => void;
  onError?: (error: Error) => void;
}

export const CardDisplay: React.FC<CardDisplayProps> = ({
  selectedCard,
  onAction,
  onInputChange,
  onError,
}) => {
  const [theme, setTheme] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const cardData = sampleCards[selectedCard as keyof typeof sampleCards];

  const handleAction = useCallback(async (action: any, data?: any) => {
    console.log('Action executed:', action, data);
    setIsLoading(true);
    
    // Simulate async action processing with delightful feedback
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      onAction?.(action, data);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onAction]);

  const handleInputChange = useCallback((inputId: string, value: any) => {
    console.log('Input changed:', inputId, value);
    onInputChange?.(inputId, value);
  }, [onInputChange]);

  const handleError = useCallback((error: Error) => {
    console.error('Card error:', error);
    onError?.(error);
  }, [onError]);

  // Enhanced empty state with personality
  if (!cardData) {
    return (
      <div className="card-display">
        <h3>Card Preview</h3>
        <div className="empty-state">
          <div className="empty-state-icon">🎴</div>
          <div className="empty-state-title">Ready for some card magic?</div>
          <div className="empty-state-description">
            Pick a card from the sidebar to see it come to life with delightful animations and interactions!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-display">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Card Preview</h3>
        <div>
          <label htmlFor="theme-select" style={{ marginRight: '0.5rem' }}>Theme:</label>
          <select
            id="theme-select"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            style={{
              padding: '0.25rem 0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            <option value="default">Default</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
      
      <div className="card-wrapper" style={{ position: 'relative' }}>
        {/* Loading overlay */}
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              borderRadius: '8px',
              animation: 'fadeIn 0.3s ease',
            }}
          >
            <div 
              style={{
                fontSize: '2rem',
                marginBottom: '1rem',
                animation: 'float 2s ease-in-out infinite',
              }}
            >
              ⚡
            </div>
            <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>Processing your action...</div>
            <div className="loading-dots">
              <span className="loading-dot"></span>
              <span className="loading-dot"></span>
              <span className="loading-dot"></span>
            </div>
          </div>
        )}
        
        {/* Success overlay */}
        {showSuccess && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(16, 185, 129, 0.95)',
              color: 'white',
              padding: '1rem 2rem',
              borderRadius: '8px',
              zIndex: 15,
              animation: 'bounceIn 0.5s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>🎉</span>
            Action completed successfully!
          </div>
        )}
        
        <AdaptiveCardRenderer
          card={cardData}
          theme={theme}
          onAction={handleAction}
          onInputChange={handleInputChange}
          onError={handleError}
          validate={true}
        />
      </div>
    </div>
  );
};