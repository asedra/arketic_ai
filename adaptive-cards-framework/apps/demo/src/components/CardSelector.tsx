import React from 'react';
import { cardCategories } from '../data/sampleCards';

interface CardSelectorProps {
  selectedCard: string;
  onCardSelect: (cardId: string) => void;
}

export const CardSelector: React.FC<CardSelectorProps> = ({
  selectedCard,
  onCardSelect,
}) => {
  return (
    <div className=\"card-selector\">
      <h3>Sample Cards</h3>
      <ul className=\"card-list\">
        {cardCategories.map((category) => (
          <li key={category.id} className=\"card-list-item\">
            <button
              className={`card-button ${selectedCard === category.id ? 'active' : ''}`}
              onClick={() => onCardSelect(category.id)}
            >
              <span className=\"card-button-title\">{category.name}</span>
              <span className=\"card-button-description\">{category.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};