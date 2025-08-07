import React, { useState, useRef } from 'react';
import { Container as IContainer } from '@adaptive-cards/core';
import { useAdaptiveCard } from '../AdaptiveCardProvider';
import { renderElement } from '../../utils/renderers';
import clsx from 'clsx';

export interface ContainerProps {
  element: IContainer;
}

export const Container: React.FC<ContainerProps> = ({ element }) => {
  const { context, executeAction } = useAdaptiveCard();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    items,
    style: containerStyle = 'default',
    verticalContentAlignment = 'top',
    bleed = false,
    backgroundImage,
    minHeight,
    selectAction,
  } = element;

  const handleClick = () => {
    if (selectAction) {
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      executeAction(selectAction);
    }
  };
  
  const handleMouseEnter = () => {
    if (selectAction) {
      setIsHovered(true);
    }
  };
  
  const handleMouseLeave = () => {
    if (selectAction) {
      setIsHovered(false);
      setIsPressed(false);
    }
  };
  
  const handleMouseDown = () => {
    if (selectAction) {
      setIsPressed(true);
    }
  };
  
  const handleMouseUp = () => {
    if (selectAction) {
      setIsPressed(false);
    }
  };

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: verticalContentAlignment === 'center' ? 'center' : verticalContentAlignment === 'bottom' ? 'flex-end' : 'flex-start',
    cursor: selectAction ? 'pointer' : 'default',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isPressed ? 'scale(0.98)' : isHovered ? 'scale(1.02)' : 'scale(1)',
    borderRadius: '8px',
    overflow: 'hidden',
    position: 'relative',
    ...(minHeight && { minHeight }),
    ...(selectAction && {
      boxShadow: isHovered ? '0 8px 25px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
    }),
  };

  // Apply container style from host config
  const styleConfig = context.hostConfig.containerStyles[containerStyle as keyof typeof context.hostConfig.containerStyles];
  if (styleConfig) {
    containerStyles.backgroundColor = styleConfig.backgroundColor;
  }

  // Apply background image
  if (backgroundImage) {
    containerStyles.backgroundImage = `url(${backgroundImage.url})`;
    containerStyles.backgroundSize = 'cover';
    containerStyles.backgroundPosition = 'center';
    containerStyles.backgroundRepeat = 'no-repeat';
    
    if (backgroundImage.fillMode) {
      switch (backgroundImage.fillMode) {
        case 'cover':
          containerStyles.backgroundSize = 'cover';
          break;
        case 'repeatHorizontally':
          containerStyles.backgroundRepeat = 'repeat-x';
          containerStyles.backgroundSize = 'auto';
          break;
        case 'repeatVertically':
          containerStyles.backgroundRepeat = 'repeat-y';
          containerStyles.backgroundSize = 'auto';
          break;
        case 'repeat':
          containerStyles.backgroundRepeat = 'repeat';
          containerStyles.backgroundSize = 'auto';
          break;
      }
    }
  }

  // Apply bleed (negative margins to extend to container edges)
  if (bleed) {
    containerStyles.margin = '0 -15px'; // Assuming default padding of 15px
  }

  return (
    <div
      ref={containerRef}
      className={clsx(
        'adaptive-card__container',
        `adaptive-card__container--${containerStyle}`,
        `adaptive-card__container--align-${verticalContentAlignment}`,
        {
          'adaptive-card__container--bleed': bleed,
          'adaptive-card__container--clickable': !!selectAction,
          'adaptive-card__container--has-background': !!backgroundImage,
          'adaptive-card__container--hovered': isHovered,
          'adaptive-card__container--pressed': isPressed,
        }
      )}
      style={containerStyles}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {/* Hover overlay for clickable containers */}
      {selectAction && (
        <div
          className="container-hover-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(0, 120, 212, 0.05) 0%, rgba(0, 120, 212, 0.1) 100%)',
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}
      
      {items.map((item, index) => (
        <div 
          key={item.id || `item-${index}`}
          className="adaptive-card__container-item"
          style={{
            animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`,
            position: 'relative',
            zIndex: 2,
          }}
        >
          {renderElement(item, context)}
        </div>
      ))}
    </div>
  );
};

// Inject container-specific animations
const containerStyles = `
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.adaptive-card__container--clickable {
  position: relative;
}

.adaptive-card__container--clickable::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px solid transparent;
  border-radius: inherit;
  transition: border-color 0.3s ease;
  pointer-events: none;
}

.adaptive-card__container--clickable:hover::before {
  border-color: rgba(0, 120, 212, 0.3);
}

.adaptive-card__container--clickable:focus-visible::before {
  border-color: #0078D4;
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.querySelector('#container-enhancement-styles')) {
  const style = document.createElement('style');  
  style.id = 'container-enhancement-styles';
  style.textContent = containerStyles;
  document.head.appendChild(style);
}