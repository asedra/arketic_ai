import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { useAdaptiveCard } from '../AdaptiveCardProvider';
import clsx from 'clsx';
// Helper function to create confetti
const createConfetti = (element) => {
    const rect = element.getBoundingClientRect();
    const colors = ['#0078D4', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6'];
    for (let i = 0; i < 15; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = rect.left + rect.width / 2 + 'px';
        confetti.style.top = rect.top + rect.height / 2 + 'px';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.setProperty('--random-x', `${(Math.random() - 0.5) * 200}px`);
        document.body.appendChild(confetti);
        setTimeout(() => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        }, 3000);
    }
};
// Haptic feedback for mobile devices
const triggerHapticFeedback = () => {
    if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
    }
};
export const SubmitAction = ({ action }) => {
    const { executeAction } = useAdaptiveCard();
    const [isClicked, setIsClicked] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const buttonRef = useRef(null);
    const { title = 'Submit', style: actionStyle = 'default', isEnabled = true, tooltip, iconUrl, data, } = action;
    const handleClick = async () => {
        if (isEnabled && !isClicked) {
            setIsClicked(true);
            // Haptic feedback
            triggerHapticFeedback();
            try {
                // Execute the action
                await executeAction(action, data);
                // Show success state
                setShowSuccess(true);
                // Create confetti effect
                if (buttonRef.current) {
                    createConfetti(buttonRef.current);
                }
                // Reset success state after animation
                setTimeout(() => {
                    setShowSuccess(false);
                    setIsClicked(false);
                }, 2000);
            }
            catch (error) {
                // Reset on error
                setIsClicked(false);
                console.error('Action execution failed:', error);
            }
        }
    };
    const buttonStyle = {
        padding: '12px 24px',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 600,
        cursor: isEnabled ? 'pointer' : 'not-allowed',
        opacity: isEnabled ? 1 : 0.6,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        textDecoration: 'none',
        outline: 'none',
        position: 'relative',
        overflow: 'hidden',
        transform: isClicked ? 'scale(0.95)' : showSuccess ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isClicked ? '0 2px 8px rgba(0, 0, 0, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
    };
    // Apply style-specific colors with success states
    if (showSuccess) {
        buttonStyle.backgroundColor = '#10b981';
        buttonStyle.color = '#FFFFFF';
    }
    else {
        switch (actionStyle) {
            case 'positive':
                buttonStyle.backgroundColor = '#0078D4';
                buttonStyle.color = '#FFFFFF';
                break;
            case 'destructive':
                buttonStyle.backgroundColor = '#D13438';
                buttonStyle.color = '#FFFFFF';
                break;
            default:
                buttonStyle.backgroundColor = '#F3F2F1';
                buttonStyle.color = '#323130';
                buttonStyle.border = '1px solid #CCCCCC';
                break;
        }
    }
    // Enhanced hover effects with micro-interactions
    const handleMouseEnter = (e) => {
        if (isEnabled && !isClicked) {
            const target = e.target;
            target.style.transform = 'scale(1.05) translateY(-2px)';
            target.style.boxShadow = '0 8px 25px rgba(0, 120, 212, 0.25)';
        }
    };
    const handleMouseLeave = (e) => {
        if (isEnabled && !isClicked) {
            const target = e.target;
            target.style.transform = 'scale(1) translateY(0)';
            target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }
    };
    const handleMouseDown = () => {
        if (isEnabled) {
            triggerHapticFeedback();
        }
    };
    return (_jsxs("button", { ref: buttonRef, type: "button", onClick: handleClick, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave, onMouseDown: handleMouseDown, disabled: !isEnabled || isClicked, title: tooltip, className: clsx('adaptive-card__action', 'adaptive-card__action--submit', `adaptive-card__action--${actionStyle}`, {
            'adaptive-card__action--disabled': !isEnabled,
            'adaptive-card__action--has-icon': !!iconUrl,
            'adaptive-card__action--clicked': isClicked,
            'adaptive-card__action--success': showSuccess,
        }), style: buttonStyle, children: [_jsx("div", { className: "button-ripple", style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                    transform: isClicked ? 'scale(2)' : 'scale(0)',
                    opacity: isClicked ? 0 : 1,
                    transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    pointerEvents: 'none',
                } }), showSuccess ? (_jsxs(_Fragment, { children: [_jsx("span", { style: { fontSize: '16px' }, children: "\u2713" }), _jsx("span", { className: "adaptive-card__action-title", children: "Success!" })] })) : (_jsxs(_Fragment, { children: [iconUrl && (_jsx("img", { src: iconUrl, alt: "", className: "adaptive-card__action-icon", style: {
                            width: '16px',
                            height: '16px',
                            flexShrink: 0,
                            transition: 'transform 0.3s ease',
                            transform: isClicked ? 'rotate(360deg)' : 'rotate(0deg)',
                        } })), _jsx("span", { className: "adaptive-card__action-title", children: isClicked ? (_jsxs("span", { className: "loading-dots", children: [_jsx("span", { className: "loading-dot" }), _jsx("span", { className: "loading-dot" }), _jsx("span", { className: "loading-dot" })] })) : (title) })] }))] }));
};
// Add styles for the loading dots animation
const loadingDotsStyle = `
.loading-dots {
  display: inline-flex;
  gap: 4px;
  align-items: center;
}

.loading-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 1.4s infinite ease-in-out;
}

.loading-dot:nth-child(1) { animation-delay: -0.32s; }
.loading-dot:nth-child(2) { animation-delay: -0.16s; }
.loading-dot:nth-child(3) { animation-delay: 0s; }

@keyframes pulse {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
`;
// Inject styles if not already present
if (typeof document !== 'undefined' && !document.querySelector('#loading-dots-styles')) {
    const style = document.createElement('style');
    style.id = 'loading-dots-styles';
    style.textContent = loadingDotsStyle;
    document.head.appendChild(style);
}
//# sourceMappingURL=SubmitAction.js.map