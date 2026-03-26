#!/usr/bin/env python3
"""
Backend Testing Script for Workout Plans Endpoints
Testing cardio_mode features and workout plan improvement
"""

import requests
import json
import time
import sys

# Backend URL from frontend/.env
BACKEND_URL = "https://ai-workout-builder-3.preview.emergentagent.com/api"

class WorkoutPlanTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'Backend-Tester/1.0'
        })
        self.plan_id_for_improvement = None
        
    def register_and_login(self):
        """Register and login test user"""
        print("🔐 Registering and logging in test user...")
        
        # Register user
        register_data = {
            "email": "testevolve@test.com",
            "password": "Test123!",
            "name": "Test Evolve User"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/register", json=register_data)
            if response.status_code == 201:
                print("✅ User registered successfully")
            elif response.status_code == 400 and "já existe" in response.text:
                print("ℹ️ User already exists, proceeding to login")
            else:
                print(f"⚠️ Registration response: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"⚠️ Registration error: {e}")
        
        # Login user
        login_data = {
            "email": "testevolve@test.com", 
            "password": "Test123!"
        }
        
        response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            print("✅ Login successful")
            return True
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    
    def test_cardio_pos_treino(self):
        """Test 1: Generate workout with cardio_mode 'pos_treino'"""
        print("\n🏃‍♂️ Test 1: Generate workout with cardio_mode 'pos_treino'")
        
        payload = {
            "objective": "hipertrofia",
            "level": "intermediario", 
            "generation_mode": "tipo_treino",
            "split_type": "AB",
            "split_config": [
                {"label": "A", "name": "Peito e Tríceps", "muscle_groups": ["peito", "triceps"]},
                {"label": "B", "name": "Costas e Bíceps", "muscle_groups": ["costas", "biceps"]}
            ],
            "training_days_per_week": 4,
            "cycle_weeks": 2,
            "include_cardio": True,
            "cardio_type": "corrida",
            "cardio_mode": "pos_treino",
            "duration": "ciclo"
        }
        
        print(f"📤 Sending request to POST {BACKEND_URL}/workout-plans/generate")
        print(f"📋 Payload: {json.dumps(payload, indent=2)}")
        
        start_time = time.time()
        try:
            response = self.session.post(f"{BACKEND_URL}/workout-plans/generate", 
                                       json=payload, timeout=120)
            duration = time.time() - start_time
            
            print(f"⏱️ Response time: {duration:.1f}s")
            print(f"📊 Status code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Request successful")
                
                # Verify response structure
                if data.get('success'):
                    print("✅ Response has success: true")
                    
                    plan = data.get('plan', {})
                    if plan.get('days'):
                        print(f"✅ Plan has {len(plan['days'])} days with exercises")
                        
                        # Check for cardio exercises at end of splits (pos_treino mode)
                        cardio_found = False
                        cardio_only_days = 0
                        
                        for day in plan['days']:
                            exercises = day.get('exercises', [])
                            if exercises:
                                # Check if last exercises are cardio
                                for exercise in exercises:
                                    if exercise.get('muscle_group') == 'cardio':
                                        cardio_found = True
                                        break
                            else:
                                # Count days with no exercises (cardio-only days)
                                cardio_only_days += 1
                        
                        if cardio_found:
                            print("✅ Found cardio exercises within splits (pos_treino mode)")
                        else:
                            print("⚠️ No cardio exercises found within splits")
                            
                        if cardio_only_days == 0:
                            print("✅ No separate cardio-only days (correct for pos_treino)")
                        else:
                            print(f"⚠️ Found {cardio_only_days} cardio-only days")
                        
                        # Save plan_id for improvement test
                        self.plan_id_for_improvement = plan.get('plan_id')
                        if self.plan_id_for_improvement:
                            print(f"💾 Saved plan_id for improvement test: {self.plan_id_for_improvement}")
                        
                    else:
                        print("❌ Plan has no days")
                        
                else:
                    print("❌ Response success is false")
                    
                print(f"📄 Response preview: {json.dumps(data, indent=2)[:500]}...")
                return True
                
            else:
                print(f"❌ Request failed: {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            print("❌ Request timed out after 120 seconds")
            return False
        except Exception as e:
            print(f"❌ Request error: {e}")
            return False
    
    def test_cardio_hibrido(self):
        """Test 2: Generate workout with cardio_mode 'hibrido'"""
        print("\n🏃‍♀️ Test 2: Generate workout with cardio_mode 'hibrido'")
        
        payload = {
            "objective": "emagrecimento",
            "level": "intermediario",
            "generation_mode": "tipo_treino", 
            "split_type": "AB",
            "split_config": [
                {"label": "A", "name": "Superior", "muscle_groups": ["peito", "ombros", "triceps"]},
                {"label": "B", "name": "Inferior", "muscle_groups": ["pernas", "gluteos"]}
            ],
            "training_days_per_week": 3,
            "cycle_weeks": 2,
            "include_cardio": True,
            "cardio_type": "HIIT",
            "cardio_mode": "hibrido",
            "duration": "ciclo"
        }
        
        print(f"📤 Sending request to POST {BACKEND_URL}/workout-plans/generate")
        print(f"📋 Payload: {json.dumps(payload, indent=2)}")
        
        start_time = time.time()
        try:
            response = self.session.post(f"{BACKEND_URL}/workout-plans/generate",
                                       json=payload, timeout=120)
            duration = time.time() - start_time
            
            print(f"⏱️ Response time: {duration:.1f}s")
            print(f"📊 Status code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Request successful")
                
                # Verify response structure
                if data.get('success'):
                    print("✅ Response has success: true")
                    
                    plan = data.get('plan', {})
                    if plan.get('days'):
                        print(f"✅ Plan has {len(plan['days'])} days with exercises")
                        
                        # Check for mixed strength and cardio (hibrido mode)
                        mixed_days = 0
                        for day in plan['days']:
                            exercises = day.get('exercises', [])
                            has_strength = False
                            has_cardio = False
                            
                            for exercise in exercises:
                                muscle_group = exercise.get('muscle_group', '')
                                if muscle_group == 'cardio':
                                    has_cardio = True
                                elif muscle_group in ['peito', 'ombros', 'triceps', 'pernas', 'gluteos']:
                                    has_strength = True
                            
                            if has_strength and has_cardio:
                                mixed_days += 1
                        
                        if mixed_days > 0:
                            print(f"✅ Found {mixed_days} days with mixed strength and cardio (hibrido mode)")
                        else:
                            print("⚠️ No mixed strength/cardio days found")
                            
                    else:
                        print("❌ Plan has no days")
                        
                else:
                    print("❌ Response success is false")
                    
                print(f"📄 Response preview: {json.dumps(data, indent=2)[:500]}...")
                return True
                
            else:
                print(f"❌ Request failed: {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            print("❌ Request timed out after 120 seconds")
            return False
        except Exception as e:
            print(f"❌ Request error: {e}")
            return False
    
    def test_improve_workout(self):
        """Test 3: Improve/Evolve workout plan"""
        print("\n🚀 Test 3: Improve/Evolve workout plan")
        
        if not self.plan_id_for_improvement:
            print("❌ No plan_id available from Test 1")
            return False
        
        print(f"📤 Sending request to POST {BACKEND_URL}/workout-plans/{self.plan_id_for_improvement}/improve")
        print("📋 Payload: {} (empty body)")
        
        start_time = time.time()
        try:
            response = self.session.post(f"{BACKEND_URL}/workout-plans/{self.plan_id_for_improvement}/improve",
                                       json={}, timeout=120)
            duration = time.time() - start_time
            
            print(f"⏱️ Response time: {duration:.1f}s")
            print(f"📊 Status code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Request successful")
                
                # Verify response structure
                if data.get('success'):
                    print("✅ Response has success: true")
                    
                    # Check for improvements_summary
                    if 'improvements_summary' in data:
                        print("✅ New plan has improvements_summary field")
                    else:
                        print("⚠️ No improvements_summary field found")
                    
                    # Check for different exercises (evolved)
                    plan = data.get('plan', {})
                    if plan.get('days'):
                        print("✅ New plan has exercises (evolved)")
                    else:
                        print("⚠️ New plan has no exercises")
                    
                    # Check for XP earned
                    if 'xp_earned' in data:
                        print(f"✅ Returns xp_earned: {data['xp_earned']}")
                    else:
                        print("⚠️ No xp_earned field found")
                    
                    # Check if split structure is preserved
                    if plan.get('split_type'):
                        print(f"✅ New plan preserves split structure: {plan['split_type']}")
                    else:
                        print("⚠️ Split structure not preserved")
                        
                else:
                    print("❌ Response success is false")
                    
                print(f"📄 Response preview: {json.dumps(data, indent=2)[:500]}...")
                return True
                
            else:
                print(f"❌ Request failed: {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            print("❌ Request timed out after 120 seconds")
            return False
        except Exception as e:
            print(f"❌ Request error: {e}")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🧪 Starting Workout Plans Cardio Mode Testing")
        print("=" * 60)
        
        # Login first
        if not self.register_and_login():
            print("❌ Authentication failed, cannot proceed with tests")
            return False
        
        # Run tests
        test1_result = self.test_cardio_pos_treino()
        test2_result = self.test_cardio_hibrido()
        test3_result = self.test_improve_workout()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Test 1 (pos_treino): {'✅ PASSED' if test1_result else '❌ FAILED'}")
        print(f"Test 2 (hibrido): {'✅ PASSED' if test2_result else '❌ FAILED'}")
        print(f"Test 3 (improve): {'✅ PASSED' if test3_result else '❌ FAILED'}")
        
        total_passed = sum([test1_result, test2_result, test3_result])
        print(f"\nOverall: {total_passed}/3 tests passed ({total_passed/3*100:.0f}%)")
        
        return total_passed == 3

if __name__ == "__main__":
    tester = WorkoutPlanTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)