import React, { useState, useCallback } from 'react';

interface AdaptiveCardProps {
  card: any;
  onAction?: (action: any, data?: any) => void;
  onInputChange?: (inputId: string, value: any) => void;
}

interface FormData {
  [key: string]: any;
}

export const AdvancedCardRenderer: React.FC<AdaptiveCardProps> = ({ 
  card, 
  onAction, 
  onInputChange 
}) => {
  const [formData, setFormData] = useState<FormData>({});
  const [showCards, setShowCards] = useState<{[key: string]: boolean}>({});

  const handleInputChange = useCallback((id: string, value: any) => {
    const newFormData = { ...formData, [id]: value };
    setFormData(newFormData);
    onInputChange?.(id, value);
  }, [formData, onInputChange]);

  const handleAction = useCallback((action: any) => {
    switch (action.type) {
      case 'Action.Submit':
        onAction?.(action, { ...formData, ...action.data });
        break;
      case 'Action.OpenUrl':
        window.open(action.url, '_blank');
        break;
      case 'Action.ShowCard':
        const cardId = action.id || `showcard-${Math.random()}`;
        setShowCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
        break;
      case 'Action.Execute':
      case 'Action.Refresh':
        onAction?.(action, formData);
        break;
      default:
        onAction?.(action, formData);
    }
  }, [formData, onAction]);

  // Text size mapping
  const getTextSize = (size?: string) => {
    switch (size?.toLowerCase()) {
      case 'small': return '14px';
      case 'default': return '16px';
      case 'medium': return '20px';
      case 'large': return '24px';
      case 'extralarge': return '32px';
      default: return '16px';
    }
  };

  // Color mapping
  const getColor = (color?: string) => {
    switch (color?.toLowerCase()) {
      case 'default': return '#333';
      case 'dark': return '#000';
      case 'light': return '#666';
      case 'accent': return '#0078d4';
      case 'good': return '#107c10';
      case 'warning': return '#ff8c00';
      case 'attention': return '#d13438';
      default: return '#333';
    }
  };

  // Weight mapping
  const getFontWeight = (weight?: string) => {
    switch (weight?.toLowerCase()) {
      case 'lighter': return '300';
      case 'default': return '400';
      case 'bolder': return '700';
      default: return '400';
    }
  };

  // Horizontal alignment
  const getAlignment = (alignment?: string) => {
    switch (alignment?.toLowerCase()) {
      case 'left': return 'flex-start';
      case 'center': return 'center';
      case 'right': return 'flex-end';
      default: return 'flex-start';
    }
  };

  // Spacing mapping
  const getSpacing = (spacing?: string) => {
    switch (spacing?.toLowerCase()) {
      case 'none': return '0px';
      case 'small': return '4px';
      case 'default': return '8px';
      case 'medium': return '16px';
      case 'large': return '24px';
      case 'extralarge': return '32px';
      case 'padding': return '16px';
      default: return '8px';
    }
  };

  // Render individual elements
  const renderElement = (element: any, index: number = 0): React.ReactNode => {
    const commonStyle = {
      marginTop: index > 0 ? getSpacing(element.spacing) : '0px',
      ...(element.separator && { borderTop: '1px solid #e1e1e1', paddingTop: '8px' })
    };

    switch (element.type) {
      case 'TextBlock':
        return (
          <div 
            key={index}
            style={{
              ...commonStyle,
              fontSize: getTextSize(element.size),
              color: getColor(element.color),
              fontWeight: getFontWeight(element.weight),
              textAlign: element.horizontalAlignment || 'left',
              fontStyle: element.isSubtle ? 'italic' : 'normal',
              opacity: element.isSubtle ? 0.7 : 1,
              maxHeight: element.maxLines ? `${parseInt(element.maxLines) * 1.5}em` : 'none',
              overflow: element.maxLines ? 'hidden' : 'visible',
              whiteSpace: element.wrap === false ? 'nowrap' : 'normal',
              wordWrap: element.wrap !== false ? 'break-word' : 'normal'
            }}
          >
            {element.text}
          </div>
        );

      case 'RichTextBlock':
        return (
          <div 
            key={index}
            style={{
              ...commonStyle,
              fontSize: getTextSize(element.size),
              textAlign: element.horizontalAlignment || 'left'
            }}
          >
            {element.inlines?.map((inline: any, idx: number) => (
              <span
                key={idx}
                style={{
                  fontSize: getTextSize(inline.size),
                  color: getColor(inline.color),
                  fontWeight: getFontWeight(inline.weight),
                  fontStyle: inline.italic ? 'italic' : 'normal',
                  textDecoration: inline.strikethrough ? 'line-through' : 
                                 inline.underline ? 'underline' : 'none'
                }}
              >
                {inline.text}
              </span>
            ))}
          </div>
        );

      case 'Image':
        return (
          <div 
            key={index}
            style={{
              ...commonStyle,
              display: 'flex',
              justifyContent: getAlignment(element.horizontalAlignment)
            }}
          >
            <img
              src={element.url}
              alt={element.altText || ''}
              style={{
                maxWidth: element.width === 'stretch' ? '100%' : 
                          element.width === 'auto' ? 'auto' :
                          element.pixelWidth ? `${element.pixelWidth}px` :
                          element.size === 'small' ? '32px' :
                          element.size === 'medium' ? '64px' :
                          element.size === 'large' ? '128px' : 'auto',
                maxHeight: element.pixelHeight ? `${element.pixelHeight}px` : 'auto',
                borderRadius: element.style === 'person' ? '50%' : '4px'
              }}
            />
          </div>
        );

      case 'ImageSet':
        return (
          <div 
            key={index}
            style={{
              ...commonStyle,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            {element.images?.map((img: any, idx: number) => (
              <img
                key={idx}
                src={img.url}
                alt={img.altText || ''}
                style={{
                  width: element.imageSize === 'small' ? '32px' :
                         element.imageSize === 'medium' ? '64px' :
                         element.imageSize === 'large' ? '128px' : '64px',
                  height: element.imageSize === 'small' ? '32px' :
                          element.imageSize === 'medium' ? '64px' :
                          element.imageSize === 'large' ? '128px' : '64px',
                  objectFit: 'cover',
                  borderRadius: '4px'
                }}
              />
            ))}
          </div>
        );

      case 'Container':
        return (
          <div 
            key={index}
            style={{
              ...commonStyle,
              padding: getSpacing('default'),
              backgroundColor: element.style === 'emphasis' ? '#f5f5f5' : 
                              element.style === 'good' ? '#e8f5e8' :
                              element.style === 'attention' ? '#ffeaea' :
                              element.style === 'warning' ? '#fff4e6' :
                              element.style === 'accent' ? '#e6f2ff' : 'transparent',
              border: element.style ? '1px solid #e1e1e1' : 'none',
              borderRadius: '4px',
              minHeight: element.minHeight ? `${element.minHeight}px` : 'auto'
            }}
          >
            {element.items?.map((item: any, idx: number) => renderElement(item, idx))}
          </div>
        );

      case 'ColumnSet':
        return (
          <div 
            key={index}
            style={{
              ...commonStyle,
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            {element.columns?.map((column: any, idx: number) => (
              <div
                key={idx}
                style={{
                  flex: column.width === 'stretch' ? '1' :
                        column.width === 'auto' ? '0 0 auto' :
                        typeof column.width === 'string' && column.width.endsWith('px') ? `0 0 ${column.width}` :
                        typeof column.width === 'number' ? column.width :
                        column.width || '1',
                  minWidth: '0',
                  padding: getSpacing('small')
                }}
              >
                {column.items?.map((item: any, itemIdx: number) => renderElement(item, itemIdx))}
              </div>
            ))}
          </div>
        );

      case 'FactSet':
        return (
          <div key={index} style={commonStyle}>
            {element.facts?.map((fact: any, idx: number) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  marginBottom: '4px',
                  gap: '8px'
                }}
              >
                <span style={{ fontWeight: '600', minWidth: '120px' }}>
                  {fact.title}
                </span>
                <span>{fact.value}</span>
              </div>
            ))}
          </div>
        );

      case 'Table':
        return (
          <div key={index} style={{ ...commonStyle, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {element.columns && (
                <thead>
                  <tr>
                    {element.columns.map((col: any, idx: number) => (
                      <th
                        key={idx}
                        style={{
                          padding: '8px',
                          borderBottom: '2px solid #e1e1e1',
                          textAlign: 'left',
                          fontWeight: '600'
                        }}
                      >
                        {col.title}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {element.rows?.map((row: any, rowIdx: number) => (
                  <tr key={rowIdx}>
                    {row.cells?.map((cell: any, cellIdx: number) => (
                      <td
                        key={cellIdx}
                        style={{
                          padding: '8px',
                          borderBottom: '1px solid #e1e1e1'
                        }}
                      >
                        {cell.items?.map((item: any, itemIdx: number) => renderElement(item, itemIdx))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case 'ActionSet':
        return (
          <div 
            key={index}
            style={{
              ...commonStyle,
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: element.horizontalAlignment === 'right' ? 'flex-end' :
                             element.horizontalAlignment === 'center' ? 'center' : 'flex-start'
            }}
          >
            {element.actions?.map((action: any, idx: number) => renderAction(action, idx))}
          </div>
        );

      // Input Elements
      case 'Input.Text':
        return (
          <div key={index} style={commonStyle}>
            {element.label && (
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontWeight: '500',
                fontSize: '14px'
              }}>
                {element.label}
                {element.isRequired && <span style={{ color: '#d13438' }}>*</span>}
              </label>
            )}
            {element.isMultiline ? (
              <textarea
                id={element.id}
                placeholder={element.placeholder}
                defaultValue={element.value || formData[element.id] || ''}
                maxLength={element.maxLength}
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '16px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none'
                }}
                onChange={(e) => handleInputChange(element.id, e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#0078d4'}
                onBlur={(e) => e.target.style.borderColor = '#ccc'}
              />
            ) : (
              <input
                type={element.style === 'password' ? 'password' : 
                      element.style === 'email' ? 'email' :
                      element.style === 'tel' ? 'tel' :
                      element.style === 'url' ? 'url' : 'text'}
                id={element.id}
                placeholder={element.placeholder}
                defaultValue={element.value || formData[element.id] || ''}
                maxLength={element.maxLength}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '16px',
                  outline: 'none'
                }}
                onChange={(e) => handleInputChange(element.id, e.target.value)}
                onFocus={(e) => e.target.style.borderColor = '#0078d4'}
                onBlur={(e) => e.target.style.borderColor = '#ccc'}
              />
            )}
            {element.errorMessage && (
              <div style={{ color: '#d13438', fontSize: '12px', marginTop: '4px' }}>
                {element.errorMessage}
              </div>
            )}
          </div>
        );

      case 'Input.Number':
        return (
          <div key={index} style={commonStyle}>
            {element.label && (
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontWeight: '500',
                fontSize: '14px'
              }}>
                {element.label}
                {element.isRequired && <span style={{ color: '#d13438' }}>*</span>}
              </label>
            )}
            <input
              type="number"
              id={element.id}
              placeholder={element.placeholder}
              defaultValue={element.value || formData[element.id] || ''}
              min={element.min}
              max={element.max}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px',
                outline: 'none'
              }}
              onChange={(e) => handleInputChange(element.id, parseFloat(e.target.value) || 0)}
              onFocus={(e) => e.target.style.borderColor = '#0078d4'}
              onBlur={(e) => e.target.style.borderColor = '#ccc'}
            />
          </div>
        );

      case 'Input.Date':
        return (
          <div key={index} style={commonStyle}>
            {element.label && (
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontWeight: '500',
                fontSize: '14px'
              }}>
                {element.label}
                {element.isRequired && <span style={{ color: '#d13438' }}>*</span>}
              </label>
            )}
            <input
              type="date"
              id={element.id}
              defaultValue={element.value || formData[element.id] || ''}
              min={element.min}
              max={element.max}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px',
                outline: 'none'
              }}
              onChange={(e) => handleInputChange(element.id, e.target.value)}
              onFocus={(e) => e.target.style.borderColor = '#0078d4'}
              onBlur={(e) => e.target.style.borderColor = '#ccc'}
            />
          </div>
        );

      case 'Input.Time':
        return (
          <div key={index} style={commonStyle}>
            {element.label && (
              <label style={{ 
                display: 'block', 
                marginBottom: '4px', 
                fontWeight: '500',
                fontSize: '14px'
              }}>
                {element.label}
                {element.isRequired && <span style={{ color: '#d13438' }}>*</span>}
              </label>
            )}
            <input
              type="time"
              id={element.id}
              defaultValue={element.value || formData[element.id] || ''}
              min={element.min}
              max={element.max}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontSize: '16px',
                outline: 'none'
              }}
              onChange={(e) => handleInputChange(element.id, e.target.value)}
              onFocus={(e) => e.target.style.borderColor = '#0078d4'}
              onBlur={(e) => e.target.style.borderColor = '#ccc'}
            />
          </div>
        );

      case 'Input.Toggle':
        return (
          <div key={index} style={{ ...commonStyle, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id={element.id}
              defaultChecked={element.value === 'true' || element.value === true || formData[element.id]}
              style={{
                width: '18px',
                height: '18px',
                accentColor: '#0078d4'
              }}
              onChange={(e) => handleInputChange(element.id, e.target.checked)}
            />
            <label htmlFor={element.id} style={{ fontSize: '16px', cursor: 'pointer' }}>
              {element.title}
              {element.isRequired && <span style={{ color: '#d13438' }}>*</span>}
            </label>
          </div>
        );

      case 'Input.ChoiceSet':
        const getChoiceValue = () => {
          if (element.value) {
            // Microsoft format: multi-select values are comma-separated string like "1,3"
            if (element.isMultiSelect && typeof element.value === 'string') {
              return element.value.split(',').map(v => v.trim());
            }
            return element.value;
          }
          return formData[element.id] || (element.isMultiSelect ? [] : '');
        };

        return (
          <div key={index} style={commonStyle}>
            {element.label && (
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                fontSize: '14px',
                color: '#323130'
              }}>
                {element.label}
                {element.isRequired && <span style={{ color: '#d13438', marginLeft: '2px' }}>*</span>}
              </label>
            )}
            
            {/* Style: compact (dropdown) */}
            {(element.style === 'compact' || !element.style) ? (
              element.isMultiSelect ? (
                // Compact Multi-Select (like Microsoft's implementation)
                <div style={{
                  position: 'relative',
                  width: '100%'
                }}>
                  <div style={{
                    minHeight: '32px',
                    padding: '6px 32px 6px 12px',
                    border: '1px solid #8a8886',
                    borderRadius: '2px',
                    backgroundColor: 'white',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    position: 'relative'
                  }}>
                    <span style={{ 
                      color: getChoiceValue().length > 0 ? '#323130' : '#605e5c',
                      flex: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {getChoiceValue().length > 0 
                        ? element.choices?.filter((c: any) => getChoiceValue().includes(c.value))
                            .map((c: any) => c.title).join(', ')
                        : element.placeholder || 'Choose options'
                      }
                    </span>
                    <span style={{
                      position: 'absolute',
                      right: '8px',
                      fontSize: '12px',
                      color: '#605e5c'
                    }}>▼</span>
                  </div>
                  <select
                    id={element.id}
                    multiple
                    value={getChoiceValue()}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                    onChange={(e) => {
                      const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                      handleInputChange(element.id, selectedValues);
                    }}
                  >
                    {element.choices?.map((choice: any, idx: number) => (
                      <option key={idx} value={choice.value}>
                        {choice.title}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                // Compact Single Select (dropdown)
                <select
                  id={element.id}
                  value={getChoiceValue()}
                  style={{
                    width: '100%',
                    minHeight: '32px',
                    padding: '6px 32px 6px 12px',
                    border: '1px solid #8a8886',
                    borderRadius: '2px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  onChange={(e) => handleInputChange(element.id, e.target.value)}
                  onFocus={(e) => e.target.style.borderColor = '#0078d4'}
                  onBlur={(e) => e.target.style.borderColor = '#8a8886'}
                >
                  {element.placeholder && (
                    <option value="" disabled>
                      {element.placeholder}
                    </option>
                  )}
                  {element.choices?.map((choice: any, idx: number) => (
                    <option key={idx} value={choice.value}>
                      {choice.title}
                    </option>
                  ))}
                </select>
              )
            ) : 
            /* Style: expanded (radio buttons/checkboxes) */
            element.style === 'expanded' ? (
              <div 
                role={element.isMultiSelect ? 'group' : 'radiogroup'}
                aria-labelledby={element.label ? `${element.id}-label` : undefined}
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '12px',
                  marginTop: '8px'
                }}
              >
                {element.choices?.map((choice: any, idx: number) => {
                  const inputId = `${element.id}-choice-${idx}`;
                  const isChecked = element.isMultiSelect 
                    ? getChoiceValue().includes(choice.value)
                    : getChoiceValue() === choice.value;

                  return (
                    <div 
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        cursor: 'pointer',
                        padding: '4px 0'
                      }}
                      onClick={() => {
                        if (element.isMultiSelect) {
                          const currentValues = getChoiceValue();
                          const newValues = currentValues.includes(choice.value)
                            ? currentValues.filter((v: any) => v !== choice.value)
                            : [...currentValues, choice.value];
                          handleInputChange(element.id, newValues);
                        } else {
                          handleInputChange(element.id, choice.value);
                        }
                      }}
                    >
                      <div style={{
                        position: 'relative',
                        width: '20px',
                        height: '20px',
                        marginTop: '2px'
                      }}>
                        <input
                          type={element.isMultiSelect ? 'checkbox' : 'radio'}
                          id={inputId}
                          name={element.isMultiSelect ? undefined : element.id}
                          value={choice.value}
                          checked={isChecked}
                          onChange={() => {}} // Handled by parent div onClick
                          style={{
                            width: '20px',
                            height: '20px',
                            margin: 0,
                            accentColor: '#0078d4',
                            cursor: 'pointer'
                          }}
                          tabIndex={-1} // Use parent div for keyboard navigation
                        />
                      </div>
                      <label 
                        htmlFor={inputId}
                        style={{ 
                          fontSize: '14px',
                          color: '#323130',
                          cursor: 'pointer',
                          flex: 1,
                          lineHeight: '20px',
                          wordWrap: element.wrap !== false ? 'break-word' : 'normal',
                          whiteSpace: element.wrap === false ? 'nowrap' : 'normal'
                        }}
                      >
                        {choice.title}
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : 
            /* Style: filtered (search/typeahead) - Future implementation */
            element.style === 'filtered' ? (
              <div style={{
                padding: '16px',
                backgroundColor: '#fff4e6',
                border: '1px solid #ffcc02',
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                🚧 Filtered style (typeahead search) is not yet implemented
              </div>
            ) : null}
            
            {/* Error message */}
            {element.errorMessage && (
              <div style={{ 
                color: '#d13438', 
                fontSize: '12px', 
                marginTop: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>⚠️</span>
                {element.errorMessage}
              </div>
            )}
            
            {/* Required field indicator */}
            {element.isRequired && !getChoiceValue() && (
              <div style={{ 
                color: '#605e5c', 
                fontSize: '12px', 
                marginTop: '4px',
                fontStyle: 'italic'
              }}>
                This field is required
              </div>
            )}
          </div>
        );

      default:
        console.warn(`Unsupported element type: ${element.type}`);
        return (
          <div key={index} style={{ ...commonStyle, padding: '8px', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px' }}>
            <strong>Unsupported Element:</strong> {element.type}
            <pre style={{ fontSize: '12px', marginTop: '4px', overflow: 'auto' }}>
              {JSON.stringify(element, null, 2)}
            </pre>
          </div>
        );
    }
  };

  const renderAction = (action: any, index: number) => {
    const baseButtonStyle = {
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '500',
      transition: 'background-color 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    };

    const getButtonStyle = () => {
      switch (action.style) {
        case 'positive':
          return {
            ...baseButtonStyle,
            backgroundColor: '#107c10',
            color: 'white'
          };
        case 'destructive':
          return {
            ...baseButtonStyle,
            backgroundColor: '#d13438',
            color: 'white'
          };
        default:
          return {
            ...baseButtonStyle,
            backgroundColor: '#0078d4',
            color: 'white'
          };
      }
    };

    return (
      <div key={index}>
        <button
          style={getButtonStyle()}
          onClick={() => handleAction(action)}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement;
            const currentBg = target.style.backgroundColor;
            if (currentBg.includes('rgb(16, 124, 16)')) {
              target.style.backgroundColor = '#0e6e0e';
            } else if (currentBg.includes('rgb(209, 52, 56)')) {
              target.style.backgroundColor = '#b92b2f';
            } else {
              target.style.backgroundColor = '#106ebe';
            }
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement;
            switch (action.style) {
              case 'positive':
                target.style.backgroundColor = '#107c10';
                break;
              case 'destructive':
                target.style.backgroundColor = '#d13438';
                break;
              default:
                target.style.backgroundColor = '#0078d4';
            }
          }}
        >
          {action.iconUrl && (
            <img 
              src={action.iconUrl} 
              alt="" 
              style={{ width: '16px', height: '16px' }} 
            />
          )}
          {action.title}
        </button>
        
        {/* ShowCard functionality */}
        {action.type === 'Action.ShowCard' && action.card && showCards[action.id] && (
          <div style={{
            marginTop: '12px',
            padding: '16px',
            border: '1px solid #e1e1e1',
            borderRadius: '4px',
            backgroundColor: '#f9f9f9'
          }}>
            <AdvancedCardRenderer
              card={action.card}
              onAction={onAction}
              onInputChange={onInputChange}
            />
          </div>
        )}
      </div>
    );
  };

  if (!card) {
    return <div style={{ color: '#666', fontStyle: 'italic' }}>No card data</div>;
  }

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      lineHeight: '1.5',
      color: '#333',
      backgroundColor: 'white',
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid #e1e1e1',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      {card.body?.map((element: any, index: number) => renderElement(element, index))}
      
      {card.actions && card.actions.length > 0 && (
        <div style={{
          marginTop: card.body && card.body.length > 0 ? '16px' : '0',
          paddingTop: card.body && card.body.length > 0 ? '16px' : '0',
          borderTop: card.body && card.body.length > 0 ? '1px solid #e1e1e1' : 'none',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {card.actions.map((action: any, index: number) => renderAction(action, index))}
        </div>
      )}
    </div>
  );
};