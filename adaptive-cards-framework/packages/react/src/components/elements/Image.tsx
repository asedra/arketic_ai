import React, { useState } from 'react';
import { Image as IImage } from '@adaptive-cards/core';
import { useAdaptiveCard } from '../AdaptiveCardProvider';
import clsx from 'clsx';

export interface ImageProps {
  element: IImage;
}

export const Image: React.FC<ImageProps> = ({ element }) => {
  const { executeAction } = useAdaptiveCard();
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const {
    url,
    altText,
    size = 'auto',
    style: imageStyle = 'default',
    horizontalAlignment = 'left',
    backgroundColor,
    width,
    height,
    selectAction,
  } = element;

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleClick = () => {
    if (selectAction) {
      executeAction(selectAction);
    }
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: horizontalAlignment === 'center' ? 'center' : horizontalAlignment === 'right' ? 'flex-end' : 'flex-start',
    ...(backgroundColor && { backgroundColor }),
  };

  const imageStyle_: React.CSSProperties = {
    maxWidth: '100%',
    height: 'auto',
    cursor: selectAction ? 'pointer' : 'default',
    borderRadius: imageStyle === 'person' ? '50%' : '0',
    objectFit: imageStyle === 'person' ? 'cover' : 'contain',
  };

  // Set size-specific styles
  switch (size) {
    case 'small':
      imageStyle_.maxWidth = '40px';
      imageStyle_.maxHeight = '40px';
      break;
    case 'medium':
      imageStyle_.maxWidth = '80px';
      imageStyle_.maxHeight = '80px';
      break;
    case 'large':
      imageStyle_.maxWidth = '160px';
      imageStyle_.maxHeight = '160px';
      break;
    case 'stretch':
      imageStyle_.width = '100%';
      break;
  }

  // Override with explicit dimensions
  if (width) {
    imageStyle_.width = width;
  }
  if (height) {
    imageStyle_.height = height;
  }

  if (imageError) {
    return (
      <div 
        className={clsx(
          'adaptive-card__image',
          'adaptive-card__image--error',
          `adaptive-card__image--${size}`,
          `adaptive-card__image--${imageStyle}`
        )}
        style={containerStyle}
      >
        <div className=\"adaptive-card__image-error\">
          <span>Image not available</span>
          {altText && <span className=\"adaptive-card__image-alt\">{altText}</span>}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={clsx(
        'adaptive-card__image',
        `adaptive-card__image--${size}`,
        `adaptive-card__image--${imageStyle}`,
        `adaptive-card__image--align-${horizontalAlignment}`,
        {
          'adaptive-card__image--clickable': !!selectAction,
          'adaptive-card__image--loading': !imageLoaded,
        }
      )}
      style={containerStyle}
      onClick={handleClick}
    >
      {!imageLoaded && (
        <div className=\"adaptive-card__image-placeholder\">
          Loading...
        </div>
      )}
      <img
        src={url}
        alt={altText || ''}
        style={imageStyle_}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={clsx({
          'adaptive-card__image-loaded': imageLoaded,
        })}
      />
    </div>
  );
};