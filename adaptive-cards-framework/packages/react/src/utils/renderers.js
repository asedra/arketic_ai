import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// Import React components
import { TextBlock } from '../components/elements/TextBlock';
import { Image } from '../components/elements/Image';
import { Container } from '../components/elements/Container';
import { InputText } from '../components/elements/InputText';
import { ActionSet } from '../components/elements/ActionSet';
import { SubmitAction } from '../components/actions/SubmitAction';
import { OpenUrlAction } from '../components/actions/OpenUrlAction';
export function createReactRenderers(options = {}) {
    const elementRenderers = {
        TextBlock: (element, context) => (_jsx(TextBlock, { element: element }, element.id)),
        Image: (element, context) => (_jsx(Image, { element: element }, element.id)),
        Container: (element, context) => (_jsx(Container, { element: element }, element.id)),
        'Input.Text': (element, context) => (_jsx(InputText, { element: element }, element.id)),
        ActionSet: (element, context) => (_jsx(ActionSet, { element: element }, element.id)),
    };
    const actionRenderers = {
        'Action.Submit': (action, context) => (_jsx(SubmitAction, { action: action }, action.id)),
        'Action.OpenUrl': (action, context) => (_jsx(OpenUrlAction, { action: action }, action.id)),
        'Action.ShowCard': (action, context) => {
            // For now, show card actions will render as a simple button
            // In a full implementation, this would toggle card visibility
            return (_jsx("button", { onClick: () => options.onAction?.(action), style: {
                    padding: '8px 16px',
                    border: '1px solid #CCCCCC',
                    borderRadius: '4px',
                    backgroundColor: '#F3F2F1',
                    color: '#323130',
                    cursor: 'pointer',
                }, children: action.title || 'Show Card' }, action.id));
        },
    };
    return {
        elementRenderers,
        actionRenderers,
    };
}
// Helper function to render any element
export function renderElement(element, context) {
    const renderer = context.elementRenderers[element.type];
    if (!renderer) {
        console.warn(`No renderer found for element type: ${element.type}`);
        return (_jsxs("div", { style: { padding: '8px', backgroundColor: '#FFF3CD', border: '1px solid #FFC107', borderRadius: '4px' }, children: ["Unsupported element: ", element.type] }, element.id));
    }
    return renderer(element, context);
}
// Helper function to render any action
export function renderAction(action, context) {
    const renderer = context.actionRenderers[action.type];
    if (!renderer) {
        console.warn(`No renderer found for action type: ${action.type}`);
        return (_jsxs("button", { style: {
                padding: '8px 16px',
                border: '1px solid #DC3545',
                borderRadius: '4px',
                backgroundColor: '#F8D7DA',
                color: '#721C24',
                cursor: 'not-allowed',
            }, children: ["Unsupported action: ", action.type] }, action.id));
    }
    return renderer(action, context);
}
// Default CSS styles as a string (can be imported in applications)
export const defaultStyles = `
.adaptive-card {
  font-family: 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  max-width: 100%;
  background: #FFFFFF;
  border: 1px solid #E1E1E1;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.adaptive-card__body {
  padding: 16px;
}

.adaptive-card__actions {
  padding: 8px 16px 16px;
  border-top: 1px solid #E1E1E1;
  background: #F8F9FA;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.adaptive-card__text-block {
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.adaptive-card__text-block:last-child {
  margin-bottom: 0;
}

.adaptive-card__image {
  margin: 8px 0;
}

.adaptive-card__image:first-child {
  margin-top: 0;
}

.adaptive-card__image:last-child {
  margin-bottom: 0;
}

.adaptive-card__image--clickable {
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.adaptive-card__image--clickable:hover {
  opacity: 0.8;
}

.adaptive-card__image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F8F9FA;
  color: #6C757D;
  border: 2px dashed #DEE2E6;
  border-radius: 4px;
  min-height: 60px;
  font-size: 12px;
}

.adaptive-card__image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #F8D7DA;
  color: #721C24;
  border: 1px solid #F5C6CB;
  border-radius: 4px;
  padding: 16px;
  text-align: center;
  font-size: 12px;
}

.adaptive-card__container {
  margin: 8px 0;
}

.adaptive-card__container:first-child {
  margin-top: 0;
}

.adaptive-card__container:last-child {
  margin-bottom: 0;
}

.adaptive-card__container-item {
  margin: 8px 0;
}

.adaptive-card__container-item:first-child {
  margin-top: 0;
}

.adaptive-card__container-item:last-child {
  margin-bottom: 0;
}

.adaptive-card__input-container {
  margin: 12px 0;
}

.adaptive-card__input-container:first-child {
  margin-top: 0;
}

.adaptive-card__input-container:last-child {
  margin-bottom: 0;
}

.adaptive-card__input-label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #333333;
}

.adaptive-card__required-indicator {
  color: #D13438;
  margin-left: 2px;
}

.adaptive-card__input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #CCCCCC;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease;
}

.adaptive-card__input:focus {
  border-color: #0078D4;
  box-shadow: 0 0 0 2px rgba(0, 120, 212, 0.2);
}

.adaptive-card__input--error {
  border-color: #D13438 !important;
}

.adaptive-card__input-error {
  margin-top: 4px;
  font-size: 12px;
  color: #D13438;
}

.adaptive-card__action-set {
  margin: 16px 0 0 0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.adaptive-card__action {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  text-decoration: none;
  outline: none;
}

.adaptive-card__action--default {
  background-color: #F3F2F1;
  color: #323130;
  border: 1px solid #CCCCCC;
}

.adaptive-card__action--positive {
  background-color: #0078D4;
  color: #FFFFFF;
}

.adaptive-card__action--destructive {
  background-color: #D13438;
  color: #FFFFFF;
}

.adaptive-card__action:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.adaptive-card__action:active:not(:disabled) {
  transform: translateY(0);
}

.adaptive-card__action--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.adaptive-card__action-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.adaptive-card__external-link-icon {
  flex-shrink: 0;
  margin-left: 4px;
  opacity: 0.7;
}

.adaptive-card--error {
  border-color: #D13438;
  background-color: #FDF2F2;
}

.adaptive-card__error-message {
  padding: 16px;
  color: #D13438;
  text-align: center;
  font-weight: 500;
}

/* Theme variations */
.adaptive-card--theme-dark {
  background: #2D2D30;
  border-color: #464647;
  color: #CCCCCC;
}

.adaptive-card--theme-dark .adaptive-card__actions {
  background: #252526;
  border-color: #464647;
}
`;
//# sourceMappingURL=renderers.js.map