#!/usr/bin/env python3

import requests
import json
import time
import sys

# Get backend URL from frontend/.env
BACKEND_URL = "https://ai-workout-fix-1.preview.emergentagent.com/api"

def test_food_nutrition_estimation():
    """Test the food nutrition estimation endpoint POST /api/nutrition/estimate-food"""
    
    print("🧪 TESTING: Food Nutrition Estimation Endpoint")
    print("=" * 60)
    
    # Test user credentials
    test_email = "testfood@test.com"
    test_password = "Test123!"
    
    session = requests.Session()
    
    # Step 1: Register/Login test user
    print(f"📝 Step 1: Registering/Logging in test user: {test_email}")
    
    # Try to register first
    register_data = {
        "email": test_email,
        "password": test_password,
        "name": "Test Food User"
    }
    
    try:
        register_response = session.post(f"{BACKEND_URL}/auth/register", json=register_data)
        if register_response.status_code == 200:
            print("✅ User registered successfully")
        elif register_response.status_code == 400 and "already registered" in register_response.text:
            print("ℹ️ User already exists, proceeding to login")
        else:
            print(f"❌ Registration failed: {register_response.status_code} - {register_response.text}")
    except Exception as e:
        print(f"❌ Registration error: {e}")
    
    # Login
    login_data = {
        "email": test_email,
        "password": test_password
    }
    
    try:
        login_response = session.post(f"{BACKEND_URL}/auth/login", json=login_data)
        if login_response.status_code == 200:
            print("✅ Login successful")
            login_result = login_response.json()
            print(f"   User ID: {login_result.get('user', {}).get('user_id', 'N/A')}")
        else:
            print(f"❌ Login failed: {login_response.status_code} - {login_response.text}")
            return False
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False
    
    print()
    
    # Test 1: Estimate nutrition for a common food (Frango grelhado, 150g)
    print("🍗 Test 1: Estimate nutrition for common food - Frango grelhado, 150g")
    print("-" * 50)
    
    test1_data = {
        "food_name": "Frango grelhado",
        "quantity": "150g"
    }
    
    try:
        start_time = time.time()
        response1 = session.post(f"{BACKEND_URL}/nutrition/estimate-food", json=test1_data, timeout=60)
        end_time = time.time()
        
        print(f"⏱️ Response time: {end_time - start_time:.2f} seconds")
        print(f"📊 Status code: {response1.status_code}")
        
        if response1.status_code == 200:
            result1 = response1.json()
            print("✅ Response received successfully")
            print(f"   Success: {result1.get('success')}")
            print(f"   Food name: {result1.get('food_name')}")
            print(f"   Quantity: {result1.get('quantity')}")
            print(f"   Calories: {result1.get('calories')} kcal")
            print(f"   Protein: {result1.get('protein')} g")
            print(f"   Carbs: {result1.get('carbs')} g")
            print(f"   Fat: {result1.get('fat')} g")
            print(f"   Fiber: {result1.get('fiber')} g")
            print(f"   Sodium: {result1.get('sodium')} mg")
            print(f"   Sugar: {result1.get('sugar')} g")
            
            # Verify response structure and reasonable values
            if result1.get('success') == True:
                print("✅ Success field is True")
            else:
                print(f"❌ Success field is not True: {result1.get('success')}")
                
            calories = result1.get('calories', 0)
            protein = result1.get('protein', 0)
            
            # Check if values are reasonable for 150g chicken (should be ~200-300 kcal, ~30-45g protein)
            if 150 <= calories <= 400:
                print(f"✅ Calories value reasonable for 150g chicken: {calories} kcal")
            else:
                print(f"⚠️ Calories value may be unreasonable: {calories} kcal (expected ~200-300)")
                
            if 20 <= protein <= 50:
                print(f"✅ Protein value reasonable for 150g chicken: {protein} g")
            else:
                print(f"⚠️ Protein value may be unreasonable: {protein} g (expected ~30-45)")
                
            # Check if all numeric values are present
            required_fields = ['calories', 'protein', 'carbs', 'fat', 'fiber']
            all_present = all(field in result1 for field in required_fields)
            if all_present:
                print("✅ All required nutritional fields present")
            else:
                missing = [field for field in required_fields if field not in result1]
                print(f"❌ Missing nutritional fields: {missing}")
                
        else:
            print(f"❌ Request failed: {response1.text}")
            
    except Exception as e:
        print(f"❌ Test 1 error: {e}")
    
    print()
    
    # Test 2: Estimate nutrition for a composite dish (Prato feito brasileiro)
    print("🍽️ Test 2: Estimate nutrition for composite dish - Prato feito brasileiro")
    print("-" * 50)
    
    test2_data = {
        "food_name": "Prato feito brasileiro",
        "quantity": "1 prato médio"
    }
    
    try:
        start_time = time.time()
        response2 = session.post(f"{BACKEND_URL}/nutrition/estimate-food", json=test2_data, timeout=60)
        end_time = time.time()
        
        print(f"⏱️ Response time: {end_time - start_time:.2f} seconds")
        print(f"📊 Status code: {response2.status_code}")
        
        if response2.status_code == 200:
            result2 = response2.json()
            print("✅ Response received successfully")
            print(f"   Success: {result2.get('success')}")
            print(f"   Food name: {result2.get('food_name')}")
            print(f"   Quantity: {result2.get('quantity')}")
            print(f"   Calories: {result2.get('calories')} kcal")
            print(f"   Protein: {result2.get('protein')} g")
            print(f"   Carbs: {result2.get('carbs')} g")
            print(f"   Fat: {result2.get('fat')} g")
            print(f"   Fiber: {result2.get('fiber')} g")
            
            # Verify response structure and reasonable values
            if result2.get('success') == True:
                print("✅ Success field is True")
            else:
                print(f"❌ Success field is not True: {result2.get('success')}")
                
            calories = result2.get('calories', 0)
            
            # Check if values are reasonable for a Brazilian plate (typically 500-800 kcal)
            if 400 <= calories <= 1000:
                print(f"✅ Calories value reasonable for Brazilian plate: {calories} kcal")
            else:
                print(f"⚠️ Calories value may be unreasonable: {calories} kcal (expected ~500-800)")
                
            # Check if all nutritional values are present and reasonable
            required_fields = ['calories', 'protein', 'carbs', 'fat', 'fiber']
            all_present = all(field in result2 and result2[field] > 0 for field in required_fields)
            if all_present:
                print("✅ All required nutritional fields present and > 0")
            else:
                missing_or_zero = [field for field in required_fields if field not in result2 or result2[field] <= 0]
                print(f"❌ Missing or zero nutritional fields: {missing_or_zero}")
                
        else:
            print(f"❌ Request failed: {response2.text}")
            
    except Exception as e:
        print(f"❌ Test 2 error: {e}")
    
    print()
    
    # Test 3: Missing food_name should return error
    print("❌ Test 3: Missing food_name should return 400 error")
    print("-" * 50)
    
    test3_data = {
        "food_name": "",
        "quantity": "100g"
    }
    
    try:
        response3 = session.post(f"{BACKEND_URL}/nutrition/estimate-food", json=test3_data, timeout=30)
        
        print(f"📊 Status code: {response3.status_code}")
        
        if response3.status_code == 400:
            print("✅ Correctly returned 400 error for missing food_name")
            try:
                error_result = response3.json()
                print(f"   Error detail: {error_result.get('detail', 'No detail provided')}")
            except:
                print(f"   Error text: {response3.text}")
        else:
            print(f"❌ Expected 400 error but got {response3.status_code}")
            print(f"   Response: {response3.text}")
            
    except Exception as e:
        print(f"❌ Test 3 error: {e}")
    
    print()
    print("🏁 TESTING COMPLETE")
    print("=" * 60)
    
    return True

if __name__ == "__main__":
    test_food_nutrition_estimation()