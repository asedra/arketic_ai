import React, { useState, useRef, useCallback, useMemo } from 'react';
import { AdvancedCardRenderer } from './AdvancedCardRenderer';

interface Element {
  id: string;
  type: string;
  properties: any;
}

interface DesignerElement extends Element {
  children?: DesignerElement[];
}

const AdaptiveCardDesigner: React.FC = () => {
  const [cardElements, setCardElements] = useState<DesignerElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<DesignerElement | null>(null);
  const [draggedElement, setDraggedElement] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  // Element Templates
  const elementTemplates = useMemo(() => ({
    // Layout Elements
    textblock: {
      type: 'TextBlock',
      properties: {
        text: 'Sample text',
        size: 'Default',
        weight: 'Default',
        color: 'Default',
        isSubtle: false,
        wrap: true,
        spacing: 'Default'
      },
      icon: '📝',
      category: 'Layout',
      name: 'Text Block'
    },
    richtextblock: {
      type: 'RichTextBlock',
      properties: {
        inlines: [
          { type: 'TextRun', text: 'Rich text with ', size: 'Default' },
          { type: 'TextRun', text: 'formatting', weight: 'Bolder', color: 'Accent' }
        ],
        spacing: 'Default'
      },
      icon: '📄',
      category: 'Layout',
      name: 'Rich Text'
    },
    image: {
      type: 'Image',
      properties: {
        url: 'https://via.placeholder.com/100x100?text=Image',
        altText: 'Sample image',
        size: 'Medium',
        style: 'Default',
        horizontalAlignment: 'Left',
        spacing: 'Default'
      },
      icon: '🖼️',
      category: 'Layout',
      name: 'Image'
    },
    container: {
      type: 'Container',
      properties: {
        style: 'Default',
        spacing: 'Default',
        items: []
      },
      icon: '📦',
      category: 'Layout',
      name: 'Container',
      isContainer: true
    },
    columnset: {
      type: 'ColumnSet',
      properties: {
        columns: [
          {
            type: 'Column',
            width: 'stretch',
            items: []
          },
          {
            type: 'Column',
            width: 'stretch',
            items: []
          }
        ],
        spacing: 'Default'
      },
      icon: '📊',
      category: 'Layout',
      name: 'Columns',
      isContainer: true
    },
    factset: {
      type: 'FactSet',
      properties: {
        facts: [
          { title: 'Name:', value: 'John Doe' },
          { title: 'Email:', value: 'john@example.com' }
        ],
        spacing: 'Default'
      },
      icon: '📋',
      category: 'Layout',
      name: 'Fact Set'
    },
    table: {
      type: 'Table',
      properties: {
        columns: [
          { title: 'Name', width: 'stretch' },
          { title: 'Value', width: 'auto' }
        ],
        rows: [
          {
            cells: [
              { items: [{ type: 'TextBlock', text: 'Row 1' }] },
              { items: [{ type: 'TextBlock', text: 'Data 1' }] }
            ]
          }
        ],
        spacing: 'Default'
      },
      icon: '📊',
      category: 'Layout',
      name: 'Table'
    },

    // Input Elements
    inputtext: {
      type: 'Input.Text',
      properties: {
        id: 'textInput',
        label: 'Text Input',
        placeholder: 'Enter text...',
        value: '',
        isMultiline: false,
        isRequired: false,
        maxLength: null,
        style: 'text',
        spacing: 'Default'
      },
      icon: '📝',
      category: 'Input',
      name: 'Text Input'
    },
    inputnumber: {
      type: 'Input.Number',
      properties: {
        id: 'numberInput',
        label: 'Number Input',
        placeholder: 'Enter number...',
        value: null,
        min: null,
        max: null,
        isRequired: false,
        spacing: 'Default'
      },
      icon: '🔢',
      category: 'Input',
      name: 'Number Input'
    },
    inputdate: {
      type: 'Input.Date',
      properties: {
        id: 'dateInput',
        label: 'Date Input',
        value: '',
        min: '',
        max: '',
        isRequired: false,
        spacing: 'Default'
      },
      icon: '📅',
      category: 'Input',
      name: 'Date Input'
    },
    inputtime: {
      type: 'Input.Time',
      properties: {
        id: 'timeInput',
        label: 'Time Input',
        value: '',
        min: '',
        max: '',
        isRequired: false,
        spacing: 'Default'
      },
      icon: '🕐',
      category: 'Input',
      name: 'Time Input'
    },
    inputtoggle: {
      type: 'Input.Toggle',
      properties: {
        id: 'toggleInput',
        title: 'Toggle Option',
        value: 'false',
        valueOn: 'true',
        valueOff: 'false',
        isRequired: false,
        spacing: 'Default'
      },
      icon: '🔘',
      category: 'Input',
      name: 'Toggle'
    },
    inputchoiceset: {
      type: 'Input.ChoiceSet',
      properties: {
        id: 'choiceInput',
        label: 'Choice Set',
        placeholder: 'Select an option...',
        choices: [
          { title: 'Option 1', value: 'option1' },
          { title: 'Option 2', value: 'option2' },
          { title: 'Option 3', value: 'option3' }
        ],
        style: 'compact',
        isMultiSelect: false,
        value: '',
        isRequired: false,
        spacing: 'Default'
      },
      icon: '📋',
      category: 'Input',
      name: 'Choice Set'
    },

    // Actions
    actionset: {
      type: 'ActionSet',
      properties: {
        actions: [
          {
            type: 'Action.Submit',
            title: 'Submit',
            style: 'positive',
            data: { action: 'submit' }
          }
        ],
        spacing: 'Default'
      },
      icon: '🔘',
      category: 'Action',
      name: 'Action Set'
    }
  }), []);

  // Generate unique ID
  const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Handle drag start from palette
  const handleDragStart = (e: React.DragEvent, template: any) => {
    setDraggedElement(template);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // Handle drop on canvas
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedElement) return;

    const newElement: DesignerElement = {
      id: generateId(),
      type: draggedElement.type,
      properties: { ...draggedElement.properties },
      children: draggedElement.isContainer ? [] : undefined
    };

    setCardElements(prev => [...prev, newElement]);
    setSelectedElement(newElement);
    setDraggedElement(null);
  }, [draggedElement]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Update element properties
  const updateElementProperty = (elementId: string, property: string, value: any) => {
    const updateElement = (elements: DesignerElement[]): DesignerElement[] => {
      return elements.map(element => {
        if (element.id === elementId) {
          return {
            ...element,
            properties: { ...element.properties, [property]: value }
          };
        }
        if (element.children) {
          return {
            ...element,
            children: updateElement(element.children)
          };
        }
        return element;
      });
    };

    setCardElements(updateElement);
    
    // Update selected element if it's the one being modified
    if (selectedElement && selectedElement.id === elementId) {
      setSelectedElement({
        ...selectedElement,
        properties: { ...selectedElement.properties, [property]: value }
      });
    }
  };

  // Delete element
  const deleteElement = (elementId: string) => {
    const filterElement = (elements: DesignerElement[]): DesignerElement[] => {
      return elements.filter(element => element.id !== elementId).map(element => ({
        ...element,
        children: element.children ? filterElement(element.children) : undefined
      }));
    };

    setCardElements(filterElement);
    if (selectedElement?.id === elementId) {
      setSelectedElement(null);
    }
  };

  // Generate Adaptive Card JSON
  const generateAdaptiveCard = () => {
    const convertElement = (element: DesignerElement): any => {
      const result: any = {
        type: element.type,
        ...element.properties
      };

      // Handle containers
      if (element.type === 'Container' && element.children) {
        result.items = element.children.map(convertElement);
      }
      if (element.type === 'ColumnSet' && element.properties.columns) {
        result.columns = element.properties.columns.map((column: any, index: number) => ({
          ...column,
          items: element.children ? 
            element.children.filter((_, i) => i % element.properties.columns.length === index).map(convertElement) : 
            []
        }));
      }

      return result;
    };

    return {
      type: 'AdaptiveCard',
      version: '1.5',
      body: cardElements.map(convertElement),
      actions: []
    };
  };

  // AI form talebi state'i
  const [aiQuery, setAiQuery] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // AI Generated Card'ı import et
  const handleAIGenerate = (cardJson: any) => {
    // Mevcut card'ı temizle
    setCardElements([]);
    setSelectedElement(null);
    
    // AI card'ın body elementlerini convert et
    if (cardJson.body && Array.isArray(cardJson.body)) {
      const convertedElements: DesignerElement[] = cardJson.body.map((element: any) => ({
        id: generateId(),
        type: element.type,
        properties: { ...element },
        children: element.type === 'Container' ? [] : undefined
      }));
      
      setCardElements(convertedElements);
    }
    setShowAIGenerator(false);
  };

  // Basit AI Card Generation
  const generateAICard = () => {
    setIsAiGenerating(true);
    
    // Basit form analizi
    const queryLower = aiQuery.toLowerCase();
    const fields = [];
    
    // Form başlığını belirle
    let formTitle = '📋 Form';
    if (queryLower.includes('izin')) formTitle = '📅 İzin Başvuru Formu';
    else if (queryLower.includes('başvuru')) formTitle = '📝 Başvuru Formu';
    else if (queryLower.includes('şikayet')) formTitle = '📢 Şikayet Formu';

    // İsim alanı
    if (queryLower.includes('isim') || queryLower.includes('ad')) {
      fields.push({
        type: 'Input.Text',
        id: 'fullName',
        label: 'Ad Soyad',
        placeholder: 'Adınızı ve soyadınızı giriniz',
        isRequired: true,
        spacing: 'Medium'
      });
    }

    // Tarih alanları
    if (queryLower.includes('başlangıç') && queryLower.includes('tarih')) {
      fields.push({
        type: 'Input.Date',
        id: 'startDate',
        label: 'Başlangıç Tarihi',
        isRequired: true,
        spacing: 'Medium'
      });
    }
    if (queryLower.includes('bitiş') && queryLower.includes('tarih')) {
      fields.push({
        type: 'Input.Date',
        id: 'endDate', 
        label: 'Bitiş Tarihi',
        isRequired: true,
        spacing: 'Medium'
      });
    }

    // Email
    if (queryLower.includes('email') || queryLower.includes('eposta')) {
      fields.push({
        type: 'Input.Text',
        id: 'email',
        label: 'E-posta',
        placeholder: 'ornek@email.com',
        style: 'email',
        isRequired: true,
        spacing: 'Medium'
      });
    }

    // Neden/Açıklama
    if (queryLower.includes('neden') || queryLower.includes('açıklama')) {
      fields.push({
        type: 'Input.Text',
        id: 'reason',
        label: queryLower.includes('izin') ? 'İzin Nedeni' : 'Açıklama',
        placeholder: 'Detaylı açıklama yazınız...',
        isMultiline: true,
        isRequired: true,
        spacing: 'Medium'
      });
    }

    // En az bir alan yoksa varsayılan ekle
    if (fields.length === 0) {
      fields.push({
        type: 'Input.Text',
        id: 'description',
        label: 'Açıklama',
        placeholder: 'Açıklama yazınız...',
        isMultiline: true,
        isRequired: true,
        spacing: 'Medium'
      });
    }

    // Adaptive Card oluştur
    const adaptiveCard = {
      type: 'AdaptiveCard',
      version: '1.5',
      body: [
        {
          type: 'TextBlock',
          text: formTitle,
          size: 'Large',
          weight: 'Bolder',
          color: 'Accent'
        },
        {
          type: 'TextBlock',
          text: 'Lütfen aşağıdaki bilgileri doldurunuz',
          isSubtle: true,
          wrap: true,
          spacing: 'Small'
        },
        ...fields
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: '✅ Gönder',
          style: 'positive'
        }
      ]
    };

    setTimeout(() => {
      handleAIGenerate(adaptiveCard);
      setIsAiGenerating(false);
      setAiQuery('');
    }, 1500);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Element Palette */}
      <div style={{ 
        width: '280px', 
        backgroundColor: '#f8f9fa', 
        borderRight: '1px solid #dee2e6',
        overflowY: 'auto'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #dee2e6' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>🎨 Elements</h3>
          
          {/* AI Generator Button */}
          <button
            onClick={() => setShowAIGenerator(true)}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            🤖 AI Form Oluştur
          </button>
        </div>

        {/* Group elements by category */}
        {['Layout', 'Input', 'Action'].map(category => (
          <div key={category} style={{ margin: '16px' }}>
            <h4 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#6c757d',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {category}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(elementTemplates)
                .filter(([_, template]) => template.category === category)
                .map(([key, template]) => (
                  <div
                    key={key}
                    draggable
                    onDragStart={(e) => handleDragStart(e, template)}
                    style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      cursor: 'grab',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#0d6efd';
                      e.currentTarget.style.backgroundColor = '#f8f9ff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#dee2e6';
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{template.icon}</span>
                    <span style={{ fontWeight: '500' }}>{template.name}</span>
                  </div>
                ))
              }
            </div>
          </div>
        ))}
      </div>

      {/* Main Design Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: 'white', 
          borderBottom: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ← Back
            </button>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              🎯 Adaptive Card Designer
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                padding: '8px 16px',
                backgroundColor: showPreview ? '#0d6efd' : 'white',
                color: showPreview ? 'white' : '#0d6efd',
                border: '1px solid #0d6efd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showPreview ? '📝 Edit' : '👁️ Preview'}
            </button>
            <button
              onClick={() => setShowJson(!showJson)}
              style={{
                padding: '8px 16px',
                backgroundColor: showJson ? '#198754' : 'white',
                color: showJson ? 'white' : '#198754',
                border: '1px solid #198754',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {showJson ? '🎨 Design' : '📄 JSON'}
            </button>
            <button
              onClick={() => {
                setCardElements([]);
                setSelectedElement(null);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🗑️ Clear
            </button>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex' }}>
          {/* Canvas Area */}
          <div style={{ flex: 1, padding: '16px', backgroundColor: '#f8f9fa' }}>
            {showJson ? (
              <div style={{ height: '100%' }}>
                <textarea
                  readOnly
                  value={JSON.stringify(generateAdaptiveCard(), null, 2)}
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '16px',
                    border: '1px solid #dee2e6',
                    borderRadius: '8px',
                    fontFamily: 'Monaco, Consolas, monospace',
                    fontSize: '12px',
                    backgroundColor: 'white',
                    resize: 'none'
                  }}
                />
              </div>
            ) : showPreview ? (
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '16px',
                minHeight: '400px',
                border: '1px solid #dee2e6'
              }}>
                <AdvancedCardRenderer card={generateAdaptiveCard()} />
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  minHeight: '400px',
                  border: cardElements.length === 0 ? '2px dashed #adb5bd' : '1px solid #dee2e6',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '16px'
                }}
              >
                {cardElements.length === 0 ? (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6c757d',
                    fontSize: '18px',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
                      <div>Drag elements from the palette to start designing</div>
                      <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.7 }}>
                        Your Adaptive Card will appear here
                      </div>
                    </div>
                  </div>
                ) : (
                  cardElements.map((element, index) => (
                    <DesignElement
                      key={element.id}
                      element={element}
                      isSelected={selectedElement?.id === element.id}
                      onSelect={() => setSelectedElement(element)}
                      onDelete={() => deleteElement(element.id)}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Property Panel */}
          {selectedElement && !showPreview && !showJson && (
            <div style={{ 
              width: '320px', 
              backgroundColor: 'white', 
              borderLeft: '1px solid #dee2e6',
              overflowY: 'auto'
            }}>
              <PropertyPanel
                element={selectedElement}
                onUpdateProperty={updateElementProperty}
                onClose={() => setSelectedElement(null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* AI Card Generator Modal */}
      {showAIGenerator && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ 
                margin: 0, 
                fontSize: '24px', 
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                🤖 AI Form Oluşturucu
              </h2>
              <button
                onClick={() => setShowAIGenerator(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%'
                }}
              >
                ✕
              </button>
            </div>

            {/* Instructions */}
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #0ea5e9',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '20px'
            }}>
              <h3 style={{ margin: '0 0 8px 0', color: '#0c4a6e', fontSize: '16px' }}>
                💡 Nasıl Çalışır:
              </h3>
              <p style={{ margin: 0, color: '#0c4a6e', fontSize: '14px' }}>
                Form talebinizi yazın. AI otomatik olarak gerekli alanları tespit edip size özel bir form oluşturacak.
              </p>
            </div>

            {/* Example buttons */}
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>🎯 Hızlı Örnekler:</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  'İzin formu oluştur. Başlangıç tarihi, bitiş tarihi, izin nedeni olsun',
                  'Başvuru formu istiyorum. Ad soyad, email, açıklama olsun',
                  'Şikayet formu yapmak istiyorum. İsim, email, şikayet nedeni olsun'
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setAiQuery(example)}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e2e8f0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  >
                    {example.slice(0, 30)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '16px', fontWeight: '600' }}>
                Form Talebinizi Yazın:
              </label>
              <textarea
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Örnek: İzin formu istiyorum. İçerisinde izin başlangıç tarihi, izin bitiş tarihi, izin nedeni olsun..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAIGenerator(false)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                İptal
              </button>
              <button
                onClick={generateAICard}
                disabled={!aiQuery.trim() || isAiGenerating}
                style={{
                  padding: '12px 24px',
                  background: isAiGenerating ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isAiGenerating || !aiQuery.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isAiGenerating ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ffffff50',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Oluşturuluyor...
                  </>
                ) : (
                  '🚀 Form Oluştur'
                )}
              </button>
            </div>
          </div>

          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

// Design Element Component
interface DesignElementProps {
  element: DesignerElement;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const DesignElement: React.FC<DesignElementProps> = ({ element, isSelected, onSelect, onDelete }) => {
  const renderElementPreview = () => {
    const baseStyle = {
      padding: '8px',
      border: isSelected ? '2px solid #0d6efd' : '1px solid #dee2e6',
      borderRadius: '4px',
      backgroundColor: isSelected ? '#f8f9ff' : 'white',
      cursor: 'pointer',
      position: 'relative' as const,
      minHeight: '40px',
      display: 'flex',
      alignItems: 'center'
    };

    const deleteButtonStyle = {
      position: 'absolute' as const,
      top: '-8px',
      right: '-8px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: '#dc3545',
      color: 'white',
      border: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      display: isSelected ? 'flex' : 'none',
      alignItems: 'center',
      justifyContent: 'center'
    };

    return (
      <div style={baseStyle} onClick={onSelect}>
        <button style={deleteButtonStyle} onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          ×
        </button>
        
        {/* Element type indicator */}
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#6c757d',
          marginRight: '8px',
          minWidth: '80px'
        }}>
          {element.type}
        </div>
        
        {/* Element preview content */}
        <div style={{ flex: 1, fontSize: '14px' }}>
          {element.type === 'TextBlock' && element.properties.text}
          {element.type === 'Image' && '🖼️ Image'}
          {element.type === 'Input.Text' && `📝 ${element.properties.label || 'Text Input'}`}
          {element.type === 'Input.Number' && `🔢 ${element.properties.label || 'Number Input'}`}
          {element.type === 'Input.Date' && `📅 ${element.properties.label || 'Date Input'}`}
          {element.type === 'Input.Time' && `🕐 ${element.properties.label || 'Time Input'}`}
          {element.type === 'Input.Toggle' && `🔘 ${element.properties.title || 'Toggle'}`}
          {element.type === 'Input.ChoiceSet' && `📋 ${element.properties.label || 'Choice Set'}`}
          {element.type === 'Container' && `📦 Container (${element.children?.length || 0} items)`}
          {element.type === 'ColumnSet' && `📊 ${element.properties.columns?.length || 0} Columns`}
          {element.type === 'FactSet' && `📋 ${element.properties.facts?.length || 0} Facts`}
          {element.type === 'Table' && `📊 Table`}
          {element.type === 'ActionSet' && `🔘 ${element.properties.actions?.length || 0} Actions`}
        </div>
      </div>
    );
  };

  return renderElementPreview();
};

// Property Panel Component
interface PropertyPanelProps {
  element: DesignerElement;
  onUpdateProperty: (elementId: string, property: string, value: any) => void;
  onClose: () => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ element, onUpdateProperty, onClose }) => {
  const renderPropertyInput = (key: string, value: any, type: string = 'text') => {
    const inputStyle = {
      width: '100%',
      padding: '6px 8px',
      border: '1px solid #dee2e6',
      borderRadius: '4px',
      fontSize: '14px'
    };

    const handleChange = (newValue: any) => {
      onUpdateProperty(element.id, key, newValue);
    };

    // Handle choices array for Input.ChoiceSet
    if (key === 'choices' && element.type === 'Input.ChoiceSet') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(value || []).map((choice: any, index: number) => (
            <div key={index} style={{ 
              display: 'flex', 
              gap: '4px', 
              padding: '8px', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px',
              border: '1px solid #e9ecef'
            }}>
              <input
                type="text"
                placeholder="Title"
                value={choice.title || ''}
                onChange={(e) => {
                  const newChoices = [...(value || [])];
                  newChoices[index] = { ...choice, title: e.target.value };
                  handleChange(newChoices);
                }}
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="text"
                placeholder="Value"
                value={choice.value || ''}
                onChange={(e) => {
                  const newChoices = [...(value || [])];
                  newChoices[index] = { ...choice, value: e.target.value };
                  handleChange(newChoices);
                }}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => {
                  const newChoices = (value || []).filter((_: any, i: number) => i !== index);
                  handleChange(newChoices);
                }}
                style={{
                  padding: '6px 8px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const newChoices = [...(value || []), { title: 'New Option', value: `option${(value || []).length + 1}` }];
              handleChange(newChoices);
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: '#198754',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            + Add Choice
          </button>
        </div>
      );
    }

    switch (type) {
      case 'select':
        const options = getSelectOptions(key, element.type);
        return (
          <select
            style={inputStyle}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleChange(e.target.checked)}
            style={{ width: 'auto' }}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            style={inputStyle}
            value={value || ''}
            onChange={(e) => handleChange(parseInt(e.target.value) || null)}
          />
        );
      
      case 'textarea':
        return (
          <textarea
            style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
      
      default:
        return (
          <input
            type="text"
            style={inputStyle}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
    }
  };

  const getSelectOptions = (property: string, elementType: string) => {
    const commonOptions: { [key: string]: Array<{value: string, label: string}> } = {
      size: [
        { value: 'Small', label: 'Small' },
        { value: 'Default', label: 'Default' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Large', label: 'Large' },
        { value: 'ExtraLarge', label: 'Extra Large' }
      ],
      weight: [
        { value: 'Lighter', label: 'Lighter' },
        { value: 'Default', label: 'Default' },
        { value: 'Bolder', label: 'Bolder' }
      ],
      color: [
        { value: 'Default', label: 'Default' },
        { value: 'Dark', label: 'Dark' },
        { value: 'Light', label: 'Light' },
        { value: 'Accent', label: 'Accent' },
        { value: 'Good', label: 'Good' },
        { value: 'Warning', label: 'Warning' },
        { value: 'Attention', label: 'Attention' }
      ],
      spacing: [
        { value: 'None', label: 'None' },
        { value: 'Small', label: 'Small' },
        { value: 'Default', label: 'Default' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Large', label: 'Large' },
        { value: 'ExtraLarge', label: 'Extra Large' }
      ],
      horizontalAlignment: [
        { value: 'Left', label: 'Left' },
        { value: 'Center', label: 'Center' },
        { value: 'Right', label: 'Right' }
      ],
      style: elementType === 'Input.ChoiceSet' ? [
        { value: 'compact', label: 'Compact (Dropdown)' },
        { value: 'expanded', label: 'Expanded (Radio/Checkbox)' }
      ] : elementType === 'Container' ? [
        { value: 'Default', label: 'Default' },
        { value: 'emphasis', label: 'Emphasis' },
        { value: 'good', label: 'Good' },
        { value: 'attention', label: 'Attention' },
        { value: 'warning', label: 'Warning' },
        { value: 'accent', label: 'Accent' }
      ] : [
        { value: 'Default', label: 'Default' },
        { value: 'Person', label: 'Person' }
      ]
    };

    return commonOptions[property] || [];
  };

  const getPropertyType = (key: string, value: any): string => {
    if (['isSubtle', 'wrap', 'isMultiline', 'isRequired', 'isMultiSelect'].includes(key)) return 'checkbox';
    if (['min', 'max', 'maxLength'].includes(key)) return 'number';
    if (['size', 'weight', 'color', 'spacing', 'horizontalAlignment', 'style'].includes(key)) return 'select';
    if (key === 'text' && typeof value === 'string' && value.length > 50) return 'textarea';
    return 'text';
  };

  const shouldShowProperty = (key: string, elementType: string): boolean => {
    const commonProperties = ['spacing'];
    const typeSpecificProperties: { [key: string]: string[] } = {
      'TextBlock': ['text', 'size', 'weight', 'color', 'isSubtle', 'wrap', 'horizontalAlignment'],
      'Image': ['url', 'altText', 'size', 'style', 'horizontalAlignment'],
      'Input.Text': ['id', 'label', 'placeholder', 'value', 'isMultiline', 'isRequired', 'maxLength', 'style'],
      'Input.Number': ['id', 'label', 'placeholder', 'value', 'min', 'max', 'isRequired'],
      'Input.Date': ['id', 'label', 'value', 'min', 'max', 'isRequired'],
      'Input.Time': ['id', 'label', 'value', 'min', 'max', 'isRequired'],
      'Input.Toggle': ['id', 'title', 'value', 'valueOn', 'valueOff', 'isRequired'],
      'Input.ChoiceSet': ['id', 'label', 'placeholder', 'choices', 'style', 'isMultiSelect', 'isRequired'],
      'Container': ['style'],
      'ActionSet': []
    };

    return commonProperties.includes(key) || 
           (typeSpecificProperties[elementType] && typeSpecificProperties[elementType].includes(key));
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #dee2e6'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
          🔧 Properties
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#6c757d'
          }}
        >
          ×
        </button>
      </div>

      <div style={{
        padding: '8px 12px',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        marginBottom: '16px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#495057'
      }}>
        {element.type}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {Object.entries(element.properties)
          .filter(([key]) => shouldShowProperty(key, element.type))
          .map(([key, value]) => (
            <div key={key}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#495057'
              }}>
                {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              </label>
              {renderPropertyInput(key, value, getPropertyType(key, value))}
            </div>
          ))}
      </div>
    </div>
  );
};

export default AdaptiveCardDesigner;