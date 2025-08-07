import React from 'react';

interface SimpleAdaptiveCardProps {
  card: any;
  onAction?: (action: any, data?: any) => void;
  onInputChange?: (inputId: string, value: any) => void;
}

export const SimpleAdaptiveCardRenderer: React.FC<SimpleAdaptiveCardProps> = ({
  card,
  onAction,
  onInputChange,
}) => {
  const [inputValues, setInputValues] = React.useState<Record<string, any>>({});

  const handleInputChange = (inputId: string, value: any) => {
    setInputValues(prev => ({ ...prev, [inputId]: value }));
    onInputChange?.(inputId, value);
  };

  const handleAction = (action: any, data?: any) => {
    if (action.type === 'Action.Submit') {
      const submitData = { ...data, ...inputValues };
      onAction?.(action, submitData);
    } else if (action.type === 'Action.OpenUrl') {
      window.open(action.url, '_blank', 'noopener,noreferrer');
      onAction?.(action, data);
    } else {
      onAction?.(action, data);
    }
  };

  const renderElement = (element: any): React.ReactNode => {
    switch (element.type) {
      case 'TextBlock':
        return (
          <div
            key={element.id}
            style={{
              fontSize: element.size === 'large' ? '21px' : element.size === 'medium' ? '17px' : '14px',
              fontWeight: element.weight === 'bolder' ? 600 : 400,
              textAlign: element.horizontalAlignment || 'left',
              color: element.color === 'accent' ? '#0078D4' : element.color === 'attention' ? '#FF0000' : '#333',
              marginBottom: '8px',
              whiteSpace: element.wrap ? 'pre-wrap' : 'nowrap',
              overflow: element.wrap ? 'visible' : 'hidden',
              textOverflow: element.wrap ? 'clip' : 'ellipsis',
            }}
          >
            {element.text}
          </div>
        );

      case 'Image':
        return (
          <div key={element.id} style={{ textAlign: element.horizontalAlignment || 'left', margin: '8px 0' }}>
            <img
              src={element.url}
              alt={element.altText || ''}
              style={{
                maxWidth: element.size === 'stretch' ? '100%' : element.size === 'large' ? '160px' : element.size === 'medium' ? '80px' : element.size === 'small' ? '40px' : 'auto',
                height: 'auto',
                borderRadius: element.style === 'person' ? '50%' : '0',
              }}
            />
          </div>
        );

      case 'Container':
        return (
          <div
            key={element.id}
            style={{
              backgroundColor: element.style === 'emphasis' ? '#F5F5F5' : element.style === 'attention' ? '#FDF2F2' : 'transparent',
              padding: element.style ? '12px' : '0',
              borderRadius: element.style ? '4px' : '0',
              margin: '8px 0',
            }}
          >
            {element.items?.map((item: any, index: number) => (
              <div key={item.id || index} style={{ marginBottom: index < element.items.length - 1 ? '8px' : '0' }}>
                {renderElement(item)}
              </div>
            ))}
          </div>
        );

      case 'Input.Text':
        return (
          <div key={element.id} style={{ margin: '12px 0' }}>
            {element.label && (
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500 }}>
                {element.label}
                {element.isRequired && <span style={{ color: '#D13438' }}>*</span>}
              </label>
            )}
            {element.isMultiline ? (
              <textarea
                placeholder={element.placeholder}
                defaultValue={element.value}
                onChange={(e) => handleInputChange(element.id, e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #CCCCCC',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            ) : (
              <input
                type={element.style === 'email' ? 'email' : element.style === 'password' ? 'password' : 'text'}
                placeholder={element.placeholder}
                defaultValue={element.value}
                onChange={(e) => handleInputChange(element.id, e.target.value)}
                maxLength={element.maxLength}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #CCCCCC',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                }}
              />
            )}
          </div>
        );

      case 'ActionSet':
        return (
          <div key={element.id} style={{ display: 'flex', gap: '8px', margin: '16px 0 0 0', flexWrap: 'wrap' }}>
            {element.actions?.map((action: any, index: number) => (
              <button
                key={action.id || index}
                onClick={() => handleAction(action, action.data)}
                style={{
                  padding: '8px 16px',
                  border: action.style === 'positive' ? 'none' : '1px solid #CCCCCC',
                  borderRadius: '4px',
                  backgroundColor: action.style === 'positive' ? '#0078D4' : action.style === 'destructive' ? '#D13438' : '#F3F2F1',
                  color: action.style === 'positive' || action.style === 'destructive' ? 'white' : '#323130',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {action.title}
              </button>
            ))}
          </div>
        );

      default:
        return (
          <div key={element.id} style={{ padding: '8px', backgroundColor: '#FFF3CD', border: '1px solid #FFC107', borderRadius: '4px', margin: '8px 0' }}>
            Unsupported element: {element.type}
          </div>
        );
    }
  };

  if (!card || !card.body) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#FDF2F2', border: '1px solid #FED7D7', borderRadius: '8px', color: '#C53030' }}>
        Invalid or missing card data
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        maxWidth: '100%',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E1E1E1',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ padding: '16px' }}>
        {card.body.map((element: any, index: number) => (
          <div key={element.id || index}>
            {renderElement(element)}
          </div>
        ))}
      </div>
      {card.actions && card.actions.length > 0 && (
        <div
          style={{
            padding: '8px 16px 16px',
            borderTop: '1px solid #E1E1E1',
            backgroundColor: '#F8F9FA',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {card.actions.map((action: any, index: number) => (
            <button
              key={action.id || index}
              onClick={() => handleAction(action, action.data)}
              style={{
                padding: '8px 16px',
                border: action.style === 'positive' ? 'none' : '1px solid #CCCCCC',
                borderRadius: '4px',
                backgroundColor: action.style === 'positive' ? '#0078D4' : action.style === 'destructive' ? '#D13438' : '#F3F2F1',
                color: action.style === 'positive' || action.style === 'destructive' ? 'white' : '#323130',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {action.title}
              {action.type === 'Action.OpenUrl' && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ marginLeft: '4px' }}>
                  <path d="M9 3V2H7V1h3v3H9zM8 4l2.5-2.5L9 0H6v1h1.5L5 3.5 6.5 5 9 2.5V4zM1 2v8h8V6H8v3H2V3h3V2H1z" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};