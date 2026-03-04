#!/usr/bin/env python3
"""
Backend testing script for Simulados (Mock Exam) endpoints
Testing user: testsimulado@test.com / Test123!
Backend URL: https://quiz-simulator-2.preview.emergentagent.com
"""

import requests
import json
import time
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://quiz-simulator-2.preview.emergentagent.com/api"
TEST_USER = {
    "email": "testsimulado@test.com",
    "password": "Test123!",
    "name": "Test Simulado User"
}

class SimuladoTester:
    def __init__(self):
        self.session = requests.Session()
        self.user_token = None
        self.simulado_id = None
        
    def log(self, message: str, level: str = "INFO"):
        """Log messages with timestamp"""
        print(f"[{level}] {message}")
        
    def register_and_login(self) -> bool:
        """Register and login test user"""
        try:
            # Try to register user first (might fail if already exists)
            self.log("Attempting to register test user...")
            register_data = {
                "name": TEST_USER["name"],
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            }
            
            register_response = self.session.post(f"{BASE_URL}/auth/register", json=register_data)
            if register_response.status_code in [200, 201]:
                self.log("✅ User registered successfully")
            elif register_response.status_code == 400:
                self.log("ℹ️ User already exists, proceeding to login")
            else:
                self.log(f"⚠️ Registration response: {register_response.status_code}")
                
            # Login
            self.log("Logging in...")
            login_data = {
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            }
            
            login_response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            
            if login_response.status_code == 200:
                self.log("✅ Login successful")
                return True
            else:
                self.log(f"❌ Login failed: {login_response.status_code}")
                self.log(f"Response: {login_response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Auth error: {str(e)}", "ERROR")
            return False
            
    def test_generate_simulado(self) -> bool:
        """Test POST /api/study/simulados/generate - Generate a simulado with AI"""
        try:
            self.log("Testing POST /api/study/simulados/generate...")
            
            data = {
                "title": "Simulado Teste Direito",
                "banca": "CESPE/CEBRASPE", 
                "disciplina": "Direito Constitucional",
                "question_type": "multipla_escolha",
                "num_questions": 5,
                "difficulty": "medio"
            }
            
            # Set high timeout for AI generation (120 seconds as specified)
            response = self.session.post(
                f"{BASE_URL}/study/simulados/generate", 
                json=data,
                timeout=120
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success") and "simulado" in result:
                    simulado = result["simulado"]
                    self.simulado_id = simulado.get("simulado_id")
                    questions_count = len(simulado.get("questions", []))
                    
                    self.log(f"✅ Simulado generated successfully!")
                    self.log(f"   - Simulado ID: {self.simulado_id}")
                    self.log(f"   - Questions count: {questions_count}")
                    self.log(f"   - Expected: 5 questions")
                    
                    if questions_count == 5:
                        self.log("✅ Question count matches expectation")
                        return True
                    else:
                        self.log(f"⚠️ Question count mismatch: expected 5, got {questions_count}")
                        return False
                else:
                    self.log(f"❌ Invalid response structure: {result}")
                    return False
            else:
                self.log(f"❌ Request failed: {response.status_code}")
                self.log(f"Response: {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            self.log("❌ Request timed out after 120 seconds", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Generate simulado error: {str(e)}", "ERROR")
            return False
            
    def test_list_simulados(self) -> bool:
        """Test GET /api/study/simulados - List all simulados"""
        try:
            self.log("Testing GET /api/study/simulados...")
            
            response = self.session.get(f"{BASE_URL}/study/simulados")
            
            if response.status_code == 200:
                simulados = response.json()
                
                if isinstance(simulados, list):
                    self.log(f"✅ Simulados list retrieved successfully!")
                    self.log(f"   - Total simulados: {len(simulados)}")
                    
                    # Look for our created simulado
                    found_simulado = False
                    for sim in simulados:
                        if sim.get("simulado_id") == self.simulado_id:
                            found_simulado = True
                            self.log(f"   - Found created simulado: {sim.get('title')}")
                            break
                            
                    if found_simulado or len(simulados) > 0:
                        self.log("✅ List contains simulados")
                        return True
                    else:
                        self.log("⚠️ No simulados found in list")
                        return True  # Empty list is still valid
                else:
                    self.log(f"❌ Expected array, got: {type(simulados)}")
                    return False
            else:
                self.log(f"❌ Request failed: {response.status_code}")
                self.log(f"Response: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ List simulados error: {str(e)}", "ERROR")
            return False
            
    def test_get_simulado(self) -> bool:
        """Test GET /api/study/simulados/{simulado_id} - Get single simulado"""
        try:
            if not self.simulado_id:
                self.log("❌ No simulado_id available for testing")
                return False
                
            self.log(f"Testing GET /api/study/simulados/{self.simulado_id}...")
            
            response = self.session.get(f"{BASE_URL}/study/simulados/{self.simulado_id}")
            
            if response.status_code == 200:
                simulado = response.json()
                
                if "simulado_id" in simulado and "questions" in simulado:
                    questions = simulado.get("questions", [])
                    self.log(f"✅ Simulado retrieved successfully!")
                    self.log(f"   - Simulado ID: {simulado.get('simulado_id')}")
                    self.log(f"   - Title: {simulado.get('title')}")
                    self.log(f"   - Questions count: {len(questions)}")
                    self.log(f"   - Banca: {simulado.get('banca')}")
                    self.log(f"   - Disciplina: {simulado.get('disciplina')}")
                    
                    return True
                else:
                    self.log(f"❌ Invalid simulado structure: {simulado.keys()}")
                    return False
            else:
                self.log(f"❌ Request failed: {response.status_code}")
                self.log(f"Response: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Get simulado error: {str(e)}", "ERROR")
            return False
            
    def test_submit_simulado(self) -> bool:
        """Test POST /api/study/simulados/{simulado_id}/submit - Submit answers"""
        try:
            if not self.simulado_id:
                self.log("❌ No simulado_id available for testing")
                return False
                
            self.log(f"Testing POST /api/study/simulados/{self.simulado_id}/submit...")
            
            # Submit test answers as specified in review request
            data = {
                "answers": [
                    {"question_idx": 0, "selected_answer": "A"},
                    {"question_idx": 1, "selected_answer": "B"}, 
                    {"question_idx": 2, "selected_answer": "C"},
                    {"question_idx": 3, "selected_answer": "D"},
                    {"question_idx": 4, "selected_answer": "E"}
                ],
                "time_spent_seconds": 300
            }
            
            response = self.session.post(
                f"{BASE_URL}/study/simulados/{self.simulado_id}/submit", 
                json=data
            )
            
            if response.status_code == 200:
                result = response.json()
                
                required_fields = ["score", "correct_count", "total_questions", "by_disciplina", "xp_earned"]
                missing_fields = [field for field in required_fields if field not in result]
                
                if not missing_fields:
                    self.log(f"✅ Simulado submitted successfully!")
                    self.log(f"   - Score: {result.get('score')}%")
                    self.log(f"   - Correct: {result.get('correct_count')}/{result.get('total_questions')}")
                    self.log(f"   - XP Earned: {result.get('xp_earned')}")
                    self.log(f"   - By Disciplina: {result.get('by_disciplina')}")
                    
                    return True
                else:
                    self.log(f"❌ Missing required fields: {missing_fields}")
                    return False
            else:
                self.log(f"❌ Request failed: {response.status_code}")
                self.log(f"Response: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Submit simulado error: {str(e)}", "ERROR")
            return False
            
    def test_get_results(self) -> bool:
        """Test GET /api/study/simulados/{simulado_id}/results - Get results"""
        try:
            if not self.simulado_id:
                self.log("❌ No simulado_id available for testing")
                return False
                
            self.log(f"Testing GET /api/study/simulados/{self.simulado_id}/results...")
            
            response = self.session.get(f"{BASE_URL}/study/simulados/{self.simulado_id}/results")
            
            if response.status_code == 200:
                attempts = response.json()
                
                if isinstance(attempts, list):
                    self.log(f"✅ Results retrieved successfully!")
                    self.log(f"   - Total attempts: {len(attempts)}")
                    
                    if attempts:
                        latest_attempt = attempts[0]  # Should be sorted by date desc
                        self.log(f"   - Latest attempt score: {latest_attempt.get('score')}%")
                        self.log(f"   - Latest attempt date: {latest_attempt.get('completed_at')}")
                    
                    return True
                else:
                    self.log(f"❌ Expected array, got: {type(attempts)}")
                    return False
            else:
                self.log(f"❌ Request failed: {response.status_code}")
                self.log(f"Response: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Get results error: {str(e)}", "ERROR")
            return False
            
    def test_get_stats(self) -> bool:
        """Test GET /api/study/simulados/stats - Get statistics"""
        try:
            self.log("Testing GET /api/study/simulados/stats...")
            
            response = self.session.get(f"{BASE_URL}/study/simulados/stats")
            
            if response.status_code == 200:
                stats = response.json()
                
                expected_fields = ["total_simulados", "total_attempts", "accuracy_rate", 
                                 "by_banca", "by_disciplina"]
                missing_fields = [field for field in expected_fields if field not in stats]
                
                if not missing_fields:
                    self.log(f"✅ Statistics retrieved successfully!")
                    self.log(f"   - Total simulados: {stats.get('total_simulados')}")
                    self.log(f"   - Total attempts: {stats.get('total_attempts')}")
                    self.log(f"   - Accuracy rate: {stats.get('accuracy_rate')}%")
                    self.log(f"   - By banca: {stats.get('by_banca')}")
                    self.log(f"   - By disciplina: {stats.get('by_disciplina')}")
                    
                    return True
                else:
                    self.log(f"❌ Missing expected fields: {missing_fields}")
                    return False
            else:
                self.log(f"❌ Request failed: {response.status_code}")
                self.log(f"Response: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Get stats error: {str(e)}", "ERROR")
            return False
            
    def test_delete_simulado(self) -> bool:
        """Test DELETE /api/study/simulados/{simulado_id} - Delete simulado"""
        try:
            if not self.simulado_id:
                self.log("❌ No simulado_id available for testing")
                return False
                
            self.log(f"Testing DELETE /api/study/simulados/{self.simulado_id}...")
            
            response = self.session.delete(f"{BASE_URL}/study/simulados/{self.simulado_id}")
            
            if response.status_code == 200:
                result = response.json()
                
                if "message" in result:
                    self.log(f"✅ Simulado deleted successfully!")
                    self.log(f"   - Message: {result.get('message')}")
                    
                    return True
                else:
                    self.log(f"❌ Invalid response structure: {result}")
                    return False
            else:
                self.log(f"❌ Request failed: {response.status_code}")
                self.log(f"Response: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Delete simulado error: {str(e)}", "ERROR")
            return False
            
    def run_all_tests(self):
        """Run all Simulados endpoint tests in sequence"""
        self.log("🚀 Starting Simulados Backend Testing")
        self.log(f"Backend URL: {BASE_URL}")
        self.log(f"Test User: {TEST_USER['email']}")
        
        tests = [
            ("Authentication", self.register_and_login),
            ("Generate Simulado (AI)", self.test_generate_simulado),
            ("List Simulados", self.test_list_simulados), 
            ("Get Single Simulado", self.test_get_simulado),
            ("Submit Answers", self.test_submit_simulado),
            ("Get Results", self.test_get_results),
            ("Get Statistics", self.test_get_stats),
            ("Delete Simulado", self.test_delete_simulado)
        ]
        
        results = {}
        
        for test_name, test_func in tests:
            self.log(f"\n{'='*50}")
            self.log(f"🧪 Running Test: {test_name}")
            self.log(f"{'='*50}")
            
            try:
                success = test_func()
                results[test_name] = success
                
                if success:
                    self.log(f"✅ {test_name}: PASSED")
                else:
                    self.log(f"❌ {test_name}: FAILED")
                    
            except Exception as e:
                self.log(f"💥 {test_name}: ERROR - {str(e)}", "ERROR")
                results[test_name] = False
                
            # Small delay between tests
            time.sleep(1)
            
        # Print summary
        self.log(f"\n{'='*50}")
        self.log("📊 TEST SUMMARY")
        self.log(f"{'='*50}")
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"{test_name}: {status}")
            
        self.log(f"\nTotal: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED!")
            return True
        else:
            self.log("⚠️ Some tests failed. Check logs above for details.")
            return False

if __name__ == "__main__":
    tester = SimuladoTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)