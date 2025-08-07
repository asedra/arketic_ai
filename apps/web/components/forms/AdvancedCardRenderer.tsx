'use client';

import React, { useState, useCallback } from 'react';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LoadingSpinner } from '@/components/ui/loading';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/lib/hooks';
import { cn } from '@/lib/utils';

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
  // App integration
  const { user } = useAuth();
  const { toast } = useNotifications();
  
  // Component state
  const [formData, setFormData] = useState<FormData>({});
  const [showCards, setShowCards] = useState<{[key: string]: boolean}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const handleInputChange = useCallback((id: string, value: any) => {
    const newFormData = { ...formData, [id]: value };
    setFormData(newFormData);
    onInputChange?.(id, value);
  }, [formData, onInputChange]);

  const handleAction = useCallback(async (action: any) => {
    try {
      setErrors({});
      
      switch (action.type) {
        case 'Action.Submit':
          setIsSubmitting(true);
          
          // Basic form validation
          const requiredFields = card?.body?.filter((element: any) => 
            element.properties?.isRequired && element.id
          ) || [];
          
          const newErrors: {[key: string]: string} = {};
          for (const field of requiredFields) {
            if (!formData[field.id] && formData[field.id] !== 0) {
              newErrors[field.id] = 'This field is required';
            }
          }
          
          if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            toast.error('Please fill in all required fields');
            return;
          }
          
          const submitData = { 
            ...formData, 
            ...action.data,
            submittedBy: user?.id,
            submittedAt: new Date().toISOString()
          };
          
          if (onAction) {
            await onAction(action, submitData);
          }
          
          toast.success('Form submitted successfully');
          break;
          
        case 'Action.OpenUrl':
          if (!action.url) {
            toast.error('No URL specified');
            return;
          }
          window.open(action.url, action.targetElements === 'same' ? '_self' : '_blank');
          break;
          
        case 'Action.ShowCard':
          const cardId = action.id || `showcard-${Math.random()}`;
          setShowCards(prev => ({ ...prev, [cardId]: !prev[cardId] }));
          break;
          
        case 'Action.Execute':
        case 'Action.Refresh':
          if (onAction) {
            await onAction(action, formData);
          }
          break;
          
        default:
          if (onAction) {
            await onAction(action, formData);
          }
      }
    } catch (error) {
      console.error('Action failed:', error);
      toast.error(error instanceof Error ? error.message : 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onAction, card?.body, user?.id, toast]);

  // Text size mapping
  const getTextSize = (size?: string) => {
    switch (size?.toLowerCase()) {
      case 'small': return 'text-sm';
      case 'default': return 'text-base';
      case 'medium': return 'text-lg';
      case 'large': return 'text-xl';
      case 'extralarge': return 'text-2xl';
      default: return 'text-base';
    }
  };

  // Color mapping
  const getTextColor = (color?: string) => {
    switch (color?.toLowerCase()) {
      case 'default': return 'text-gray-900';
      case 'dark': return 'text-black';
      case 'light': return 'text-gray-600';
      case 'accent': return 'text-blue-600';
      case 'good': return 'text-green-600';
      case 'warning': return 'text-orange-600';
      case 'attention': return 'text-red-600';
      default: return 'text-gray-900';
    }
  };

  // Weight mapping
  const getFontWeight = (weight?: string) => {
    switch (weight?.toLowerCase()) {
      case 'lighter': return 'font-light';
      case 'default': return 'font-normal';
      case 'bolder': return 'font-bold';
      default: return 'font-normal';
    }
  };

  // Horizontal alignment
  const getAlignment = (alignment?: string) => {
    switch (alignment?.toLowerCase()) {
      case 'left': return 'text-left';
      case 'center': return 'text-center';
      case 'right': return 'text-right';
      default: return 'text-left';
    }
  };

  // Spacing mapping
  const getSpacing = (spacing?: string) => {
    switch (spacing?.toLowerCase()) {
      case 'none': return '';
      case 'small': return 'mt-1';
      case 'default': return 'mt-2';
      case 'medium': return 'mt-4';
      case 'large': return 'mt-6';
      case 'extralarge': return 'mt-8';
      default: return 'mt-2';
    }
  };

  // Render individual elements
  const renderElement = (element: any, index: number = 0): React.ReactNode => {
    const spacingClass = index > 0 ? getSpacing(element.spacing) : '';
    const separatorClass = element.separator ? 'border-t border-gray-200 pt-2' : '';

    switch (element.type) {
      case 'TextBlock':
        return (
          <div 
            key={index}
            className={`
              ${spacingClass} 
              ${separatorClass}
              ${getTextSize(element.size)}
              ${getTextColor(element.color)}
              ${getFontWeight(element.weight)}
              ${getAlignment(element.horizontalAlignment)}
              ${element.isSubtle ? 'opacity-70 italic' : ''}
              ${element.wrap === false ? 'whitespace-nowrap overflow-hidden text-ellipsis' : 'break-words'}
            `}
            style={{
              maxHeight: element.maxLines ? `${parseInt(element.maxLines) * 1.5}em` : 'none',
              overflow: element.maxLines ? 'hidden' : 'visible',
            }}
          >
            {element.text}
          </div>
        );

      case 'RichTextBlock':
        return (
          <div 
            key={index}
            className={`${spacingClass} ${separatorClass} ${getTextSize(element.size)} ${getAlignment(element.horizontalAlignment)}`}
          >
            {element.inlines?.map((inline: any, idx: number) => (
              <span
                key={idx}
                className={`
                  ${getTextSize(inline.size)}
                  ${getTextColor(inline.color)}
                  ${getFontWeight(inline.weight)}
                  ${inline.italic ? 'italic' : ''}
                  ${inline.strikethrough ? 'line-through' : ''}
                  ${inline.underline ? 'underline' : ''}
                `}
              >
                {inline.text}
              </span>
            ))}
          </div>
        );

      case 'Image':
        const getImageSize = () => {
          if (element.pixelWidth) return `w-[${element.pixelWidth}px]`;
          switch (element.size?.toLowerCase()) {
            case 'small': return 'w-8';
            case 'medium': return 'w-16';
            case 'large': return 'w-32';
            default: return 'w-auto';
          }
        };

        return (
          <div 
            key={index}
            className={`${spacingClass} ${separatorClass} flex ${getAlignment(element.horizontalAlignment).replace('text-', 'justify-')}`}
          >
            <img
              src={element.url}
              alt={element.altText || ''}
              className={`
                ${getImageSize()}
                ${element.pixelHeight ? `h-[${element.pixelHeight}px]` : 'h-auto'}
                ${element.style === 'person' ? 'rounded-full' : 'rounded'}
                max-w-full
              `}
            />
          </div>
        );

      case 'ImageSet':
        return (
          <div 
            key={index}
            className={`${spacingClass} ${separatorClass} flex flex-wrap gap-2`}
          >
            {element.images?.map((img: any, idx: number) => {
              const imageSize = element.imageSize === 'small' ? 'w-8 h-8' :
                              element.imageSize === 'medium' ? 'w-16 h-16' :
                              element.imageSize === 'large' ? 'w-32 h-32' : 'w-16 h-16';
              
              return (
                <img
                  key={idx}
                  src={img.url}
                  alt={img.altText || ''}
                  className={`${imageSize} object-cover rounded`}
                />
              );
            })}
          </div>
        );

      case 'Container':
        const getContainerBg = () => {
          switch (element.style?.toLowerCase()) {
            case 'emphasis': return 'bg-gray-50';
            case 'good': return 'bg-green-50';
            case 'attention': return 'bg-red-50';
            case 'warning': return 'bg-orange-50';
            case 'accent': return 'bg-blue-50';
            default: return 'bg-transparent';
          }
        };

        return (
          <div 
            key={index}
            className={`
              ${spacingClass} 
              ${separatorClass}
              ${getContainerBg()}
              ${element.style ? 'border border-gray-200 rounded p-4' : 'p-2'}
            `}
            style={{
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
            className={`${spacingClass} ${separatorClass} flex gap-3 flex-wrap`}
          >
            {element.columns?.map((column: any, idx: number) => {
              const getColumnWidth = () => {
                if (column.width === 'stretch') return 'flex-1';
                if (column.width === 'auto') return 'flex-none';
                if (typeof column.width === 'string' && column.width.endsWith('px')) return `w-[${column.width}]`;
                if (typeof column.width === 'number') return `flex-[${column.width}]`;
                return 'flex-1';
              };

              return (
                <div
                  key={idx}
                  className={`${getColumnWidth()} min-w-0 p-1`}
                >
                  {column.items?.map((item: any, itemIdx: number) => renderElement(item, itemIdx))}
                </div>
              );
            })}
          </div>
        );

      case 'FactSet':
        return (
          <div key={index} className={`${spacingClass} ${separatorClass}`}>
            {element.facts?.map((fact: any, idx: number) => (
              <div
                key={idx}
                className="flex mb-1 gap-2"
              >
                <span className="font-semibold min-w-[120px] text-gray-700">
                  {fact.title}
                </span>
                <span className="text-gray-900">{fact.value}</span>
              </div>
            ))}
          </div>
        );

      case 'Table':
        return (
          <div key={index} className={`${spacingClass} ${separatorClass} overflow-x-auto`}>
            <table className="w-full border-collapse">
              {element.columns && (
                <thead>
                  <tr>
                    {element.columns.map((col: any, idx: number) => (
                      <th
                        key={idx}
                        className="p-2 border-b-2 border-gray-200 text-left font-semibold text-gray-700"
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
                        className="p-2 border-b border-gray-100"
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
        const getActionAlignment = () => {
          switch (element.horizontalAlignment) {
            case 'right': return 'justify-end';
            case 'center': return 'justify-center';
            default: return 'justify-start';
          }
        };

        return (
          <div 
            key={index}
            className={`${spacingClass} ${separatorClass} flex gap-2 flex-wrap ${getActionAlignment()}`}
          >
            {element.actions?.map((action: any, idx: number) => renderAction(action, idx))}
          </div>
        );

      // Input Elements
      case 'Input.Text':
        return (
          <div key={index} className={`${spacingClass} ${separatorClass}`}>
            {element.label && (
              <label className="block mb-1 font-medium text-sm text-gray-700">
                {element.label}
                {element.isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            {element.isMultiline ? (
              <textarea
                id={element.id}
                placeholder={element.placeholder}
                defaultValue={element.value || formData[element.id] || ''}
                maxLength={element.maxLength}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                onChange={(e) => handleInputChange(element.id, e.target.value)}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={(e) => handleInputChange(element.id, e.target.value)}
              />
            )}
            {(element.errorMessage || errors[element.id]) && (
              <div className="text-red-500 dark:text-red-400 text-sm mt-1 flex items-center gap-1">
                <span className="text-xs">⚠️</span>
                {element.errorMessage || errors[element.id]}
              </div>
            )}
          </div>
        );

      case 'Input.Number':
        return (
          <div key={index} className={`${spacingClass} ${separatorClass}`}>
            {element.label && (
              <label className="block mb-1 font-medium text-sm text-gray-700">
                {element.label}
                {element.isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            <input
              type="number"
              id={element.id}
              placeholder={element.placeholder}
              defaultValue={element.value || formData[element.id] || ''}
              min={element.min}
              max={element.max}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => handleInputChange(element.id, parseFloat(e.target.value) || 0)}
            />
          </div>
        );

      case 'Input.Date':
        return (
          <div key={index} className={`${spacingClass} ${separatorClass}`}>
            {element.label && (
              <label className="block mb-1 font-medium text-sm text-gray-700">
                {element.label}
                {element.isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            <input
              type="date"
              id={element.id}
              defaultValue={element.value || formData[element.id] || ''}
              min={element.min}
              max={element.max}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => handleInputChange(element.id, e.target.value)}
            />
          </div>
        );

      case 'Input.Time':
        return (
          <div key={index} className={`${spacingClass} ${separatorClass}`}>
            {element.label && (
              <label className="block mb-1 font-medium text-sm text-gray-700">
                {element.label}
                {element.isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            <input
              type="time"
              id={element.id}
              defaultValue={element.value || formData[element.id] || ''}
              min={element.min}
              max={element.max}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onChange={(e) => handleInputChange(element.id, e.target.value)}
            />
          </div>
        );

      case 'Input.Toggle':
        return (
          <div key={index} className={`${spacingClass} ${separatorClass} flex items-center gap-2`}>
            <input
              type="checkbox"
              id={element.id}
              defaultChecked={element.value === 'true' || element.value === true || formData[element.id]}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              onChange={(e) => handleInputChange(element.id, e.target.checked)}
            />
            <label htmlFor={element.id} className="text-base cursor-pointer text-gray-700">
              {element.title}
              {element.isRequired && <span className="text-red-500 ml-1">*</span>}
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
          <div key={index} className={`${spacingClass} ${separatorClass}`}>
            {element.label && (
              <label className="block mb-2 font-semibold text-sm text-gray-800">
                {element.label}
                {element.isRequired && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
            
            {/* Style: compact (dropdown) */}
            {(element.style === 'compact' || !element.style) ? (
              element.isMultiSelect ? (
                // Compact Multi-Select
                <div className="relative w-full">
                  <div className="min-h-8 px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm flex items-center cursor-pointer relative">
                    <span className={`flex-1 truncate ${getChoiceValue().length > 0 ? 'text-gray-800' : 'text-gray-500'}`}>
                      {getChoiceValue().length > 0 
                        ? element.choices?.filter((c: any) => getChoiceValue().includes(c.value))
                            .map((c: any) => c.title).join(', ')
                        : element.placeholder || 'Choose options'
                      }
                    </span>
                    <span className="absolute right-2 text-xs text-gray-500">▼</span>
                  </div>
                  <select
                    id={element.id}
                    multiple
                    value={getChoiceValue()}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
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
                  className="w-full min-h-8 px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                  onChange={(e) => handleInputChange(element.id, e.target.value)}
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
              <div className="flex flex-col gap-3 mt-2">
                {element.choices?.map((choice: any, idx: number) => {
                  const inputId = `${element.id}-choice-${idx}`;
                  const isChecked = element.isMultiSelect 
                    ? getChoiceValue().includes(choice.value)
                    : getChoiceValue() === choice.value;

                  return (
                    <div 
                      key={idx}
                      className="flex items-start gap-2 cursor-pointer p-1"
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
                      <div className="relative w-5 h-5 mt-0.5">
                        <input
                          type={element.isMultiSelect ? 'checkbox' : 'radio'}
                          id={inputId}
                          name={element.isMultiSelect ? undefined : element.id}
                          value={choice.value}
                          checked={isChecked}
                          onChange={() => {}} // Handled by parent div onClick
                          className="w-5 h-5 text-blue-600 cursor-pointer focus:ring-2 focus:ring-blue-500"
                          tabIndex={-1} // Use parent div for keyboard navigation
                        />
                      </div>
                      <label 
                        htmlFor={inputId}
                        className="text-sm text-gray-800 cursor-pointer flex-1 leading-5"
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
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
                🚧 Filtered style (typeahead search) is not yet implemented
              </div>
            ) : null}
            
            {/* Error message */}
            {element.errorMessage && (
              <div className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠️</span>
                {element.errorMessage}
              </div>
            )}
            
            {/* Required field indicator */}
            {element.isRequired && !getChoiceValue() && (
              <div className="text-gray-500 text-xs mt-1 italic">
                This field is required
              </div>
            )}
          </div>
        );

      default:
        console.warn(`Unsupported element type: ${element.type}`);
        return (
          <div key={index} className={`${spacingClass} ${separatorClass} p-2 bg-yellow-50 border border-yellow-200 rounded`}>
            <strong>Unsupported Element:</strong> {element.type}
            <pre className="text-xs mt-1 overflow-auto bg-gray-100 p-2 rounded">
              {JSON.stringify(element, null, 2)}
            </pre>
          </div>
        );
    }
  };

  const renderAction = (action: any, index: number) => {
    const getButtonStyle = () => {
      const baseClasses = "px-4 py-2 rounded font-medium text-sm transition-colors flex items-center gap-1.5";
      
      switch (action.style) {
        case 'positive':
          return `${baseClasses} bg-green-600 text-white hover:bg-green-700`;
        case 'destructive':
          return `${baseClasses} bg-red-600 text-white hover:bg-red-700`;
        default:
          return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700`;
      }
    };

    return (
      <div key={index}>
        <button
          className={getButtonStyle()}
          onClick={() => handleAction(action)}
        >
          {action.iconUrl && (
            <img 
              src={action.iconUrl} 
              alt="" 
              className="w-4 h-4" 
            />
          )}
          {action.title}
        </button>
        
        {/* ShowCard functionality */}
        {action.type === 'Action.ShowCard' && action.card && showCards[action.id] && (
          <div className="mt-3 p-4 border border-gray-200 rounded bg-gray-50">
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
    return (
      <div className="text-slate-500 dark:text-slate-400 italic text-center py-8">
        <div className="text-4xl mb-2">📄</div>
        <p>No card data available</p>
      </div>
    );
  }

  return (
    <ErrorBoundary level="component" context={{ cardType: card.type, elementsCount: card.body?.length }}>
      <div className={cn(
        "font-sans leading-relaxed transition-colors",
        "text-slate-900 dark:text-slate-100",
        "bg-white dark:bg-slate-900",
        "p-4 rounded-lg border border-slate-200 dark:border-slate-700",
        "max-w-full"
      )}>
        {card.body?.map((element: any, index: number) => (
          <ErrorBoundary key={index} level="component" context={{ elementType: element.type, elementIndex: index }}>
            {renderElement(element, index)}
          </ErrorBoundary>
        ))}
        
        {card.actions && card.actions.length > 0 && (
          <div className={cn(
            "flex gap-2 flex-wrap",
            card.body && card.body.length > 0 && "mt-4 pt-4 border-t border-slate-200 dark:border-slate-700"
          )}>
            {card.actions.map((action: any, index: number) => (
              <ErrorBoundary key={index} level="component" context={{ actionType: action.type }}>
                {renderAction(action, index)}
              </ErrorBoundary>
            ))}
          </div>
        )}
        
        {/* Loading overlay for form submission */}
        {isSubmitting && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-lg">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
              <LoadingSpinner size="sm" text="Submitting..." />
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};