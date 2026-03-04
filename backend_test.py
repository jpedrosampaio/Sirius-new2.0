#!/usr/bin/env python3
"""
Backend Test Script for Simulados (Mock Exam) Feature
Tests the newly implemented Simulados endpoints with updated Google Gemini API key
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://quiz-simulator-2.preview.emergentagent.com/api"
TEST_EMAIL = "testsimulado2@test.com"
TEST_PASSWORD = "Test123!"
TIMEOUT_SECONDS = 120  # Extended timeout for AI generation

# Test session variables
session_token = None
simulado_id = None
test_results = []

def log_test(test_name, passed, message="", details=""):
    """Log test results"""
    status = "✅ PASS" if passed else "❌ FAIL"
    timestamp = datetime.now().strftime("%H:%M:%S")
    result = {
        "test": test_name,
        "status": status,
        "timestamp": timestamp,
        "message": message,
        "details": details
    }
    test_results.append(result)
    print(f"[{timestamp}] {status} - {test_name}")
    if message:
        print(f"    {message}")
    if details and not passed:
        print(f"    Details: {details}")

def make_request(method, endpoint, data=None, timeout=30):
    """Make HTTP request with session token"""
    url = f"{BASE_URL}{endpoint}"
    headers = {
        "Content-Type": "application/json"
    }
    
    cookies = {}
    if session_token:
        cookies["session_token"] = session_token
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, cookies=cookies, timeout=timeout)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, cookies=cookies, 
                                   json=data if data else {}, timeout=timeout)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, cookies=cookies, timeout=timeout)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.Timeout:
        return None
    except Exception as e:
        print(f"Request error: {str(e)}")
        return None

def test_authentication():
    """Test user registration and authentication"""
    global session_token
    
    # Try to register user
    register_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": "Test Simulado User"
    }
    
    response = make_request("POST", "/auth/register", register_data)
    
    if response and response.status_code in [200, 400]:
        # Registration successful or user already exists
        # Now try to login
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        response = make_request("POST", "/auth/login", login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            session_token = data.get("session_token")
            if session_token:
                log_test("User Authentication", True, f"Logged in as {TEST_EMAIL}")
                return True
            else:
                log_test("User Authentication", False, "No session token returned")
                return False
        else:
            log_test("User Authentication", False, 
                    f"Login failed: {response.status_code if response else 'timeout'}")
            return False
    else:
        log_test("User Authentication", False, 
                f"Registration failed: {response.status_code if response else 'timeout'}")
        return False

def test_generate_simulado():
    """Test POST /api/study/simulados/generate endpoint"""
    global simulado_id
    
    if not session_token:
        log_test("Generate Simulado", False, "Not authenticated")
        return False
    
    generate_data = {
        "title": "Simulado Direito Constitucional",
        "banca": "CESPE/CEBRASPE",
        "disciplina": "Direito Constitucional",
        "question_type": "multipla_escolha",
        "num_questions": 5,
        "difficulty": "medio"
    }
    
    print(f"Generating simulado... (may take up to {TIMEOUT_SECONDS} seconds)")
    response = make_request("POST", "/study/simulados/generate", generate_data, timeout=TIMEOUT_SECONDS)
    
    if response is None:
        log_test("Generate Simulado", False, f"Request timeout after {TIMEOUT_SECONDS} seconds")
        return False
    
    if response.status_code == 200:
        try:
            data = response.json()
            if data.get("success") and data.get("simulado"):
                simulado = data["simulado"]
                simulado_id = simulado.get("simulado_id")
                questions = simulado.get("questions", [])
                
                if len(questions) == 5:
                    # Verify question structure
                    first_question = questions[0]
                    required_fields = ["question_text", "options", "correct_answer", "explanation"]
                    
                    if all(field in first_question for field in required_fields):
                        if len(first_question["options"]) == 5:
                            log_test("Generate Simulado", True, 
                                   f"Generated simulado with {len(questions)} questions")
                            return True
                        else:
                            log_test("Generate Simulado", False, 
                                   f"Question has {len(first_question['options'])} options, expected 5")
                            return False
                    else:
                        missing = [f for f in required_fields if f not in first_question]
                        log_test("Generate Simulado", False, 
                               f"Missing required question fields: {missing}")
                        return False
                else:
                    log_test("Generate Simulado", False, 
                           f"Generated {len(questions)} questions, expected 5")
                    return False
            else:
                log_test("Generate Simulado", False, 
                       f"Invalid response structure: {data}")
                return False
        except json.JSONDecodeError:
            log_test("Generate Simulado", False, "Invalid JSON response")
            return False
    else:
        try:
            error_data = response.json()
            log_test("Generate Simulado", False, 
                   f"HTTP {response.status_code}: {error_data.get('detail', 'Unknown error')}")
        except:
            log_test("Generate Simulado", False, 
                   f"HTTP {response.status_code}: {response.text[:200]}")
        return False

def test_list_simulados():
    """Test GET /api/study/simulados endpoint"""
    if not session_token:
        log_test("List Simulados", False, "Not authenticated")
        return False
    
    response = make_request("GET", "/study/simulados")
    
    if response and response.status_code == 200:
        try:
            data = response.json()
            if isinstance(data, list):
                if simulado_id:
                    # Find our created simulado
                    found = any(s.get("simulado_id") == simulado_id for s in data)
                    if found:
                        # Check that questions are removed but questions_count is present
                        simulado = next((s for s in data if s.get("simulado_id") == simulado_id), None)
                        if simulado:
                            if "questions" not in simulado and "questions_count" in simulado:
                                log_test("List Simulados", True, 
                                       f"Found {len(data)} simulados, questions removed from list")
                                return True
                            else:
                                log_test("List Simulados", False, 
                                       "Questions not properly removed from list view")
                                return False
                        else:
                            log_test("List Simulados", False, "Simulado not found in list")
                            return False
                    else:
                        log_test("List Simulados", False, 
                               f"Created simulado {simulado_id} not found in list")
                        return False
                else:
                    log_test("List Simulados", True, f"Retrieved {len(data)} simulados")
                    return True
            else:
                log_test("List Simulados", False, "Response is not a list")
                return False
        except json.JSONDecodeError:
            log_test("List Simulados", False, "Invalid JSON response")
            return False
    else:
        log_test("List Simulados", False, 
               f"HTTP {response.status_code if response else 'timeout'}")
        return False

def test_get_simulado_detail():
    """Test GET /api/study/simulados/{simulado_id} endpoint"""
    if not session_token or not simulado_id:
        log_test("Get Simulado Detail", False, "Not authenticated or no simulado ID")
        return False
    
    response = make_request("GET", f"/study/simulados/{simulado_id}")
    
    if response and response.status_code == 200:
        try:
            data = response.json()
            if data.get("simulado_id") == simulado_id:
                questions = data.get("questions", [])
                if len(questions) > 0:
                    log_test("Get Simulado Detail", True, 
                           f"Retrieved simulado with {len(questions)} questions")
                    return True
                else:
                    log_test("Get Simulado Detail", False, "No questions in simulado detail")
                    return False
            else:
                log_test("Get Simulado Detail", False, "Wrong simulado returned")
                return False
        except json.JSONDecodeError:
            log_test("Get Simulado Detail", False, "Invalid JSON response")
            return False
    else:
        log_test("Get Simulado Detail", False, 
               f"HTTP {response.status_code if response else 'timeout'}")
        return False

def test_submit_simulado():
    """Test POST /api/study/simulados/{simulado_id}/submit endpoint"""
    if not session_token or not simulado_id:
        log_test("Submit Simulado", False, "Not authenticated or no simulado ID")
        return False
    
    # Submit answers for all 5 questions (using letters A-E as specified)
    submit_data = {
        "answers": [
            {"question_idx": 0, "selected_answer": "A"},
            {"question_idx": 1, "selected_answer": "B"},
            {"question_idx": 2, "selected_answer": "C"},
            {"question_idx": 3, "selected_answer": "D"},
            {"question_idx": 4, "selected_answer": "E"}
        ],
        "time_spent_seconds": 300
    }
    
    response = make_request("POST", f"/study/simulados/{simulado_id}/submit", submit_data)
    
    if response and response.status_code == 200:
        try:
            data = response.json()
            required_fields = ["score", "correct_count", "total_questions", "answers", 
                             "by_disciplina", "xp_earned"]
            
            if all(field in data for field in required_fields):
                answers = data.get("answers", [])
                if len(answers) == 5:
                    # Check answer structure
                    first_answer = answers[0]
                    if "is_correct" in first_answer and "explanation" in first_answer:
                        log_test("Submit Simulado", True, 
                               f"Score: {data['score']}%, Correct: {data['correct_count']}/5, XP: {data['xp_earned']}")
                        return True
                    else:
                        log_test("Submit Simulado", False, 
                               "Answer missing is_correct or explanation")
                        return False
                else:
                    log_test("Submit Simulado", False, 
                           f"Got {len(answers)} answers, expected 5")
                    return False
            else:
                missing = [f for f in required_fields if f not in data]
                log_test("Submit Simulado", False, 
                       f"Missing required fields: {missing}")
                return False
        except json.JSONDecodeError:
            log_test("Submit Simulado", False, "Invalid JSON response")
            return False
    else:
        try:
            error_data = response.json()
            log_test("Submit Simulado", False, 
                   f"HTTP {response.status_code}: {error_data.get('detail', 'Unknown error')}")
        except:
            log_test("Submit Simulado", False, 
                   f"HTTP {response.status_code}: {response.text[:200]}")
        return False

def test_get_simulado_results():
    """Test GET /api/study/simulados/{simulado_id}/results endpoint"""
    if not session_token or not simulado_id:
        log_test("Get Simulado Results", False, "Not authenticated or no simulado ID")
        return False
    
    response = make_request("GET", f"/study/simulados/{simulado_id}/results")
    
    if response and response.status_code == 200:
        try:
            data = response.json()
            if isinstance(data, list):
                if len(data) > 0:
                    # Should have at least 1 attempt from previous test
                    attempt = data[0]
                    if "score" in attempt and "correct_count" in attempt:
                        log_test("Get Simulado Results", True, 
                               f"Retrieved {len(data)} attempt(s)")
                        return True
                    else:
                        log_test("Get Simulado Results", False, 
                               "Attempt missing required fields")
                        return False
                else:
                    log_test("Get Simulado Results", True, "No attempts yet (valid state)")
                    return True
            else:
                log_test("Get Simulado Results", False, "Response is not a list")
                return False
        except json.JSONDecodeError:
            log_test("Get Simulado Results", False, "Invalid JSON response")
            return False
    else:
        log_test("Get Simulado Results", False, 
               f"HTTP {response.status_code if response else 'timeout'}")
        return False

def test_get_simulado_stats():
    """Test GET /api/study/simulados/stats endpoint"""
    if not session_token:
        log_test("Get Simulado Stats", False, "Not authenticated")
        return False
    
    response = make_request("GET", "/study/simulados/stats")
    
    if response and response.status_code == 200:
        try:
            data = response.json()
            required_fields = ["total_simulados", "total_attempts", "accuracy_rate", 
                             "by_banca", "by_disciplina"]
            
            if all(field in data for field in required_fields):
                log_test("Get Simulado Stats", True, 
                       f"Stats: {data['total_simulados']} simulados, {data['total_attempts']} attempts")
                return True
            else:
                missing = [f for f in required_fields if f not in data]
                log_test("Get Simulado Stats", False, 
                       f"Missing required fields: {missing}")
                return False
        except json.JSONDecodeError:
            log_test("Get Simulado Stats", False, "Invalid JSON response")
            return False
    else:
        log_test("Get Simulado Stats", False, 
               f"HTTP {response.status_code if response else 'timeout'}")
        return False

def test_delete_simulado():
    """Test DELETE /api/study/simulados/{simulado_id} endpoint"""
    if not session_token or not simulado_id:
        log_test("Delete Simulado", False, "Not authenticated or no simulado ID")
        return False
    
    response = make_request("DELETE", f"/study/simulados/{simulado_id}")
    
    if response and response.status_code == 200:
        try:
            data = response.json()
            if "message" in data:
                log_test("Delete Simulado", True, "Simulado deleted successfully")
                return True
            else:
                log_test("Delete Simulado", False, "No success message in response")
                return False
        except json.JSONDecodeError:
            log_test("Delete Simulado", False, "Invalid JSON response")
            return False
    else:
        log_test("Delete Simulado", False, 
               f"HTTP {response.status_code if response else 'timeout'}")
        return False

def main():
    """Run all Simulados endpoint tests"""
    print("🧪 Starting Simulados Backend Tests")
    print(f"Backend URL: {BASE_URL}")
    print(f"Test User: {TEST_EMAIL}")
    print("=" * 60)
    
    # Test sequence as specified in the review request
    tests = [
        ("Authentication", test_authentication),
        ("Generate Simulado", test_generate_simulado),
        ("List Simulados", test_list_simulados),
        ("Get Simulado Detail", test_get_simulado_detail),
        ("Submit Simulado", test_submit_simulado),
        ("Get Simulado Results", test_get_simulado_results),
        ("Get Simulado Stats", test_get_simulado_stats),
        ("Delete Simulado", test_delete_simulado),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
        except Exception as e:
            log_test(test_name, False, f"Test exception: {str(e)}")
    
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {passed}/{total} passed ({passed/total*100:.1f}%)")
    
    # Print summary
    print("\n📋 Detailed Results:")
    for result in test_results:
        print(f"{result['status']} {result['test']}")
        if result['message']:
            print(f"    {result['message']}")
    
    # Return exit code
    return 0 if passed == total else 1

if __name__ == "__main__":
    sys.exit(main())