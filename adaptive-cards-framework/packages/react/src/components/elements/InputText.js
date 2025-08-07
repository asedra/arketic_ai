import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAdaptiveCard } from '../AdaptiveCardProvider';
import clsx from 'clsx';
export const InputText = ({ element }) => {
    const { setInputValue, getInputValue } = useAdaptiveCard();
    const inputRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);
    const [isValid, setIsValid] = useState(true);
    const { id, placeholder, value: defaultValue, maxLength, isMultiline = false, style: inputStyle = 'text', label, isRequired = false, errorMessage, } = element;
    const [localValue, setLocalValue] = useState(defaultValue || getInputValue(id) || '');
    const [hasError, setHasError] = useState(false);
    const [touched, setTouched] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    useEffect(() => {
        // Initialize with existing value from context
        const existingValue = getInputValue(id);
        if (existingValue !== undefined) {
            setLocalValue(existingValue);
        }
    }, [id, getInputValue]);
    const handleChange = useCallback((event) => {
        const newValue = event.target.value;
        setLocalValue(newValue);
        setInputValue(id, newValue);
        // Enhanced validation feedback
        const isValueValid = !isRequired || newValue.trim().length > 0;
        if (touched) {
            setHasError(!isValueValid);
            setIsValid(isValueValid);
            // Show success animation for valid input
            if (isValueValid && hasError) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 1000);
            }
        }
    }, [id, setInputValue, isRequired, touched, hasError]);
    const handleFocus = useCallback(() => {
        setIsFocused(true);
        // Haptic feedback
        if ('vibrate' in navigator) {
            navigator.vibrate(20);
        }
    }, []);
    const handleBlur = useCallback(() => {
        setIsFocused(false);
        setTouched(true);
        const isValueValid = !isRequired || localValue.trim().length > 0;
        setHasError(!isValueValid);
        setIsValid(isValueValid);
        // Show success for valid completion
        if (isValueValid && localValue.trim().length > 0) {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 1000);
        }
    }, [localValue, isRequired]);
    // Dynamic border color with delightful states
    const getBorderColor = () => {
        if (hasError)
            return '#FF0000';
        if (showSuccess)
            return '#10b981';
        if (isFocused)
            return '#0078D4';
        return '#CCCCCC';
    };
    const getBoxShadow = () => {
        if (hasError)
            return '0 0 0 3px rgba(255, 0, 0, 0.1)';
        if (showSuccess)
            return '0 0 0 3px rgba(16, 185, 129, 0.1)';
        if (isFocused)
            return '0 0 0 3px rgba(0, 120, 212, 0.1)';
        return 'none';
    };
    const inputProps = {
        ref: inputRef,
        id,
        value: localValue,
        onChange: handleChange,
        onFocus: handleFocus,
        onBlur: handleBlur,
        placeholder,
        maxLength,
        required: isRequired,
        className: clsx('adaptive-card__input', 'adaptive-card__input--text', `adaptive-card__input--${inputStyle}`, {
            'adaptive-card__input--error': hasError,
            'adaptive-card__input--success': showSuccess,
            'adaptive-card__input--focused': isFocused,
            'adaptive-card__input--required': isRequired,
            'adaptive-card__input--multiline': isMultiline,
        }),
        style: {
            width: '100%',
            padding: '12px 16px',
            border: `2px solid ${getBorderColor()}`,
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: getBoxShadow(),
            transform: isFocused ? 'scale(1.02)' : 'scale(1)',
            ...(isMultiline && {
                minHeight: '80px',
                resize: 'vertical',
            }),
        },
    };
    // Set input type based on style
    const inputType = inputStyle === 'password' ? 'password'
        : inputStyle === 'email' ? 'email'
            : inputStyle === 'tel' ? 'tel'
                : inputStyle === 'url' ? 'url'
                    : 'text';
    return (_jsxs("div", { className: "adaptive-card__input-container", style: { position: 'relative' }, children: [label && (_jsxs("label", { htmlFor: id, className: clsx('adaptive-card__input-label', {
                    'adaptive-card__input-label--required': isRequired,
                    'adaptive-card__input-label--focused': isFocused,
                    'adaptive-card__input-label--error': hasError,
                    'adaptive-card__input-label--success': showSuccess,
                }), style: {
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: hasError ? '#FF0000' : showSuccess ? '#10b981' : isFocused ? '#0078D4' : '#333333',
                    transition: 'color 0.3s ease',
                    transform: isFocused ? 'translateY(-2px)' : 'translateY(0)',
                }, children: [label, isRequired && (_jsx("span", { className: "adaptive-card__required-indicator", style: {
                            color: '#FF0000',
                            marginLeft: '4px',
                            animation: hasError ? 'wiggle 0.5s ease-in-out' : 'none',
                        }, children: "*" }))] })), _jsxs("div", { style: { position: 'relative' }, children: [isMultiline ? (_jsx("textarea", { ...inputProps, rows: 3 })) : (_jsx("input", { ...inputProps, type: inputType })), showSuccess && (_jsx("div", { style: {
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#10b981',
                            fontSize: '16px',
                            animation: 'bounceIn 0.5s ease',
                            pointerEvents: 'none',
                        }, children: "\u2713" })), maxLength && isFocused && (_jsxs("div", { style: {
                            position: 'absolute',
                            right: '12px',
                            bottom: '-20px',
                            fontSize: '11px',
                            color: localValue.length > maxLength * 0.8 ? '#f59e0b' : '#666',
                            transition: 'color 0.3s ease',
                        }, children: [localValue.length, "/", maxLength] }))] }), hasError && (_jsxs("div", { className: "adaptive-card__input-error", style: {
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#FF0000',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    animation: 'shake 0.5s ease-in-out',
                }, children: [_jsx("span", { children: "\uD83D\uDE05" }), errorMessage || (isRequired ? "Oops! This field needs some love." : "Something's not quite right.")] })), showSuccess && !hasError && (_jsxs("div", { className: "adaptive-card__input-success", style: {
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    animation: 'fadeInUp 0.3s ease',
                }, children: [_jsx("span", { children: "\uD83C\uDF89" }), "Looking good!"] }))] }));
};
// Inject additional styles for enhanced interactions
const inputStyles = `
@keyframes wiggle {
  0%, 7% {
    transform: rotateZ(0);
  }
  15% {
    transform: rotateZ(-15deg);
  }
  20% {
    transform: rotateZ(10deg);
  }
  25% {
    transform: rotateZ(-10deg);
  }
  30% {
    transform: rotateZ(6deg);
  }
  35% {
    transform: rotateZ(-4deg);
  }
  40%, 100% {
    transform: rotateZ(0);
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-3px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(3px);
  }
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: translateY(-50%) scale(0.3);
  }
  50% {
    opacity: 1;
    transform: translateY(-50%) scale(1.05);
  }
  70% {
    transform: translateY(-50%) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateY(-50%) scale(1);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`;
// Inject styles if not already present
if (typeof document !== 'undefined' && !document.querySelector('#input-enhancement-styles')) {
    const style = document.createElement('style');
    style.id = 'input-enhancement-styles';
    style.textContent = inputStyles;
    document.head.appendChild(style);
}
//# sourceMappingURL=InputText.js.map