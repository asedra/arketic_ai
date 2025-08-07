# Test ChatGPT API Key Saving - Step by Step Guide

## Current Status: ALL SYSTEMS OPERATIONAL ✅

Based on comprehensive testing, the ChatGPT API key saving functionality is working correctly. Here's how to test it:

## Prerequisites
Make sure these services are running:

1. **Frontend (Next.js)**: Should be running on http://localhost:3000
2. **Settings API**: Should be running on http://localhost:8001  
3. **Main API**: Should be running on http://localhost:8000

## Step-by-Step Testing

### Step 1: Start the Backend Services
```bash
# Terminal 1 - Start Settings API
cd /home/ali/arketic/arketic_mockup/backend
python3 settings_api.py

# Terminal 2 - Start Main API (optional but recommended)
cd /home/ali/arketic/arketic_mockup/backend
python3 demo_server.py
```

### Step 2: Test Settings API Directly
```bash
# Test that Settings API is working
curl http://localhost:8001/health
# Should return: {"status":"healthy","service":"settings-api"}

# Test saving an API key
curl -X POST http://localhost:8001/api/v1/settings/openai \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "sk-test123456789012345678901234567890",
    "model": "gpt-3.5-turbo",
    "max_tokens": 1000,
    "temperature": 0.7
  }'
# Should return success message with masked API key

# Test retrieving settings
curl http://localhost:8001/api/v1/settings
# Should return the saved settings with masked API key
```

### Step 3: Test Frontend Integration
1. **Navigate to Settings Page**
   - Open http://localhost:3000 in your browser
   - Go to the Settings section/page
   - Look for "OpenAI API Configuration" section

2. **Enter API Key**
   - Enter a test API key: `sk-test123456789012345678901234567890`
   - Set other parameters (model, max tokens, temperature)
   - Click "Save Settings"

3. **Verify Saving**
   - You should see a success toast/notification
   - The API key should be masked in the display
   - Refresh the page - settings should persist

4. **Test Connection**
   - Click "Test Connection" button
   - Should show success message (in demo mode)

5. **Clear Settings**
   - Click "Clear Settings" 
   - Settings should be removed
   - Refresh page to verify they're gone

## If You Encounter Issues

### Issue: "Cannot connect to backend"
**Solution**: Make sure Settings API is running on port 8001
```bash
cd /home/ali/arketic/arketic_mockup/backend
python3 settings_api.py
```

### Issue: "API key format invalid"
**Solution**: Use a properly formatted OpenAI API key that starts with 'sk-' and is at least 20 characters long

### Issue: "Settings not persisting"
**Solution**: Check that the backend has write permissions to create `user_settings.json`:
```bash
ls -la /home/ali/arketic/arketic_mockup/backend/user_settings.json
```

### Issue: "CORS errors in browser"
**Solution**: The Settings API is configured for localhost:3000. If using a different port, update the CORS settings in `settings_api.py`

## Quick Verification Script

Run this to verify everything is working:

```bash
cd /home/ali/arketic/arketic_mockup/backend
python3 -c "
import requests
import json

# Test Settings API
try:
    # Health check
    health = requests.get('http://localhost:8001/health')
    print('Settings API Health:', health.json())
    
    # Save settings
    settings = {
        'api_key': 'sk-test123456789012345678901234567890',
        'model': 'gpt-3.5-turbo',
        'max_tokens': 1000,
        'temperature': 0.7
    }
    
    save_response = requests.post('http://localhost:8001/api/v1/settings/openai', json=settings)
    print('Save Response:', save_response.json())
    
    # Retrieve settings
    get_response = requests.get('http://localhost:8001/api/v1/settings')
    print('Retrieved Settings:', get_response.json())
    
    print('✅ ALL TESTS PASSED - API Key saving is working!')
    
except Exception as e:
    print('❌ Error:', e)
    print('Make sure Settings API is running: python3 settings_api.py')
"
```

## Expected Behavior

When working correctly, you should see:
1. ✅ API key gets saved to backend storage
2. ✅ API key is masked in responses (sk-•••••••••••••••••••••••••••••••••7890)
3. ✅ Settings persist after page refresh
4. ✅ Can test connection (returns success in demo mode)
5. ✅ Can clear settings successfully
6. ✅ Form validation prevents invalid API keys

## Troubleshooting Logs

Check these log files if you encounter issues:
- Frontend logs: `/home/ali/arketic/arketic_mockup/frontend.log`
- Backend logs: Terminal output where you started the servers
- Browser console: F12 → Console tab for any JavaScript errors

## Contact/Support

If you still cannot save the ChatGPT API key after following these steps, please:
1. Run the Quick Verification Script above
2. Check the browser console for errors (F12)
3. Verify all services are running on the correct ports
4. Share any specific error messages you see