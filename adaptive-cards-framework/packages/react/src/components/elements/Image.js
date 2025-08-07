import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAdaptiveCard } from '../AdaptiveCardProvider';
import clsx from 'clsx';
export const Image = ({ element }) => {
    const { executeAction } = useAdaptiveCard();
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const { url, altText, size = 'auto', style: imageStyle = 'default', horizontalAlignment = 'left', backgroundColor, width, height, selectAction, } = element;
    const handleImageLoad = () => {
        setImageLoaded(true);
    };
    const handleImageError = () => {
        setImageError(true);
    };
    const handleClick = () => {
        if (selectAction) {
            executeAction(selectAction);
        }
    };
    const containerStyle = {
        display: 'flex',
        justifyContent: horizontalAlignment === 'center' ? 'center' : horizontalAlignment === 'right' ? 'flex-end' : 'flex-start',
        ...(backgroundColor && { backgroundColor }),
    };
    const imageStyle_ = {
        maxWidth: '100%',
        height: 'auto',
        cursor: selectAction ? 'pointer' : 'default',
        borderRadius: imageStyle === 'person' ? '50%' : '0',
        objectFit: imageStyle === 'person' ? 'cover' : 'contain',
    };
    // Set size-specific styles
    switch (size) {
        case 'small':
            imageStyle_.maxWidth = '40px';
            imageStyle_.maxHeight = '40px';
            break;
        case 'medium':
            imageStyle_.maxWidth = '80px';
            imageStyle_.maxHeight = '80px';
            break;
        case 'large':
            imageStyle_.maxWidth = '160px';
            imageStyle_.maxHeight = '160px';
            break;
        case 'stretch':
            imageStyle_.width = '100%';
            break;
    }
    // Override with explicit dimensions
    if (width) {
        imageStyle_.width = width;
    }
    if (height) {
        imageStyle_.height = height;
    }
    if (imageError) {
        return (_jsxs("div", { className: clsx('adaptive-card__image', 'adaptive-card__image--error', `adaptive-card__image--${size}`, `adaptive-card__image--${imageStyle}`), style: containerStyle, children: [_jsx("div", { className: true }), "\\\"adaptive-card__image-error\\\">", _jsx("span", { children: "Image not available" }), altText && _jsx("span", { className: true }), "\\\"adaptive-card__image-alt\\\">", altText] }));
    }
};
div >
;
div >
;
;
return (_jsxs("div", { className: clsx('adaptive-card__image', `adaptive-card__image--${size}`, `adaptive-card__image--${imageStyle}`, `adaptive-card__image--align-${horizontalAlignment}`, {
        'adaptive-card__image--clickable': !!selectAction,
        'adaptive-card__image--loading': !imageLoaded,
    }), style: containerStyle, onClick: handleClick, children: [!imageLoaded && (_jsx("div", { className: true })), "\\\"adaptive-card__image-placeholder\\\"> Loading..."] }));
_jsx("img", { src: url, alt: altText || '', style: imageStyle_, onLoad: handleImageLoad, onError: handleImageError, className: clsx({
        'adaptive-card__image-loaded': imageLoaded,
    }) });
div >
;
;
;
//# sourceMappingURL=Image.js.map