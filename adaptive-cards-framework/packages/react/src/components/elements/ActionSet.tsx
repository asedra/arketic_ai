import React from 'react';
import { ActionSet as IActionSet } from '@adaptive-cards/core';
import { useAdaptiveCard } from '../AdaptiveCardProvider';
import { renderAction } from '../../utils/renderers';
import clsx from 'clsx';

export interface ActionSetProps {
  element: IActionSet;
}

export const ActionSet: React.FC<ActionSetProps> = ({ element }) => {
  const { context } = useAdaptiveCard();

  const { actions } = element;

  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div 
      className={clsx(
        'adaptive-card__action-set',
        {
          'adaptive-card__action-set--single': actions.length === 1,
          'adaptive-card__action-set--multiple': actions.length > 1,
        }
      )}
      style={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginTop: '16px',
      }}
    >
      {actions.map((action, index) => (
        <div
          key={action.id || `action-${index}`}
          className=\"adaptive-card__action-wrapper\"
        >
          {renderAction(action, context)}
        </div>
      ))}
    </div>
  );
};