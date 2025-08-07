import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from 'react';
const AdaptiveCardContext = createContext(null);
export const AdaptiveCardProvider = ({ card, context, children, onAction, onInputChange, }) => {
    const [inputValues, setInputValues] = useState({});
    const setInputValue = useCallback((inputId, value) => {
        setInputValues(prev => ({
            ...prev,
            [inputId]: value,
        }));
        if (onInputChange) {
            onInputChange(inputId, value);
        }
    }, [onInputChange]);
    const getInputValue = useCallback((inputId) => {
        return inputValues[inputId];
    }, [inputValues]);
    const executeAction = useCallback((action, data) => {
        if (action.type === 'Action.Submit') {
            // Collect all input values for submit actions
            const submitData = {
                ...data,
                ...inputValues,
            };
            if (onAction) {
                onAction(action, submitData);
            }
        }
        else {
            if (onAction) {
                onAction(action, data);
            }
        }
    }, [inputValues, onAction]);
    const contextValue = {
        card,
        context,
        inputValues,
        setInputValue,
        getInputValue,
        executeAction,
    };
    return (_jsx(AdaptiveCardContext.Provider, { value: contextValue, children: children }));
};
export const useAdaptiveCard = () => {
    const context = useContext(AdaptiveCardContext);
    if (!context) {
        throw new Error('useAdaptiveCard must be used within an AdaptiveCardProvider');
    }
    return context;
};
//# sourceMappingURL=AdaptiveCardProvider.js.map