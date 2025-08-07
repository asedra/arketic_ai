import React, { useState, useCallback, useEffect, useRef } from 'react';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'action' | 'input' | 'error';
  message: string;
  data?: any;
}

interface ActionLogProps {
  onAction?: (action: any, data?: any) => void;
  onInputChange?: (inputId: string, value: any) => void;
  onError?: (error: Error) => void;
}

export const ActionLog: React.FC<ActionLogProps> = ({
  onAction,
  onInputChange,
  onError,
}) => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const addLogEntry = useCallback((type: LogEntry['type'], message: string, data?: any) => {
    const entry: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      type,
      message,
      data,
    };

    setEntries(prev => [...prev, entry].slice(-50)); // Keep last 50 entries
  }, []);

  const handleAction = useCallback((action: any, data?: any) => {
    const message = `Action: ${action.type} - ${action.title || 'Untitled'}`;
    addLogEntry('action', message, { action, data });
    onAction?.(action, data);
  }, [addLogEntry, onAction]);

  const handleInputChange = useCallback((inputId: string, value: any) => {
    const message = `Input: ${inputId} = ${JSON.stringify(value)}`;
    addLogEntry('input', message, { inputId, value });
    onInputChange?.(inputId, value);
  }, [addLogEntry, onInputChange]);

  const handleError = useCallback((error: Error) => {
    const message = `Error: ${error.message}`;
    addLogEntry('error', message, { error: error.toString() });
    onError?.(error);
  }, [addLogEntry, onError]);

  const clearLog = useCallback(() => {
    setEntries([]);
  }, []);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [entries]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEntryIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'action':
        return '🔧';
      case 'input':
        return '📝';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  // Expose handlers via a global object for the demo
  useEffect(() => {
    (window as any).adaptiveCardAction = handleAction;
    (window as any).adaptiveCardInputChange = handleInputChange;
    (window as any).adaptiveCardSubmit = handleAction;
    (window as any).adaptiveCardOpenUrl = handleAction;

    return () => {
      delete (window as any).adaptiveCardAction;
      delete (window as any).adaptiveCardInputChange;
      delete (window as any).adaptiveCardSubmit;
      delete (window as any).adaptiveCardOpenUrl;
    };
  }, [handleAction, handleInputChange]);

  return (
    <div className=\"action-log\">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3>Activity Log</h3>
        <button
          className=\"toolbar-button\"
          onClick={clearLog}
          title=\"Clear log\"
        >
          Clear
        </button>
      </div>
      
      <div className=\"log-entries\" ref={logContainerRef}>
        {entries.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#666', fontStyle: 'italic', padding: '2rem' }}>
            No activity yet. Interact with the card to see logs here.
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className=\"log-entry\">
              <span className=\"log-entry-time\">{formatTime(entry.timestamp)}</span>
              <span className=\"log-entry-action\">
                {getEntryIcon(entry.type)} {entry.type.toUpperCase()}
              </span>
              <span>{entry.message}</span>
              {entry.data && (
                <details style={{ marginTop: '0.5rem' }}>
                  <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#666' }}>
                    View data
                  </summary>
                  <pre style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.5rem', 
                    background: '#f8f9fa', 
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    overflow: 'auto'
                  }}>
                    {JSON.stringify(entry.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};