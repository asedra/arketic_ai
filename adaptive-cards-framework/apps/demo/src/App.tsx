import React, { useState, useCallback } from 'react';
import { SimpleAdaptiveCardRenderer } from './SimpleCardRenderer';
import { sampleCards, cardCategories } from './data/sampleCards';
import './styles/index.css';

function App() {
  const [selectedCard, setSelectedCard] = useState('welcome');
  const [actionLog, setActionLog] = useState<string[]>([]);

  const handleCardSelect = useCallback((cardId: string) => {
    setSelectedCard(cardId);
    setActionLog(prev => [...prev, `Selected card: ${cardId}`]);
  }, []);

  const handleAction = useCallback((action: any, data?: any) => {
    const logEntry = `Action: ${action.type} - ${action.title || 'Untitled'} ${data ? `(${JSON.stringify(data)})` : ''}`;
    setActionLog(prev => [...prev.slice(-9), logEntry]);
    console.log('Action executed:', action, data);
  }, []);

  const handleInputChange = useCallback((inputId: string, value: any) => {
    const logEntry = `Input: ${inputId} = ${value}`;
    setActionLog(prev => [...prev.slice(-9), logEntry]);
    console.log('Input changed:', inputId, value);
  }, []);

  const cardData = sampleCards[selectedCard as keyof typeof sampleCards];

  return (
    <div className="demo-app">
      <header className="demo-header">
        <h1>Adaptive Cards Framework</h1>
        <p>
          A modern TypeScript framework for creating and rendering adaptive cards with React support, 
          Bot Framework integration, and comprehensive validation.
        </p>
      </header>

      <main className="demo-main">
        <aside className="demo-sidebar">
          <div className="card-selector">
            <h3>Sample Cards</h3>
            {cardCategories.map((category) => (
              <button
                key={category.id}
                className={`card-button ${selectedCard === category.id ? 'active' : ''}`}
                onClick={() => handleCardSelect(category.id)}
              >
                <div className="card-button-title">{category.name}</div>
                <div className="card-button-description">{category.description}</div>
              </button>
            ))}
          </div>
          
          <div className="action-log">
            <h3>Activity Log</h3>
            <div className="log-entries">
              {actionLog.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '1rem' }}>
                  No activity yet. Interact with the card to see logs here.
                </div>
              ) : (
                actionLog.map((entry, index) => (
                  <div key={index} className="log-entry">
                    {entry}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <div className="demo-content">
          <div className="card-display">
            <h3>Card Preview</h3>
            <div className="card-wrapper">
              {cardData && (
                <SimpleAdaptiveCardRenderer
                  card={cardData}
                  onAction={handleAction}
                  onInputChange={handleInputChange}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <footer style={{ 
        textAlign: 'center', 
        padding: '2rem', 
        background: '#f8f9fa', 
        borderTop: '1px solid #e9ecef',
        marginTop: 'auto'
      }}>
        <p style={{ color: '#666', margin: 0 }}>
          Built with React, TypeScript, and Vite • 
          <a 
            href="https://adaptivecards.io" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#0078D4', textDecoration: 'none', marginLeft: '0.5rem' }}
          >
            Learn more about Adaptive Cards
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;