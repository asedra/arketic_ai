import React from 'react';
import { ActionOpenUrl } from '@adaptive-cards/core';
import { useAdaptiveCard } from '../AdaptiveCardProvider';
import clsx from 'clsx';

export interface OpenUrlActionProps {
  action: ActionOpenUrl;
}

export const OpenUrlAction: React.FC<OpenUrlActionProps> = ({ action }) => {
  const { executeAction } = useAdaptiveCard();

  const {
    title = 'Open Link',
    url,
    style: actionStyle = 'default',
    isEnabled = true,
    tooltip,
    iconUrl,
  } = action;

  const handleClick = () => {
    if (isEnabled) {
      executeAction(action);
      // Default behavior: open URL in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: isEnabled ? 'pointer' : 'not-allowed',
    opacity: isEnabled ? 1 : 0.6,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
    textDecoration: 'none',
    outline: 'none',
  };

  // Apply style-specific colors
  switch (actionStyle) {
    case 'positive':
      buttonStyle.backgroundColor = '#0078D4';
      buttonStyle.color = '#FFFFFF';
      break;
    case 'destructive':
      buttonStyle.backgroundColor = '#D13438';
      buttonStyle.color = '#FFFFFF';
      break;
    default:
      buttonStyle.backgroundColor = '#F3F2F1';
      buttonStyle.color = '#323130';
      buttonStyle.border = '1px solid #CCCCCC';
      break;
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isEnabled) {
      const target = e.target as HTMLButtonElement;
      target.style.transform = 'translateY(-1px)';
      target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isEnabled) {
      const target = e.target as HTMLButtonElement;
      target.style.transform = 'translateY(0)';
      target.style.boxShadow = 'none';
    }
  };

  return (
    <button
      type=\"button\"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={!isEnabled}
      title={tooltip || `Open ${url}`}
      className={clsx(
        'adaptive-card__action',
        'adaptive-card__action--open-url',
        `adaptive-card__action--${actionStyle}`,
        {
          'adaptive-card__action--disabled': !isEnabled,
          'adaptive-card__action--has-icon': !!iconUrl,
        }
      )}
      style={buttonStyle}
    >
      {iconUrl && (
        <img
          src={iconUrl}
          alt=\"\"
          className=\"adaptive-card__action-icon\"
          style={{
            width: '16px',
            height: '16px',
            flexShrink: 0,
          }}
        />
      )}
      <span className=\"adaptive-card__action-title\">{title}</span>
      <svg
        width=\"12\"
        height=\"12\"
        viewBox=\"0 0 12 12\"
        fill=\"currentColor\"
        className=\"adaptive-card__external-link-icon\"
        style={{ flexShrink: 0, marginLeft: '4px' }}
      >
        <path d=\"M9 3V2H7V1h3v3H9zM8 4l2.5-2.5L9 0H6v1h1.5L5 3.5 6.5 5 9 2.5V4zM1 2v8h8V6H8v3H2V3h3V2H1z\" />
      </svg>
    </button>
  );
};