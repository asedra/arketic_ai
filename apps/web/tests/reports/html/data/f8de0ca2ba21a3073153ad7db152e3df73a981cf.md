# Page snapshot

```yaml
- img
- heading "Welcome back" [level=1]
- paragraph: Sign in to Arketic
- text: Sign In Enter your credentials to access your account
- img
- text: Too many requests. Please slow down. Email Address
- textbox "Email Address": invalid@example.com
- text: Password
- textbox "Enter your password": wrongpassword
- button:
  - img
- checkbox "Remember me"
- text: Remember me
- link "Forgot password?":
  - /url: /forgot-password
- button "Sign In":
  - text: Sign In
  - img
- text: Don't have an account?
- link "Create account":
  - /url: /signup
- heading "Test Credentials (Database User):" [level=3]
- paragraph:
  - strong: "Email:"
  - text: test@arketic.com
- paragraph:
  - strong: "Password:"
  - text: testpass123
- paragraph: "Note: Real database user for testing authentication"
- region "Notifications alt+T"
- button "Open Next.js Dev Tools":
  - img
- alert
```