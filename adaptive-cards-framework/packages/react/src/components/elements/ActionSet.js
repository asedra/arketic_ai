import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useAdaptiveCard } from '../AdaptiveCardProvider';
import { renderAction } from '../../utils/renderers';
import clsx from 'clsx';
export const ActionSet = ({ element }) => {
    const { context } = useAdaptiveCard();
    const { actions } = element;
    if (!actions || actions.length === 0) {
        return null;
    }
    return (_jsxs("div", { className: clsx('adaptive-card__action-set', {
            'adaptive-card__action-set--single': actions.length === 1,
            'adaptive-card__action-set--multiple': actions.length > 1,
        }), style: {
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'flex-start',
            alignItems: 'center',
            marginTop: '16px',
        }, children: [actions.map((action, index) => (_jsx("div", { className: true }, action.id || `action-${index}`))), "\\\"adaptive-card__action-wrapper\\\" >", renderAction(action, context)] }));
};
div >
;
;
;
//# sourceMappingURL=ActionSet.js.map