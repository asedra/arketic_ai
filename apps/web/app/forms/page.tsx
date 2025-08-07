"use client"

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingGrid } from '@/components/ui/loading'
import { useAuth } from '@/lib/auth-context'
import { useArketicStore } from '@/lib/state-manager'
import { AdvancedCardRenderer } from '@/components/forms/AdvancedCardRenderer'
import { JsonImporter } from '@/components/forms/JsonImporter'
import { Upload, Download, Copy } from 'lucide-react'

interface Element {
  id: string;
  type: string;
  properties: any;
}

interface DesignerElement extends Element {
  children?: DesignerElement[];
}

export default function FormsPage() {
  const { user } = useAuth();
  const isLoading = useArketicStore(state => state.loading.forms || false);

  // Designer state
  const [cardElements, setCardElements] = useState<DesignerElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<DesignerElement | null>(null);
  const [draggedElement, setDraggedElement] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [showImporter, setShowImporter] = useState(false);

  // Element Templates (all features from demo)
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

  // Handle JSON import from designer
  const handleJsonImport = (cardJson: any) => {
    setCardElements([]);
    setSelectedElement(null);
    
    if (cardJson.body && Array.isArray(cardJson.body)) {
      const convertedElements: DesignerElement[] = cardJson.body.map((element: any) => ({
        id: generateId(),
        type: element.type,
        properties: { ...element },
        children: element.type === 'Container' ? [] : undefined
      }));
      
      setCardElements(convertedElements);
    }
    setShowImporter(false);
  };

  // Export current design as JSON
  const exportAsJson = () => {
    const cardJson = generateAdaptiveCard();
    const jsonString = JSON.stringify(cardJson, null, 2);
    
    // Create download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'adaptive-card.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy JSON to clipboard
  const copyJsonToClipboard = () => {
    const cardJson = generateAdaptiveCard();
    const jsonString = JSON.stringify(cardJson, null, 2);
    navigator.clipboard.writeText(jsonString);
  };

  // AI form generation
  const handleAIGenerate = (cardJson: any) => {
    setCardElements([]);
    setSelectedElement(null);
    
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

  const generateAICard = () => {
    setIsAiGenerating(true);
    
    const queryLower = aiQuery.toLowerCase();
    const fields = [];
    
    let formTitle = '📋 Form';
    if (queryLower.includes('izin')) formTitle = '📅 İzin Başvuru Formu';
    else if (queryLower.includes('başvuru')) formTitle = '📝 Başvuru Formu';
    else if (queryLower.includes('şikayet')) formTitle = '📢 Şikayet Formu';

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
    <ProtectedRoute requireAuth={true} redirectTo="/login">
      <ErrorBoundary level="page" context={{ page: 'forms', user: user?.id }}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex">
          {/* Element Palette */}
          <div className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span>🎨</span> Elements
              </h3>
              
              {/* AI Generator Button */}
              <button
                onClick={() => setShowAIGenerator(true)}
                className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <span>🤖</span> AI Form Oluştur
              </button>
            </div>

            {/* Element Categories */}
            {['Layout', 'Input', 'Action'].map(category => (
              <div key={category} className="p-4">
                <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  {category}
                </h4>
                <div className="space-y-2">
                  {Object.entries(elementTemplates)
                    .filter(([_, template]) => template.category === category)
                    .map(([key, template]) => (
                      <div
                        key={key}
                        draggable
                        onDragStart={(e) => handleDragStart(e, template)}
                        className="p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg cursor-move hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-600 transition-all flex items-center gap-2"
                      >
                        <span className="text-lg">{template.icon}</span>
                        <span className="font-medium text-sm">{template.name}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => window.history.back()}
                    className="px-3 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    ← Back
                  </button>
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <span>🎯</span> Adaptive Card Designer
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowImporter(true)}
                    className="px-4 py-2 bg-white dark:bg-slate-700 text-purple-600 border border-purple-500 rounded-lg font-medium hover:bg-purple-50 dark:hover:bg-purple-900 transition-colors flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Import
                  </button>
                  {cardElements.length > 0 && (
                    <>
                      <button
                        onClick={exportAsJson}
                        className="px-4 py-2 bg-white dark:bg-slate-700 text-green-600 border border-green-500 rounded-lg font-medium hover:bg-green-50 dark:hover:bg-green-900 transition-colors flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export
                      </button>
                      {showJson && (
                        <button
                          onClick={copyJsonToClipboard}
                          className="px-4 py-2 bg-white dark:bg-slate-700 text-blue-600 border border-blue-500 rounded-lg font-medium hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          Copy
                        </button>
                      )}
                    </>
                  )}
                  <div className="border-l border-slate-300 dark:border-slate-600 mx-2" />
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      showPreview 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white dark:bg-slate-700 text-blue-500 border border-blue-500'
                    }`}
                  >
                    {showPreview ? '📝 Edit' : '👁️ Preview'}
                  </button>
                  <button
                    onClick={() => setShowJson(!showJson)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      showJson 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white dark:bg-slate-700 text-green-500 border border-green-500'
                    }`}
                  >
                    {showJson ? '🎨 Design' : '📄 JSON'}
                  </button>
                  <button
                    onClick={() => {
                      setCardElements([]);
                      setSelectedElement(null);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
                  >
                    🗑️ Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex">
              {/* Canvas Area */}
              <div className="flex-1 p-6 bg-slate-50 dark:bg-slate-900">
                {showJson ? (
                  <div className="h-full">
                    <textarea
                      readOnly
                      value={JSON.stringify(generateAdaptiveCard(), null, 2)}
                      className="w-full h-full p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-sm resize-none"
                    />
                  </div>
                ) : showPreview ? (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-6 min-h-[400px] border border-slate-200 dark:border-slate-700">
                    <AdvancedCardRenderer card={generateAdaptiveCard()} />
                  </div>
                ) : (
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className={`bg-white dark:bg-slate-800 rounded-lg min-h-[400px] p-6 ${
                      cardElements.length === 0 
                        ? 'border-2 border-dashed border-slate-300 dark:border-slate-600' 
                        : 'border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {cardElements.length === 0 ? (
                      <div className="h-full min-h-[350px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <div className="text-center">
                          <div className="text-5xl mb-4">📱</div>
                          <div className="text-lg">Drag elements from the palette to start designing</div>
                          <div className="text-sm mt-2 opacity-70">Your Adaptive Card will appear here</div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cardElements.map((element) => (
                          <DesignElement
                            key={element.id}
                            element={element}
                            isSelected={selectedElement?.id === element.id}
                            onSelect={() => setSelectedElement(element)}
                            onDelete={() => deleteElement(element.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Property Panel */}
              {selectedElement && !showPreview && !showJson && (
                <div className="w-80 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-y-auto">
                  <PropertyPanel
                    element={selectedElement}
                    onUpdateProperty={updateElementProperty}
                    onClose={() => setSelectedElement(null)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Import from Designer Modal */}
          {showImporter && (
            <JsonImporter
              onImport={handleJsonImport}
              onClose={() => setShowImporter(false)}
            />
          )}

          {/* AI Generator Modal */}
          {showAIGenerator && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    🤖 AI Form Oluşturucu
                  </h2>
                  <button
                    onClick={() => setShowAIGenerator(false)}
                    className="text-slate-500 hover:text-slate-700 text-2xl"
                  >
                    ×
                  </button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-5">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">💡 Nasıl Çalışır:</h3>
                  <p className="text-blue-800 dark:text-blue-400 text-sm">
                    Form talebinizi yazın. AI otomatik olarak gerekli alanları tespit edip size özel bir form oluşturacak.
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-semibold mb-2">🎯 Hızlı Örnekler:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'İzin formu oluştur. Başlangıç tarihi, bitiş tarihi, izin nedeni olsun',
                      'Başvuru formu istiyorum. Ad soyad, email, açıklama olsun',
                      'Şikayet formu yapmak istiyorum. İsim, email, şikayet nedeni olsun'
                    ].map((example, index) => (
                      <button
                        key={index}
                        onClick={() => setAiQuery(example)}
                        className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm transition-colors"
                      >
                        {example.slice(0, 30)}...
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-5">
                  <label className="block mb-2 font-semibold">Form Talebinizi Yazın:</label>
                  <textarea
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    placeholder="Örnek: İzin formu istiyorum. İçerisinde izin başlangıç tarihi, izin bitiş tarihi, izin nedeni olsun..."
                    className="w-full h-32 p-3 border border-slate-200 dark:border-slate-600 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowAIGenerator(false)}
                    className="px-5 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    İptal
                  </button>
                  <button
                    onClick={generateAICard}
                    disabled={!aiQuery.trim() || isAiGenerating}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isAiGenerating ? '⏳ Oluşturuluyor...' : '🚀 Form Oluştur'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </ProtectedRoute>
  )
}

// Design Element Component
interface DesignElementProps {
  element: DesignerElement;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

const DesignElement: React.FC<DesignElementProps> = ({ element, isSelected, onSelect, onDelete }) => {
  return (
    <div 
      className={`relative p-3 border rounded-lg cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500'
      }`}
      onClick={onSelect}
    >
      {isSelected && (
        <button 
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          ×
        </button>
      )}
      
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-[80px]">
          {element.type}
        </span>
        <div className="flex-1 text-sm">
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
    </div>
  );
};

// Property Panel Component  
interface PropertyPanelProps {
  element: DesignerElement;
  onUpdateProperty: (elementId: string, property: string, value: any) => void;
  onClose: () => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ element, onUpdateProperty, onClose }) => {
  const renderPropertyInput = (key: string, value: any, type: string = 'text') => {
    const handleChange = (newValue: any) => {
      onUpdateProperty(element.id, key, newValue);
    };

    // Handle choices array for Input.ChoiceSet
    if (key === 'choices' && element.type === 'Input.ChoiceSet') {
      return (
        <div className="space-y-2">
          {(value || []).map((choice: any, index: number) => (
            <div key={index} className="flex gap-1 p-2 bg-slate-50 dark:bg-slate-700 rounded">
              <input
                type="text"
                placeholder="Title"
                value={choice.title || ''}
                onChange={(e) => {
                  const newChoices = [...(value || [])];
                  newChoices[index] = { ...choice, title: e.target.value };
                  handleChange(newChoices);
                }}
                className="flex-1 px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded"
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
                className="flex-1 px-2 py-1 text-sm border border-slate-200 dark:border-slate-600 rounded"
              />
              <button
                onClick={() => {
                  const newChoices = (value || []).filter((_: any, i: number) => i !== index);
                  handleChange(newChoices);
                }}
                className="px-2 py-1 bg-red-500 text-white rounded text-xs"
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
            className="w-full px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
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
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
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
            className="w-4 h-4"
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleChange(parseInt(e.target.value) || null)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
          />
        );
      
      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm min-h-[60px] resize-vertical"
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
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
    <div className="p-4">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200 dark:border-slate-600">
        <h3 className="font-semibold text-lg">🔧 Properties</h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-700 text-xl"
        >
          ×
        </button>
      </div>

      <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg mb-4 text-sm font-semibold">
        {element.type}
      </div>

      <div className="space-y-3">
        {Object.entries(element.properties)
          .filter(([key]) => shouldShowProperty(key, element.type))
          .map(([key, value]) => (
            <div key={key}>
              <label className="block mb-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
              </label>
              {renderPropertyInput(key, value, getPropertyType(key, value))}
            </div>
          ))}
      </div>
    </div>
  );
};