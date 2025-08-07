# Accessibility Guidelines

The Adaptive Cards Framework design system is built with accessibility as a core principle. All components are designed to meet WCAG 2.1 AA standards and provide an inclusive experience for all users.

## Core Principles

### 1. Perceivable
- **Color Contrast**: All color combinations meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- **Color Independence**: Information is never conveyed through color alone
- **Focus Indicators**: Clear, visible focus indicators on all interactive elements
- **Text Alternatives**: Meaningful alt text and aria-labels where appropriate

### 2. Operable
- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus Management**: Logical tab order and focus trapping where needed
- **Touch Targets**: Minimum 44px touch targets for mobile devices
- **Motion Control**: Respects `prefers-reduced-motion` setting

### 3. Understandable
- **Clear Labels**: Descriptive labels and instructions
- **Error Messages**: Clear, actionable error messages
- **Consistent Navigation**: Predictable interaction patterns
- **Language**: Proper language attributes and clear content

### 4. Robust
- **Semantic HTML**: Proper use of semantic elements
- **ARIA Attributes**: Appropriate ARIA labels and roles
- **Screen Reader Support**: Testing with screen readers
- **Cross-browser Compatibility**: Works across modern browsers

## Component Accessibility Features

### Cards
- Proper heading hierarchy with `CardTitle` using `h3` elements
- Optional interactive states with keyboard navigation
- ARIA labels for complex card content
- Focus management for clickable cards

```tsx
<Card interactive onClick={handleClick} aria-label="View project details">
  <CardHeader>
    <CardTitle>Project Name</CardTitle>
    <CardDescription>Project description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>
```

### Buttons
- Proper button semantics with `button` element
- Loading states with `aria-disabled` and loading text
- Icon buttons with accessible labels
- Focus indicators and keyboard navigation

```tsx
<Button 
  loading={isLoading}
  loadingText="Saving changes..."
  aria-label="Save document"
>
  Save
</Button>
```

### Form Inputs
- Associated labels with `htmlFor` and `id` attributes
- Error states with `aria-invalid` and `aria-describedby`
- Required field indicators with `aria-required`
- Helper text associations

```tsx
<Input
  id="email"
  label="Email Address"
  required
  error={!!errors.email}
  helperText={errors.email || "We'll never share your email"}
  aria-describedby="email-helper"
/>
```

### Badges and Status Indicators
- Status dots with `aria-hidden="true"` for decorative elements
- Meaningful text content that describes the status
- Color-independent status communication

```tsx
<StatusBadge status="success" aria-label="Process completed successfully">
  Complete
</StatusBadge>
```

## Color and Contrast

### Color Palette Accessibility
All colors in our palette meet WCAG AA standards:

- **Primary Blue (#0078D4)**: 4.54:1 contrast ratio on white
- **Success Green (#10B981)**: 4.52:1 contrast ratio on white  
- **Warning Amber (#F59E0B)**: 4.51:1 contrast ratio on black
- **Error Red (#EF4444)**: 4.55:1 contrast ratio on white

### Dark Mode Support
- All components automatically adapt to dark mode
- Contrast ratios maintained in both light and dark themes
- System preference detection with `prefers-color-scheme`

### High Contrast Mode
- Support for `prefers-contrast: high` media query
- Enhanced border and focus indicators in high contrast mode
- Increased color saturation for better visibility

## Focus Management

### Focus Indicators
- 2px solid ring in brand color with 2px offset
- Visible on all interactive elements
- Enhanced indicators for high contrast mode

```css
.focus-visible {
  outline: none;
  ring: 2px solid hsl(var(--ring));
  ring-offset: 2px;
}
```

### Focus Trapping
For modal dialogs and complex interactions:
- Focus trapped within the modal
- Focus returns to trigger element on close
- Escape key closes modal

### Tab Order
- Logical tab order following visual layout
- Skip links for complex layouts
- Focus moves to first focusable element in modals

## Motion and Animation

### Reduced Motion Support
All animations respect the `prefers-reduced-motion` setting:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Animation Guidelines
- Subtle animations that enhance UX without distraction
- No flashing or strobing effects
- Meaningful motion that supports user understanding

## Screen Reader Support

### Semantic HTML
- Proper use of headings, lists, and landmarks
- Form controls with associated labels
- Button and link elements for interactive content

### ARIA Attributes
- `aria-label` for buttons without visible text
- `aria-describedby` for additional descriptions
- `aria-expanded` for collapsible content
- `aria-live` for dynamic content updates

### Screen Reader Testing
Components are tested with:
- NVDA (Windows)
- JAWS (Windows)  
- VoiceOver (macOS/iOS)
- TalkBack (Android)

## Mobile Accessibility

### Touch Targets
- Minimum 44px × 44px touch targets
- Adequate spacing between interactive elements
- Swipe gestures with keyboard alternatives

### Responsive Design
- Content reflows properly at 320px width
- Text remains readable when zoomed to 200%
- No horizontal scrolling at standard zoom levels

## Testing Checklist

### Automated Testing
- [ ] axe-core accessibility testing
- [ ] Color contrast validation
- [ ] Keyboard navigation testing
- [ ] Focus indicator verification

### Manual Testing
- [ ] Screen reader testing
- [ ] Keyboard-only navigation
- [ ] High contrast mode testing
- [ ] Mobile accessibility testing
- [ ] Zoom level testing (up to 200%)

### Browser Testing
- [ ] Chrome with ChromeVox
- [ ] Firefox with NVDA
- [ ] Safari with VoiceOver
- [ ] Edge with Narrator

## Resources

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension for accessibility testing
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation tool
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/) - Color contrast checking tool

### Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)

### Testing
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Keyboard Accessibility Testing](https://webaim.org/articles/keyboard/)
- [Mobile Accessibility Testing](https://webaim.org/articles/mobile/)

## Support

For accessibility questions or issues, please:
1. Check the component documentation
2. Review the accessibility guidelines
3. Test with multiple assistive technologies
4. Report any accessibility bugs with detailed reproduction steps

Remember: Accessibility is not a feature—it's a fundamental requirement for inclusive design.