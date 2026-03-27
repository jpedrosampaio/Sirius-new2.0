#!/usr/bin/env python3

import requests
import json
import time
import sys

# Backend URL from environment
BACKEND_URL = "https://fstring-fix.preview.emergentagent.com/api"

def test_batch_nutrition_endpoint():
    """Test the NEW batch nutrition estimate endpoint as specified in review request"""
    
    print("🧪 TESTING: NEW Batch Nutrition Estimate Endpoint")
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
    
    # STEP 2: Test batch nutrition endpoint (success case)
    print("\n📝 STEP 2: Test batch nutrition endpoint (success case)")
    print("Testing with 3 foods: Arroz branco 200g, Frango grelhado 150g, Brócolis 100g")
    
    batch_data = {
        "foods": [
            {"food_name": "Arroz branco", "quantity": "200g"},
            {"food_name": "Frango grelhado", "quantity": "150g"},
            {"food_name": "Brócolis", "quantity": "100g"}
        ]
    }
    
    try:
        start_time = time.time()
        batch_response = session.post(
            f"{BACKEND_URL}/nutrition/estimate-foods-batch", 
            json=batch_data, 
            timeout=60  # 60 seconds timeout as specified in review request
        )
        end_time = time.time()
        response_time = end_time - start_time
        
        print(f"Batch Nutrition Status: {batch_response.status_code}")
        print(f"Response Time: {response_time:.2f}s")
        
        if batch_response.status_code != 200:
            print(f"❌ Batch nutrition failed: {batch_response.text}")
            return False
        
        batch_result = batch_response.json()
        print(f"Response Keys: {list(batch_result.keys())}")
        
        # Validate response structure
        if not batch_result.get("success"):
            print(f"❌ Response success=false: {batch_result}")
            return False
        
        foods = batch_result.get("foods", [])
        if len(foods) != 3:
            print(f"❌ Expected 3 foods, got {len(foods)}")
            return False
        
        print("✅ Batch nutrition estimation successful")
        print(f"✅ Processed {len(foods)} foods")
        
        # Validate each food item structure
        required_fields = ["index", "success", "food_name", "calories", "protein", "carbs", "fat", "fiber"]
        for i, food in enumerate(foods):
            print(f"\n🍽️ Food {i+1}: {food.get('food_name', 'Unknown')}")
            print(f"   Quantity: {food.get('quantity', 'N/A')}")
            print(f"   Success: {food.get('success', False)}")
            print(f"   Calories: {food.get('calories', 0)} kcal")
            print(f"   Protein: {food.get('protein', 0)}g")
            print(f"   Carbs: {food.get('carbs', 0)}g")
            print(f"   Fat: {food.get('fat', 0)}g")
            print(f"   Fiber: {food.get('fiber', 0)}g")
            
            # Check required fields
            for field in required_fields:
                if field not in food:
                    print(f"❌ Missing required field: {field}")
                    return False
        
        print("✅ All foods have required fields")
        
    except requests.exceptions.Timeout:
        print("❌ Request timed out (>60 seconds)")
        return False
    except Exception as e:
        print(f"❌ Batch nutrition error: {e}")
        return False
    
    # STEP 3: Test batch nutrition endpoint (error case - empty list)
    print("\n📝 STEP 3: Test batch nutrition endpoint (error case - empty list)")
    
    empty_data = {"foods": []}
    
    try:
        empty_response = session.post(
            f"{BACKEND_URL}/nutrition/estimate-foods-batch", 
            json=empty_data, 
            timeout=30
        )
        
        print(f"Empty Foods Status: {empty_response.status_code}")
        
        if empty_response.status_code != 400:
            print(f"❌ Expected 400 error, got {empty_response.status_code}")
            return False
        
        print("✅ Empty foods list correctly rejected with 400 error")
        
    except Exception as e:
        print(f"❌ Empty foods test error: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("🎉 ALL BATCH NUTRITION TESTS PASSED!")
    print("✅ Success case: 3 foods processed correctly")
    print("✅ Error case: Empty list rejected with 400")
    print("✅ Response structure matches specification")
    print("✅ All required fields present in food items")
    return True

if __name__ == "__main__":
    success = test_batch_nutrition_endpoint()
    sys.exit(0 if success else 1)