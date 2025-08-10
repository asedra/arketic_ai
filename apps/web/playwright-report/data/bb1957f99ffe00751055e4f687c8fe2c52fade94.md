# Page snapshot

```yaml
- img
- heading "Check your email" [level=1]
- img
- heading "Reset link sent!" [level=2]
- paragraph: We've sent a password reset link to test@arketic.com
- paragraph: If you don't see the email, check your spam folder.
- link "Back to sign in":
  - /url: /login
  - button "Back to sign in":
    - img
    - text: Back to sign in
- region "Notifications alt+T":
  - list:
    - listitem:
      - button "Close toast":
        - img
      - img
      - text: Reset link sent! Check your email for password reset instructions.
    - listitem:
      - button "Close toast":
        - img
      - img
      - text: Dashboard initialized successfully
- button "Open Next.js Dev Tools":
  - img
- alert
```