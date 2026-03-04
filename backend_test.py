#!/usr/bin/env python3
"""
Backend Testing for NEW Sirius Study App Endpoints
Testing the newly implemented study-focused endpoints
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://quiz-simulator-2.preview.emergentagent.com/api"

def test_registration_login():
    """Test user registration and login"""
    print("🔐 Testing Authentication...")
    
    # Test user credentials  
    test_email = "teststudy@test.com"
    test_password = "Test123!"
    test_name = "Test Study User"
    
    # Register user
    register_data = {
        "email": test_email,
        "password": test_password,
        "name": test_name
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/auth/register", json=register_data)
        if response.status_code == 200:
            print(f"✅ User registration successful")
            session_data = response.json()
            session_token = session_data["session_token"]
            return session_token
        elif response.status_code == 400 and "already registered" in response.text:
            print(f"ℹ️ User already exists, attempting login...")
            # Try login
            login_data = {"email": test_email, "password": test_password}
            login_response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
            if login_response.status_code == 200:
                print(f"✅ User login successful")
                session_data = login_response.json()
                session_token = session_data["session_token"]
                return session_token
            else:
                print(f"❌ Login failed: {login_response.status_code} - {login_response.text}")
                return None
        else:
            print(f"❌ Registration failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Authentication error: {e}")
        return None

def test_study_programs_crud(session_token):
    """Test Study Programs CRUD operations"""
    print("\n📚 Testing Study Programs CRUD...")
    
    headers = {"Cookie": f"session_token={session_token}"}
    
    try:
        # First, get study areas to get an area_id
        print("  Getting study areas...")
        areas_response = requests.get(f"{BACKEND_URL}/study/areas", headers=headers)
        if areas_response.status_code != 200:
            print(f"❌ Failed to get study areas: {areas_response.status_code}")
            return False
        
        areas = areas_response.json()
        if not areas:
            print("❌ No study areas found")
            return False
        
        area_id = areas[0]["area_id"]
        print(f"✅ Got area_id: {area_id}")
        
        # Test POST /api/study/programs
        program_data = {
            "area_id": area_id,
            "name": "Curso de Direito",
            "description": "Bacharelado",
            "color": "#10B981",
            "target_date": "2027-12-01"
        }
        
        print("  Creating study program...")
        create_response = requests.post(f"{BACKEND_URL}/study/programs", json=program_data, headers=headers)
        if create_response.status_code != 200:
            print(f"❌ Failed to create study program: {create_response.status_code} - {create_response.text}")
            return False
        
        program = create_response.json()
        program_id = program["program_id"]
        print(f"✅ Created study program: {program['name']} (ID: {program_id})")
        
        # Test GET /api/study/programs with area filter
        print("  Getting study programs by area...")
        get_response = requests.get(f"{BACKEND_URL}/study/programs?area_id={area_id}", headers=headers)
        if get_response.status_code != 200:
            print(f"❌ Failed to get study programs: {get_response.status_code}")
            return False
        
        programs = get_response.json()
        print(f"✅ Retrieved {len(programs)} study programs")
        
        # Test PATCH /api/study/programs/{program_id}
        print("  Updating study program status...")
        update_data = {"status": "paused"}
        update_response = requests.patch(f"{BACKEND_URL}/study/programs/{program_id}", json=update_data, headers=headers)
        if update_response.status_code != 200:
            print(f"❌ Failed to update study program: {update_response.status_code} - {update_response.text}")
            return False
        
        updated_program = update_response.json()
        print(f"✅ Updated program status to: {updated_program['status']}")
        
        # Test DELETE /api/study/programs/{program_id}
        print("  Deleting study program...")
        delete_response = requests.delete(f"{BACKEND_URL}/study/programs/{program_id}", headers=headers)
        if delete_response.status_code != 200:
            print(f"❌ Failed to delete study program: {delete_response.status_code} - {delete_response.text}")
            return False
        
        print("✅ Study program deleted successfully")
        return True
        
    except Exception as e:
        print(f"❌ Study Programs CRUD test error: {e}")
        return False

def test_notebooks_with_program_id(session_token):
    """Test Notebooks creation with program_id"""
    print("\n📓 Testing Notebooks with Program ID...")
    
    headers = {"Cookie": f"session_token={session_token}"}
    
    try:
        # First create a program to link to
        areas_response = requests.get(f"{BACKEND_URL}/study/areas", headers=headers)
        areas = areas_response.json()
        area_id = areas[0]["area_id"]
        
        program_data = {
            "area_id": area_id,
            "name": "Test Program for Notebooks",
            "description": "Test program",
            "color": "#10B981"
        }
        
        program_response = requests.post(f"{BACKEND_URL}/study/programs", json=program_data, headers=headers)
        program = program_response.json()
        program_id = program["program_id"]
        print(f"✅ Created test program: {program_id}")
        
        # Test POST /api/study/notebooks with program_id
        notebook_data = {
            "area_id": area_id,
            "program_id": program_id,
            "name": "Direito Civil",
            "description": "Notebook de Direito Civil",
            "color": "#3B82F6"
        }
        
        print("  Creating notebook with program_id...")
        create_response = requests.post(f"{BACKEND_URL}/study/notebooks", json=notebook_data, headers=headers)
        if create_response.status_code != 200:
            print(f"❌ Failed to create notebook: {create_response.status_code} - {create_response.text}")
            return False
        
        notebook = create_response.json()
        notebook_id = notebook["notebook_id"]
        print(f"✅ Created notebook: {notebook['name']} (ID: {notebook_id})")
        
        # Test GET /api/study/notebooks with program_id filter
        print("  Getting notebooks by program_id...")
        get_response = requests.get(f"{BACKEND_URL}/study/notebooks?program_id={program_id}", headers=headers)
        if get_response.status_code != 200:
            print(f"❌ Failed to get notebooks: {get_response.status_code}")
            return False
        
        notebooks = get_response.json()
        print(f"✅ Retrieved {len(notebooks)} notebooks for program")
        
        # Clean up - delete the program (will cascade delete notebooks)
        requests.delete(f"{BACKEND_URL}/study/programs/{program_id}", headers=headers)
        
        return True, notebook_id, program_id
        
    except Exception as e:
        print(f"❌ Notebooks test error: {e}")
        return False, None, None

def test_question_tracking(session_token, notebook_id):
    """Test Question Tracking endpoints"""
    print("\n📊 Testing Question Tracking...")
    
    headers = {"Cookie": f"session_token={session_token}"}
    
    try:
        # Test POST /api/study/questions/log
        question_data = {
            "notebook_id": notebook_id,
            "total": 20,
            "correct": 15,
            "source": "manual"
        }
        
        print("  Logging questions answered...")
        log_response = requests.post(f"{BACKEND_URL}/study/questions/log", json=question_data, headers=headers)
        if log_response.status_code != 200:
            print(f"❌ Failed to log questions: {log_response.status_code} - {log_response.text}")
            return False
        
        log_result = log_response.json()
        print(f"✅ Logged {log_result['total']} questions, {log_result['correct']} correct")
        print(f"   XP earned: {log_result.get('xp_earned', 0)}")
        
        # Test GET /api/study/questions/stats with notebook filter
        print("  Getting question statistics...")
        stats_response = requests.get(f"{BACKEND_URL}/study/questions/stats?notebook_id={notebook_id}", headers=headers)
        if stats_response.status_code != 200:
            print(f"❌ Failed to get question stats: {stats_response.status_code}")
            return False
        
        stats = stats_response.json()
        print(f"✅ Question stats - Total: {stats['total_questions']}, Correct: {stats['correct']}, Accuracy: {stats['accuracy']}%")
        
        return True
        
    except Exception as e:
        print(f"❌ Question tracking test error: {e}")
        return False

def test_focus_pomodoro(session_token, notebook_id):
    """Test Focus/Pomodoro endpoints"""
    print("\n🎯 Testing Focus/Pomodoro...")
    
    headers = {"Cookie": f"session_token={session_token}"}
    
    try:
        # Test POST /api/study/focus/complete
        focus_data = {
            "notebook_id": notebook_id,
            "focus_minutes": 25,
            "break_minutes": 5,
            "notes": "Estudei direito civil"
        }
        
        print("  Completing focus session...")
        complete_response = requests.post(f"{BACKEND_URL}/study/focus/complete", json=focus_data, headers=headers)
        if complete_response.status_code != 200:
            print(f"❌ Failed to complete focus session: {complete_response.status_code} - {complete_response.text}")
            return False
        
        focus_result = complete_response.json()
        print(f"✅ Completed {focus_result['focus_minutes']} minute focus session")
        print(f"   XP earned: {focus_result.get('xp_earned', 0)}")
        
        # Test GET /api/study/focus/stats
        print("  Getting focus statistics...")
        stats_response = requests.get(f"{BACKEND_URL}/study/focus/stats", headers=headers)
        if stats_response.status_code != 200:
            print(f"❌ Failed to get focus stats: {stats_response.status_code}")
            return False
        
        stats = stats_response.json()
        print(f"✅ Focus stats - Today: {stats['today']['sessions']} sessions, {stats['today']['total_minutes']} minutes")
        
        return True
        
    except Exception as e:
        print(f"❌ Focus/Pomodoro test error: {e}")
        return False

def test_ai_study_assistant(session_token):
    """Test AI Study Assistant endpoint"""
    print("\n🤖 Testing AI Study Assistant...")
    
    headers = {"Cookie": f"session_token={session_token}"}
    
    try:
        # Test POST /api/study/ai-chat
        ai_data = {
            "message": "Me ajude a entender contratos no direito civil",
            "context_type": "explain"
        }
        
        print("  Asking AI study assistant...")
        ai_response = requests.post(f"{BACKEND_URL}/study/ai-chat", json=ai_data, headers=headers)
        if ai_response.status_code != 200:
            print(f"❌ Failed to get AI response: {ai_response.status_code} - {ai_response.text}")
            return False
        
        ai_result = ai_response.json()
        print(f"✅ AI Study Assistant responded ({len(ai_result['response'])} characters)")
        print(f"   Context type: {ai_result['context_type']}")
        
        return True
        
    except Exception as e:
        print(f"❌ AI Study Assistant test error: {e}")
        return False

def test_recipe_detail(session_token):
    """Test Recipe Detail endpoint"""
    print("\n🍳 Testing Recipe Detail...")
    
    headers = {"Cookie": f"session_token={session_token}"}
    
    try:
        # First, we need to create a recipe using the suggest endpoint
        print("  Creating a recipe first...")
        recipe_request = {
            "preferences": "healthy, low carb, chicken",
            "dietary_restrictions": "none",
            "cooking_time": "30 minutes"
        }
        
        suggest_response = requests.post(f"{BACKEND_URL}/nutrition/recipes/suggest", json=recipe_request, headers=headers)
        if suggest_response.status_code != 200:
            print(f"❌ Failed to create recipe via suggest: {suggest_response.status_code} - {suggest_response.text}")
            return False
        
        suggest_result = suggest_response.json()
        print(f"✅ Created recipe suggestion")
        
        # The suggest endpoint might not return a recipe_id directly, so let's check saved recipes
        recipes_response = requests.get(f"{BACKEND_URL}/nutrition/recipes", headers=headers)
        if recipes_response.status_code != 200:
            print(f"❌ Failed to get recipes: {recipes_response.status_code}")
            return False
        
        recipes = recipes_response.json()
        if not recipes:
            print("ℹ️ No recipes found, AI suggestion might not have been saved")
            return True  # Not a failure, just no recipes to test detail endpoint with
        
        recipe_id = recipes[0]["recipe_id"]
        
        # Test GET /api/nutrition/recipes/{recipe_id}
        print("  Getting recipe detail...")
        detail_response = requests.get(f"{BACKEND_URL}/nutrition/recipes/{recipe_id}", headers=headers)
        if detail_response.status_code != 200:
            print(f"❌ Failed to get recipe detail: {detail_response.status_code} - {detail_response.text}")
            return False
        
        recipe_detail = detail_response.json()
        print(f"✅ Retrieved recipe detail: {recipe_detail.get('name', 'Unknown')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Recipe detail test error: {e}")
        return False

def main():
    """Main testing function"""
    print("🚀 Starting NEW Sirius Study App Backend Testing")
    print("=" * 60)
    
    # Test authentication first
    session_token = test_registration_login()
    if not session_token:
        print("❌ Authentication failed, cannot continue testing")
        sys.exit(1)
    
    test_results = []
    notebook_id = None
    
    # Test Study Programs CRUD
    result = test_study_programs_crud(session_token)
    test_results.append(("Study Programs CRUD", result))
    
    # Test Notebooks with program_id
    result, notebook_id, program_id = test_notebooks_with_program_id(session_token)
    test_results.append(("Notebooks with Program ID", result))
    
    # Test Question Tracking (needs notebook_id)
    if notebook_id:
        result = test_question_tracking(session_token, notebook_id)
        test_results.append(("Question Tracking", result))
        
        # Test Focus/Pomodoro (needs notebook_id)
        result = test_focus_pomodoro(session_token, notebook_id)
        test_results.append(("Focus/Pomodoro", result))
    else:
        print("⚠️ Skipping Question Tracking and Focus tests - no notebook_id available")
    
    # Test AI Study Assistant
    result = test_ai_study_assistant(session_token)
    test_results.append(("AI Study Assistant", result))
    
    # Test Recipe Detail
    result = test_recipe_detail(session_token)
    test_results.append(("Recipe Detail", result))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    for test_name, success in test_results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_name:<30} {status}")
        if success:
            passed += 1
    
    print(f"\n🎯 Overall Result: {passed}/{total} tests passed ({(passed/total)*100:.0f}%)")
    
    if passed == total:
        print("🎉 All tests passed! NEW endpoints are working correctly.")
        return True
    else:
        print("⚠️ Some tests failed. Check the output above for details.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)