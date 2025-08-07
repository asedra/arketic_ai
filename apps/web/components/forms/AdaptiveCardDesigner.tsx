'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { AdvancedCardRenderer } from './AdvancedCardRenderer';
import { useAuth } from '@/lib/auth-context';
import { useArketicStore } from '@/lib/state-manager';
import { useNotifications } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Save, Share, Download, AlertTriangle, CheckCircle, FolderOpen, Plus } from 'lucide-react';
import { useFormsApi, FormData } from '@/lib/api/forms';
import { useRouter, useSearchParams } from 'next/navigation';

interface Element {
  id: string;
  type: string;
  properties: any;
}

interface DesignerElement extends Element {
  children?: DesignerElement[];
}

const AdaptiveCardDesigner: React.FC = () => {
  // Auth and user context
  const { user, isAuthenticated } = useAuth();
  const { toast } = useNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formsApi = useFormsApi();
  
  // Global state management
  const setLoading = useArketicStore(state => state.setLoading);
  const isLoading = useArketicStore(state => state.loading.formDesigner || false);
  
  // Component state
  const [cardElements, setCardElements] = useState<DesignerElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<DesignerElement | null>(null);
  const [draggedElement, setDraggedElement] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showLoadForm, setShowLoadForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  
  // Form management state
  const [formTitle, setFormTitle] = useState('Untitled Form');
  const [currentFormId, setCurrentFormId] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [availableForms, setAvailableForms] = useState<FormData[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  // AI Generator state
  const [aiQuery, setAiQuery] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Element templates
  const elementTypes = [
    {
      type: 'TextBlock',
      category: 'Layout',
      icon: '📝',
      name: 'Text',
      defaultProperties: {
        text: 'New text block',
        weight: 'Default',
        size: 'Default'
      }
    },
    {
      type: 'Input.Text',
      category: 'Input',
      icon: '📝',
      name: 'Text Input',
      defaultProperties: {
        id: 'textInput',
        placeholder: 'Enter text here...',
        label: 'Text Input',
        isRequired: false
      }
    },
    {
      type: 'Input.Number',
      category: 'Input',
      icon: '🔢',
      name: 'Number Input',
      defaultProperties: {
        id: 'numberInput',
        placeholder: 'Enter number...',
        label: 'Number Input',
        isRequired: false
      }
    },
    {
      type: 'Input.Email',
      category: 'Input',
      icon: '📧',
      name: 'Email Input',
      defaultProperties: {
        id: 'emailInput',
        placeholder: 'Enter email...',
        label: 'Email',
        isRequired: false
      }
    },
    {
      type: 'Input.Date',
      category: 'Input',
      icon: '📅',
      name: 'Date Input',
      defaultProperties: {
        id: 'dateInput',
        label: 'Date',
        isRequired: false
      }
    },
    {
      type: 'Input.Toggle',
      category: 'Input',
      icon: '🔘',
      name: 'Toggle',
      defaultProperties: {
        id: 'toggleInput',
        title: 'Toggle Option',
        value: 'false',
        isRequired: false
      }
    },
    {
      type: 'Input.ChoiceSet',
      category: 'Input',
      icon: '☑️',
      name: 'Choice Set',
      defaultProperties: {
        id: 'choiceSet',
        label: 'Select an option',
        choices: [
          { title: 'Option 1', value: 'option1' },
          { title: 'Option 2', value: 'option2' }
        ],
        style: 'compact',
        isMultiSelect: false,
        isRequired: false
      }
    },
    {
      type: 'ActionSet',
      category: 'Action',
      icon: '🔘',
      name: 'Action Set',
      defaultProperties: {
        actions: [
          {
            type: 'Action.Submit',
            title: 'Submit',
            style: 'positive'
          }
        ]
      }
    }
  ];

  // Load initial data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoading('formDesigner', true);
        
        // Load available forms
        const forms = await formsApi.getForms();
        setAvailableForms(forms);
        
        // Load templates
        const templateList = await formsApi.getTemplates();
        setTemplates(templateList);
        
        // Check if we're loading a specific form from URL
        const formId = searchParams.get('id');
        if (formId) {
          const form = await formsApi.getForm(formId);
          if (form) {
            setFormTitle(form.title);
            setCurrentFormId(form.id);
            setCardElements(JSON.parse(form.content).elements || []);
            setLastSaved(new Date(form.updated_at));
            setIsDirty(false);
          }
        }
      } catch (error) {
        console.error('Failed to load initial data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load forms data',
          variant: 'destructive'
        });
      } finally {
        setLoading('formDesigner', false);
      }
    };

    loadInitialData();
  }, [isAuthenticated, searchParams]);

  // Mark form as dirty when elements change
  useEffect(() => {
    setIsDirty(true);
  }, [cardElements, formTitle]);

  // Generate unique ID for new elements
  const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add new element to the card
  const addElement = useCallback((elementType: any) => {
    const newElement: DesignerElement = {
      id: generateId(),
      type: elementType.type,
      properties: { ...elementType.defaultProperties }
    };
    
    setCardElements(prev => [...prev, newElement]);
    setSelectedElement(newElement);
  }, []);

  // Save form
  const saveForm = useCallback(async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to save forms',
        variant: 'destructive'
      });
      return;
    }

    try {
      const formData = {
        title: formTitle,
        content: JSON.stringify({
          elements: cardElements,
          version: '1.0'
        }),
        is_template: false
      };

      let savedForm;
      if (currentFormId) {
        savedForm = await formsApi.updateForm(currentFormId, formData);
        toast({
          title: 'Form Updated',
          description: 'Your form has been updated successfully'
        });
      } else {
        savedForm = await formsApi.createForm(formData);
        setCurrentFormId(savedForm.id);
        toast({
          title: 'Form Saved',
          description: 'Your form has been saved successfully'
        });
      }

      setLastSaved(new Date());
      setIsDirty(false);
      
      // Update URL if this is a new form
      if (!currentFormId && savedForm?.id) {
        router.push(`/forms?id=${savedForm.id}`);
      }
    } catch (error) {
      console.error('Failed to save form:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save the form. Please try again.',
        variant: 'destructive'
      });
    }
  }, [formTitle, cardElements, currentFormId, isAuthenticated, toast, formsApi, router]);

  // Create new form
  const createNewForm = useCallback(() => {
    setFormTitle('Untitled Form');
    setCurrentFormId(null);
    setCardElements([]);
    setSelectedElement(null);
    setLastSaved(null);
    setIsDirty(false);
    router.push('/forms');
  }, [router]);

  // Load existing form
  const loadForm = useCallback(async (form: FormData) => {
    try {
      const content = JSON.parse(form.content);
      setFormTitle(form.title);
      setCurrentFormId(form.id);
      setCardElements(content.elements || []);
      setSelectedElement(null);
      setLastSaved(new Date(form.updated_at));
      setIsDirty(false);
      setShowLoadForm(false);
      router.push(`/forms?id=${form.id}`);
    } catch (error) {
      console.error('Failed to load form:', error);
      toast({
        title: 'Load Failed',
        description: 'Failed to load the form',
        variant: 'destructive'
      });
    }
  }, [toast, formsApi, router]);

  // Generate adaptive card JSON
  const generateAdaptiveCard = useMemo(() => {
    return {
      type: 'AdaptiveCard',
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      version: '1.5',
      body: cardElements.map(element => ({
        type: element.type,
        id: element.id,
        ...element.properties
      }))
    };
  }, [cardElements]);

  // AI Form Generator
  const generateAICard = useCallback(() => {
    if (!aiQuery.trim()) return;

    setIsAiGenerating(true);
    
    // Simulate AI generation with a more sophisticated example
    setTimeout(() => {
      const adaptiveCard = {
        elements: [
          {
            id: generateId(),
            type: 'TextBlock',
            properties: {
              text: `AI Generated: ${aiQuery}`,
              weight: 'Bolder',
              size: 'Medium'
            }
          },
          {
            id: generateId(),
            type: 'Input.Text',
            properties: {
              id: 'ai_generated_input',
              placeholder: 'Enter your response...',
              label: 'Your Input',
              isRequired: true
            }
          }
        ]
      };

      setCardElements(adaptiveCard.elements);
      setShowAIGenerator(false);
      setIsAiGenerating(false);
      setAiQuery('');
    }, 1500);
  }, [aiQuery]);

  // Error handling for unauthenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Authentication Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              You must be logged in to access the form designer.
            </p>
            <Button onClick={() => router.push('/login')} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Element Palette */}
      <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">🎨 Elements</h3>
          
          {/* AI Generator Button */}
          <button
            onClick={() => setShowAIGenerator(true)}
            className="w-full mt-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 hover:-translate-y-0.5 shadow-lg"
          >
            🤖 AI Form Oluştur
          </button>
        </div>

        {/* Group elements by category */}
        {['Layout', 'Input', 'Action'].map(category => (
          <div key={category} className="p-4 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
              {category}
            </h4>
            <div className="grid gap-2">
              {elementTypes
                .filter(element => element.category === category)
                .map(element => (
                  <button
                    key={element.type}
                    onClick={() => addElement(element)}
                    className="flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 group"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">
                      {element.icon}
                    </span>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                      {element.name}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Main Design Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="text-xl font-semibold bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-300 focus:rounded px-2 py-1"
                placeholder="Form Title"
              />
              {isDirty && (
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  Unsaved
                </Badge>
              )}
              {lastSaved && (
                <span className="text-sm text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={createNewForm}>
                <Plus className="w-4 h-4 mr-2" />
                New
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowLoadForm(true)}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Load
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
                Templates
              </Button>
              <Button onClick={saveForm} size="sm" disabled={!isDirty}>
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                {showPreview ? 'Design' : 'Preview'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowJson(!showJson)}>
                JSON
              </Button>
            </div>
          </div>
        </div>

        {/* Design/Preview Area */}
        <div className="flex-1 overflow-hidden">
          {showJson ? (
            <div className="h-full p-6">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg h-full overflow-auto text-sm">
                {JSON.stringify(generateAdaptiveCard, null, 2)}
              </pre>
            </div>
          ) : showPreview ? (
            <div className="h-full p-6 overflow-auto bg-gray-50">
              <div className="max-w-2xl mx-auto">
                <AdvancedCardRenderer 
                  card={generateAdaptiveCard}
                  onSubmit={(data) => console.log('Form submitted:', data)}
                />
              </div>
            </div>
          ) : (
            <div className="h-full p-6 overflow-auto">
              <div className="max-w-4xl mx-auto">
                {cardElements.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">🎨</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                      Start Building Your Form
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Add elements from the palette on the left or use AI to generate a form
                    </p>
                    <Button onClick={() => setShowAIGenerator(true)}>
                      🤖 Generate with AI
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cardElements.map((element, index) => (
                      <div
                        key={element.id}
                        className={cn(
                          "border-2 border-dashed border-gray-200 rounded-lg p-4 transition-all duration-200",
                          selectedElement?.id === element.id && "border-blue-500 bg-blue-50"
                        )}
                        onClick={() => setSelectedElement(element)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">
                            {element.type} #{index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCardElements(prev => prev.filter(el => el.id !== element.id));
                              setSelectedElement(null);
                            }}
                          >
                            ✕
                          </Button>
                        </div>
                        <div className="bg-white rounded border p-3">
                          <AdvancedCardRenderer
                            card={{
                              type: 'AdaptiveCard',
                              version: '1.5',
                              body: [{
                                type: element.type,
                                id: element.id,
                                ...element.properties
                              }]
                            }}
                            onSubmit={() => {}}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Property Panel */}
      <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">⚙️ Properties</h3>
        </div>
        
        <div className="p-4">
          {selectedElement ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Element Type
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded text-sm">
                  {selectedElement.type}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Element ID
                </label>
                <input
                  type="text"
                  value={selectedElement.id}
                  onChange={(e) => {
                    const updatedElement = { ...selectedElement, id: e.target.value };
                    setSelectedElement(updatedElement);
                    setCardElements(prev => 
                      prev.map(el => el.id === selectedElement.id ? updatedElement : el)
                    );
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              {/* Dynamic property editors based on element type */}
              {Object.entries(selectedElement.properties).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  {typeof value === 'boolean' ? (
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => {
                        const updatedElement = {
                          ...selectedElement,
                          properties: {
                            ...selectedElement.properties,
                            [key]: e.target.checked
                          }
                        };
                        setSelectedElement(updatedElement);
                        setCardElements(prev =>
                          prev.map(el => el.id === selectedElement.id ? updatedElement : el)
                        );
                      }}
                      className="rounded border-gray-300"
                    />
                  ) : (
                    <input
                      type="text"
                      value={value?.toString() || ''}
                      onChange={(e) => {
                        const updatedElement = {
                          ...selectedElement,
                          properties: {
                            ...selectedElement.properties,
                            [key]: e.target.value
                          }
                        };
                        setSelectedElement(updatedElement);
                        setCardElements(prev =>
                          prev.map(el => el.id === selectedElement.id ? updatedElement : el)
                        );
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <div className="text-4xl mb-2">⚙️</div>
              <p className="text-sm">Select an element to edit properties</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Generator Modal */}
      {showAIGenerator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🤖 AI Form Generator
              </h2>
              <button
                onClick={() => setShowAIGenerator(false)}
                className="text-2xl text-gray-400 hover:text-gray-600 w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Form Description
              </label>
              <textarea
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Describe the form you want to create... (e.g., 'A contact form with name, email, phone number and message fields')"
                className="w-full h-32 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAIGenerator(false)}
                className="px-5 py-3 bg-gray-100 text-gray-600 border border-gray-200 rounded-lg text-sm hover:bg-gray-200 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={generateAICard}
                disabled={!aiQuery.trim() || isAiGenerating}
                className={`px-6 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                  isAiGenerating || !aiQuery.trim()
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                }`}
              >
                {isAiGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Oluşturuluyor...
                  </>
                ) : (
                  '🚀 Form Oluştur'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Form Modal */}
      {showLoadForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📁 Load Form</h2>
              <button
                onClick={() => setShowLoadForm(false)}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {availableForms.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📄</div>
                  <p>No forms available</p>
                </div>
              ) : (
                availableForms.map(form => (
                  <div
                    key={form.id}
                    onClick={() => loadForm(form)}
                    className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    <h3 className="font-semibold text-gray-800">{form.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Updated: {new Date(form.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">📋 Templates</h2>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-2xl text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No templates available</p>
                </div>
              ) : (
                templates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => {
                      // Load template as new form
                      const content = JSON.parse(template.content);
                      setFormTitle(`${template.title} (Copy)`);
                      setCurrentFormId(null);
                      setCardElements(content.elements || []);
                      setSelectedElement(null);
                      setLastSaved(null);
                      setIsDirty(true);
                      setShowTemplates(false);
                    }}
                    className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    <h3 className="font-semibold text-gray-800">{template.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdaptiveCardDesigner;