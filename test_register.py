#!/usr/bin/env python3
import requests
import json
import time

# Test registration endpoint
url = "http://localhost:8000/api/v1/auth/register"
timestamp = int(time.time())

# Registration data
data = {
    "email": f"testuser{timestamp}@arketic.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
}

print(f"Testing registration with email: {data['email']}")
print(f"Request data: {json.dumps(data, indent=2)}")

# Send request
response = requests.post(url, json=data)

print(f"\nStatus Code: {response.status_code}")
print(f"Response: {json.dumps(response.json(), indent=2)}")

if response.status_code == 200:
    print("\n✅ Registration successful!")
    if "access_token" in response.json():
        print("✅ Access token received")
    if "user" in response.json():
        print(f"✅ User created: {response.json()['user'].get('email')}")
else:
    print(f"\n❌ Registration failed: {response.status_code}")