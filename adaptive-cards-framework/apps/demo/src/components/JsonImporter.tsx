import React, { useState } from 'react';
import { microsoftSamples } from '../data/microsoftSamples';

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
        setError('❌ Not a valid Adaptive Card: missing type "AdaptiveCard"');
        return;
      }
      
      if (!parsed.version) {
        setError('❌ Not a valid Adaptive Card: missing version');
        return;
      }
      
      if (!parsed.body || !Array.isArray(parsed.body)) {
        setError('❌ Not a valid Adaptive Card: missing or invalid body array');
        return;
      }
      
      setIsValid(true);
      setError('✅ Valid Adaptive Card detected!');
      
    } catch (parseError) {
      setError(`❌ Invalid JSON: ${(parseError as Error).message}`);
    }
  };

  const handleImport = () => {
    if (!isValid) return;
    
    try {
      const cardJson = JSON.parse(jsonInput);
      onImport(cardJson);
      onClose();
    } catch (error) {
      setError(`❌ Failed to import: ${(error as Error).message}`);
    }
  };

  const handleInputChange = (value: string) => {
    setJsonInput(value);
    validateAndPreview(value);
  };

  const sampleCard = {
    "type": "AdaptiveCard",
    "version": "1.5",
    "body": [
      {
        "type": "TextBlock",
        "text": "Sample Card from Designer",
        "size": "Large",
        "weight": "Bolder"
      },
      {
        "type": "TextBlock",
        "text": "This is a sample card you can customize in the Microsoft Adaptive Cards Designer.",
        "wrap": true
      }
    ],
    "actions": [
      {
        "type": "Action.Submit",
        "title": "Submit",
        "data": {
          "action": "sample"
        }
      }
    ]
  };

  return (
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
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '800px',
        maxHeight: '90vh',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '24px', 
            fontWeight: 'bold',
            color: '#1f2937'
          }}>
            📋 Import Adaptive Card from Designer
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              color: '#6b7280'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #0ea5e9',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#0c4a6e', fontSize: '16px' }}>
            🎨 How to use Microsoft Adaptive Cards Designer:
          </h3>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#0c4a6e' }}>
            <li>Visit <a href="https://adaptivecards.microsoft.com/designer" target="_blank" rel="noopener noreferrer" style={{ color: '#0ea5e9' }}>adaptivecards.microsoft.com/designer</a></li>
            <li>Design your card using the visual editor</li>
            <li>Copy the JSON from the "Card Payload Editor" panel</li>
            <li>Paste it into the text area below</li>
            <li>Click "Import Card" to use it in our chat</li>
          </ol>
        </div>

        {/* JSON Input */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>
            Paste your Adaptive Card JSON:
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Paste your Adaptive Card JSON here..."
            style={{
              flex: 1,
              minHeight: '300px',
              padding: '12px',
              border: `2px solid ${error.includes('❌') ? '#ef4444' : isValid ? '#10b981' : '#d1d5db'}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'Monaco, "Lucida Console", monospace',
              resize: 'vertical',
              outline: 'none'
            }}
          />
          
          {/* Status */}
          {error && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: error.includes('❌') ? '#fef2f2' : '#f0fdf4',
              color: error.includes('❌') ? '#dc2626' : '#16a34a',
              border: `1px solid ${error.includes('❌') ? '#fecaca' : '#bbf7d0'}`
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Microsoft Sample Cards */}
        <div style={{ 
          backgroundColor: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '8px', 
          padding: '16px' 
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
            🎯 Try Microsoft Official Samples:
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '8px' 
          }}>
            <button
              onClick={() => handleInputChange(JSON.stringify(microsoftSamples.activityUpdate, null, 2))}
              style={{
                padding: '8px 12px',
                backgroundColor: '#e0f2fe',
                color: '#0277bd',
                border: '1px solid #b3e5fc',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b3e5fc'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e0f2fe'}
            >
              📋 Activity Update
            </button>
            <button
              onClick={() => handleInputChange(JSON.stringify(microsoftSamples.flightItinerary, null, 2))}
              style={{
                padding: '8px 12px',
                backgroundColor: '#e8f5e8',
                color: '#2e7d32',
                border: '1px solid #c8e6c9',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c8e6c9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e8f5e8'}
            >
              ✈️ Flight Itinerary
            </button>
            <button
              onClick={() => handleInputChange(JSON.stringify(microsoftSamples.foodOrder, null, 2))}
              style={{
                padding: '8px 12px',
                backgroundColor: '#fce4ec',
                color: '#c2185b',
                border: '1px solid #f8bbd9',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8bbd9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fce4ec'}
            >
              🍕 Food Order
            </button>
            <button
              onClick={() => handleInputChange(JSON.stringify(microsoftSamples.inputSample, null, 2))}
              style={{
                padding: '8px 12px',
                backgroundColor: '#fff3e0',
                color: '#f57c00',
                border: '1px solid #ffcc02',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffcc02'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff3e0'}
            >
              📝 Input Forms
            </button>
            <button
              onClick={() => handleInputChange(JSON.stringify(microsoftSamples.tableSample, null, 2))}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f3e5f5',
                color: '#7b1fa2',
                border: '1px solid #e1bee7',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e1bee7'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3e5f5'}
            >
              📊 Data Table
            </button>
            <button
              onClick={() => handleInputChange(JSON.stringify(sampleCard, null, 2))}
              style={{
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            >
              🏷️ Simple Card
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '16px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f9fafb',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!isValid}
            style={{
              padding: '8px 24px',
              backgroundColor: isValid ? '#2563eb' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isValid ? 'pointer' : 'not-allowed',
              fontSize: '16px',
              fontWeight: '600'
            }}
            onMouseEnter={(e) => {
              if (isValid) e.currentTarget.style.backgroundColor = '#1d4ed8';
            }}
            onMouseLeave={(e) => {
              if (isValid) e.currentTarget.style.backgroundColor = '#2563eb';
            }}
          >
            🚀 Import Card
          </button>
        </div>
      </div>
    </div>
  );
};