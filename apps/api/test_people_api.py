#!/usr/bin/env python3
"""
Test script for People API endpoints
"""

import requests
import json
from datetime import datetime

# API base URL
BASE_URL = "http://localhost:8000/api/v1"

# Test authentication credentials
TEST_USER = {
    "email": "test@arketic.com",
    "password": "Test123!@#"
}

def get_auth_token():
    """Get authentication token"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=TEST_USER)
        if response.status_code == 200:
            data = response.json()
            return data.get("access_token")
        else:
            print(f"Authentication failed: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"Error during authentication: {e}")
        return None

def test_get_people(token):
    """Test GET /api/v1/organization/people endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(f"{BASE_URL}/organization/people/", headers=headers)
        print(f"\nGET /organization/people/ - Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response structure: {list(data.keys())}")
            if "people" in data:
                print(f"Total people: {data.get('total', 0)}")
                print(f"Page: {data.get('page', 1)}")
                print(f"Page size: {data.get('page_size', 20)}")
                if data.get("people"):
                    print(f"\nFirst person:")
                    print(json.dumps(data["people"][0], indent=2))
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_create_person(token):
    """Test POST /api/v1/organization/people endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    
    test_person = {
        "first_name": "Test",
        "last_name": "User",
        "email": f"testuser_{datetime.now().strftime('%Y%m%d%H%M%S')}@arketic.com",
        "phone": "+1-555-0123",
        "job_title": "Software Developer",
        "department": "Engineering",
        "site": "Main Office",
        "location": "New York, NY",
        "role": "User",
        "notes": "Test user created via API test script"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/organization/people/", headers=headers, json=test_person)
        print(f"\nPOST /organization/people/ - Status: {response.status_code}")
        if response.status_code == 201:
            data = response.json()
            print(f"Created person successfully:")
            print(json.dumps(data, indent=2))
            return data.get("id")
        else:
            print(f"Error: {response.text}")
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_update_person(token, person_id):
    """Test PUT /api/v1/organization/people/{id} endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    
    update_data = {
        "job_title": "Senior Software Developer",
        "notes": "Updated via API test script"
    }
    
    try:
        response = requests.put(f"{BASE_URL}/organization/people/{person_id}", headers=headers, json=update_data)
        print(f"\nPUT /organization/people/{person_id} - Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Updated person successfully:")
            print(f"  Job Title: {data.get('job_title')}")
            print(f"  Notes: {data.get('notes')}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_delete_person(token, person_id):
    """Test DELETE /api/v1/organization/people/{id} endpoint"""
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.delete(f"{BASE_URL}/organization/people/{person_id}", headers=headers)
        print(f"\nDELETE /organization/people/{person_id} - Status: {response.status_code}")
        if response.status_code == 204:
            print(f"Deleted person successfully")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    print("=" * 60)
    print("Testing People API Endpoints")
    print("=" * 60)
    
    # Get authentication token
    print("\n1. Getting authentication token...")
    token = get_auth_token()
    if not token:
        print("Failed to authenticate. Exiting.")
        return
    
    print(f"   Token obtained: {token[:20]}...")
    
    # Test GET people
    print("\n2. Testing GET /organization/people/...")
    test_get_people(token)
    
    # Test CREATE person
    print("\n3. Testing POST /organization/people/...")
    person_id = test_create_person(token)
    
    if person_id:
        # Test UPDATE person
        print("\n4. Testing PUT /organization/people/{id}...")
        test_update_person(token, person_id)
        
        # Test DELETE person
        print("\n5. Testing DELETE /organization/people/{id}...")
        test_delete_person(token, person_id)
    
    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)

if __name__ == "__main__":
    main()