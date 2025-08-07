'use client';

import React, { useState } from 'react';
import { microsoftSamples } from '@/data/microsoftSamples';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, CheckCircle, AlertCircle, Copy, Download, Upload } from 'lucide-react';

interface JsonImporterProps {
  onImport: (cardJson: any) => void;
  onClose: () => void;
}

export const JsonImporter: React.FC<JsonImporterProps> = ({ onImport, onClose }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [isValid, setIsValid] = useState(false);

  const validateAndPreview = (jsonString: string) => {
    setError('');
    setIsValid(false);
    
    if (!jsonString.trim()) {
      return;
    }

    try {
      const parsed = JSON.parse(jsonString);
      
      // Basic Adaptive Card validation
      if (!parsed.type || parsed.type !== 'AdaptiveCard') {
        setError('Not a valid Adaptive Card: missing type "AdaptiveCard"');
        return;
      }
      
      if (!parsed.version) {
        setError('Not a valid Adaptive Card: missing version');
        return;
      }
      
      if (!parsed.body || !Array.isArray(parsed.body)) {
        setError('Not a valid Adaptive Card: missing or invalid body array');
        return;
      }
      
      setIsValid(true);
      setError('');
      
    } catch (parseError) {
      setError(`Invalid JSON: ${(parseError as Error).message}`);
    }
  };

  const handleImport = () => {
    if (!isValid) return;
    
    try {
      const cardJson = JSON.parse(jsonInput);
      onImport(cardJson);
      onClose();
    } catch (error) {
      setError(`Failed to import: ${(error as Error).message}`);
    }
  };

  const handleInputChange = (value: string) => {
    setJsonInput(value);
    validateAndPreview(value);
  };

  const loadSample = (sampleKey: keyof typeof microsoftSamples) => {
    const sampleCard = microsoftSamples[sampleKey];
    const jsonString = JSON.stringify(sampleCard, null, 2);
    setJsonInput(jsonString);
    validateAndPreview(jsonString);
  };

  const copyToClipboard = () => {
    if (jsonInput) {
      navigator.clipboard.writeText(jsonInput);
    }
  };

  const downloadJson = () => {
    if (jsonInput && isValid) {
      const blob = new Blob([jsonInput], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'adaptive-card.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            📋 Import Adaptive Card from Designer
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <Alert className="mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-300">
            <strong>🎨 How to use Microsoft Adaptive Cards Designer:</strong>
            <ol className="mt-2 ml-4 list-decimal space-y-1">
              <li>
                Visit{' '}
                <a
                  href="https://adaptivecards.microsoft.com/designer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 underline hover:text-blue-700"
                >
                  adaptivecards.microsoft.com/designer
                </a>
              </li>
              <li>Design your card using the visual editor</li>
              <li>Copy the JSON from the "Card Payload Editor" panel</li>
              <li>Paste it into the text area below</li>
              <li>Click "Import Card" to use it in our designer</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Sample Cards */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            🎯 Try Microsoft Official Samples:
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSample('activityUpdate')}
            >
              📋 Activity Update
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSample('flightItinerary')}
            >
              ✈️ Flight Itinerary
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSample('foodOrder')}
            >
              🍕 Food Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSample('inputForm')}
            >
              📝 Input Forms
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSample('dataTable')}
            >
              📊 Data Table
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSample('simpleCard')}
            >
              🏷️ Simple Card
            </Button>
          </div>
        </div>

        {/* JSON Input */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Paste your Adaptive Card JSON:
            </label>
            <div className="flex gap-2">
              {jsonInput && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyToClipboard}
                    title="Copy to clipboard"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  {isValid && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={downloadJson}
                      title="Download JSON"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          <textarea
            value={jsonInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Paste your Adaptive Card JSON here..."
            className={`flex-1 min-h-[300px] p-4 font-mono text-sm border-2 rounded-lg resize-none focus:outline-none focus:ring-2 transition-all ${
              error && !isValid
                ? 'border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-950'
                : isValid
                ? 'border-green-500 focus:ring-green-500 bg-green-50 dark:bg-green-950'
                : 'border-slate-200 dark:border-slate-600 focus:ring-blue-500 bg-white dark:bg-slate-900'
            }`}
          />
          
          {/* Status */}
          {error && (
            <Alert className={`mt-2 ${
              isValid ? 'bg-green-50 dark:bg-green-950 border-green-500' : 'bg-red-50 dark:bg-red-950 border-red-500'
            }`}>
              {isValid ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={isValid ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}>
                {error || '✅ Valid Adaptive Card detected!'}
              </AlertDescription>
            </Alert>
          )}
          {isValid && !error && (
            <Alert className="mt-2 bg-green-50 dark:bg-green-950 border-green-500">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-300">
                ✅ Valid Adaptive Card detected!
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {jsonInput && isValid && (
              <span className="text-green-600 dark:text-green-400 font-semibold">
                Ready to import
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!isValid}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Card
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};