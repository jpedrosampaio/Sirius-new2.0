#!/usr/bin/env python3

import requests
import json
import time
import sys

# Backend URL from environment
BACKEND_URL = "https://simulado-pdf-import.preview.emergentagent.com/api"

def test_batch_nutrition_error_case():
    """Test only the error case of batch nutrition endpoint"""
    
    print("🧪 TESTING: Batch Nutrition Endpoint - Error Case Only")
    print("=" * 60)
    
    session = requests.Session()
    
    # STEP 1: Login
    print("\n📝 STEP 1: Login")
    login_data = {
        "email": "testworkout@test.com",
        "password": "Test123!"
    }
    
    try:
        login_response = session.post(f"{BACKEND_URL}/auth/login", json=login_data, timeout=30)
        print(f"Login Status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.text}")
            return False
            
        print("✅ Login successful")
        
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False
    
    # STEP 2: Test batch nutrition endpoint (error case - empty list)
    print("\n📝 STEP 2: Test batch nutrition endpoint (error case - empty list)")
    
    empty_data = {"foods": []}
    
    try:
        empty_response = session.post(
            f"{BACKEND_URL}/nutrition/estimate-foods-batch", 
            json=empty_data, 
            timeout=30
        )
        
        print(f"Empty Foods Status: {empty_response.status_code}")
        print(f"Response: {empty_response.text}")
        
        if empty_response.status_code != 400:
            print(f"❌ Expected 400 error, got {empty_response.status_code}")
            return False
        
        print("✅ Empty foods list correctly rejected with 400 error")
        
    except Exception as e:
        print(f"❌ Empty foods test error: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("🎯 BATCH NUTRITION ERROR CASE TEST PASSED!")
    print("✅ Error case: Empty list rejected with 400")
    return True

if __name__ == "__main__":
    success = test_batch_nutrition_error_case()
    sys.exit(0 if success else 1)