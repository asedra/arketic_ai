import React, { useState, useRef, useEffect } from 'react';
import { TextBlock as ITextBlock } from '@adaptive-cards/core';
import { useAdaptiveCard } from '../AdaptiveCardProvider';
import clsx from 'clsx';

export interface TextBlockProps {
  element: ITextBlock;
}

export const TextBlock: React.FC<TextBlockProps> = ({ element }) => {
  const { context } = useAdaptiveCard();
  const [isVisible, setIsVisible] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (textRef.current) {
      observer.observe(textRef.current);
    }
    
    return () => observer.disconnect();
  }, []);
  
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

  const fontSize = context.hostConfig.fontSizes[size as keyof typeof context.hostConfig.fontSizes] || context.hostConfig.fontSizes.default;
  const fontWeight = context.hostConfig.fontWeights[weight as keyof typeof context.hostConfig.fontWeights] || context.hostConfig.fontWeights.default;

  const style: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    fontWeight,
    textAlign: horizontalAlignment as any,
    fontFamily: context.hostConfig.fontFamily,
    whiteSpace: wrap ? 'pre-wrap' : 'nowrap',
    overflow: wrap ? 'visible' : 'hidden',
    textOverflow: wrap ? 'clip' : 'ellipsis',
    opacity: isSubtle ? 0.7 : 1,
    transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
    animation: isVisible ? 'fadeInUp 0.8s ease-out' : 'none',
    ...(maxLines && {
      display: '-webkit-box',
      WebkitLineClamp: maxLines,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    }),
  };

  // Get color from host config
  const containerStyle = context.hostConfig.containerStyles.default;
  const colorConfig = containerStyle.foregroundColors[color as keyof typeof containerStyle.foregroundColors];
  if (colorConfig) {
    style.color = isSubtle ? colorConfig.subtle : colorConfig.default;
  }

  // Add typewriter effect for important text
  const shouldTypewrite = size === 'large' || size === 'extraLarge' || weight === 'bolder';
  const [displayText, setDisplayText] = useState(shouldTypewrite ? '' : text);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (shouldTypewrite && isVisible && currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 50); // Adjust speed as needed
      
      return () => clearTimeout(timer);
    }
  }, [shouldTypewrite, isVisible, currentIndex, text]);
  
  return (
    <div
      ref={textRef}
      className={clsx(
        'adaptive-card__text-block',
        `adaptive-card__text-block--${color}`,
        `adaptive-card__text-block--${size}`,
        `adaptive-card__text-block--${weight}`,
        {
          'adaptive-card__text-block--subtle': isSubtle,
          'adaptive-card__text-block--wrap': wrap,
          'adaptive-card__text-block--typewriter': shouldTypewrite,
          'adaptive-card__text-block--visible': isVisible,
        }
      )}
      style={style}
    >
      {shouldTypewrite ? (
        <span>
          {displayText}
          {currentIndex < text.length && (
            <span 
              className="cursor"
              style={{
                animation: 'blink 1s infinite',
                marginLeft: '2px',
              }}
            >
              |
            </span>
          )}
        </span>
      ) : (
        text
      )}
    </div>
  );
};

// Inject text animation styles
const textStyles = `
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

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

.adaptive-card__text-block {
  position: relative;
}

.adaptive-card__text-block--typewriter {
  overflow: visible;
}

.cursor {
  display: inline-block;
  color: currentColor;
  font-weight: normal;
}
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.querySelector('#text-enhancement-styles')) {
  const style = document.createElement('style');
  style.id = 'text-enhancement-styles';
  style.textContent = textStyles;
  document.head.appendChild(style);
}