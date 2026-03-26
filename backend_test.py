#!/usr/bin/env python3
"""
Backend API Testing Script for AI Workout Generation
Tests the POST /api/workout-plans/generate endpoint with specific scenarios
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BACKEND_URL = "https://ai-workout-fix-1.preview.emergentagent.com/api"
TEST_USER_EMAIL = "testworkout@test.com"
TEST_USER_PASSWORD = "Test123!"

class WorkoutAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'WorkoutTester/1.0'
        })
        
    def log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def register_and_login(self):
        """Register and login test user"""
        self.log("=== AUTHENTICATION SETUP ===")
        
        # Try to register first (might fail if user exists)
        register_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Test Workout User"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/register", json=register_data)
            if response.status_code == 200:
                self.log("✅ User registered successfully")
            elif response.status_code == 400 and "already registered" in response.text:
                self.log("ℹ️ User already exists, proceeding to login")
            else:
                self.log(f"⚠️ Registration response: {response.status_code} - {response.text}")
        except Exception as e:
            self.log(f"⚠️ Registration error: {e}")
        
        # Login
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.log("✅ Login successful")
                self.log(f"   User ID: {data.get('user', {}).get('user_id', 'N/A')}")
                return True
            else:
                self.log(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log(f"❌ Login error: {e}")
            return False
    
    def test_split_workout_generation(self):
        """Test 1: Generate a split-based workout (tipo_treino mode) - ABC, 7 days, 4 weeks with cardio"""
        self.log("\n=== TEST 1: SPLIT-BASED WORKOUT GENERATION ===")
        self.log("Testing ABC split, 7 days/week, 4 weeks with cardio (the exact scenario that was failing)")
        
        payload = {
            "objective": "hipertrofia",
            "level": "intermediario",
            "generation_mode": "tipo_treino",
            "split_type": "ABC",
            "split_config": [
                {"label": "A", "name": "Peito e Tríceps", "muscle_groups": ["peito", "triceps"]},
                {"label": "B", "name": "Costas e Bíceps", "muscle_groups": ["costas", "biceps"]},
                {"label": "C", "name": "Pernas e Abdômen", "muscle_groups": ["pernas", "abdomen", "gluteos"]}
            ],
            "training_days_per_week": 7,
            "cycle_weeks": 4,
            "include_cardio": True,
            "cardio_type": "corrida",
            "duration": "ciclo"
        }
        
        self.log(f"Payload: {json.dumps(payload, indent=2)}")
        
        try:
            start_time = time.time()
            self.log("🚀 Sending request to /api/workout-plans/generate...")
            
            response = self.session.post(
                f"{BACKEND_URL}/workout-plans/generate", 
                json=payload,
                timeout=120  # 120 seconds timeout as specified
            )
            
            end_time = time.time()
            duration = end_time - start_time
            self.log(f"⏱️ Request completed in {duration:.1f} seconds")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ TEST 1 PASSED - Split workout generation successful")
                
                # Verify response structure
                if data.get("success") == True:
                    self.log("✅ Response has success: true")
                else:
                    self.log("❌ Response missing success: true")
                
                plan = data.get("plan", {})
                if plan:
                    self.log("✅ Plan object present")
                    
                    # Check for days array with 28 entries (7 days x 4 weeks)
                    days = plan.get("days", [])
                    expected_days = 7 * 4  # 28 days
                    if len(days) == expected_days:
                        self.log(f"✅ Plan has correct number of days: {len(days)} (expected {expected_days})")
                    else:
                        self.log(f"❌ Plan has wrong number of days: {len(days)} (expected {expected_days})")
                    
                    # Check each day has exercises
                    days_with_exercises = 0
                    for i, day in enumerate(days):
                        exercises = day.get("exercises", [])
                        if exercises:
                            days_with_exercises += 1
                        if i < 3:  # Log first 3 days as sample
                            week = day.get("week", "?")
                            split_label = day.get("split_label", "?")
                            self.log(f"   Day {i+1}: Week {week}, Split {split_label}, {len(exercises)} exercises")
                    
                    if days_with_exercises == len(days):
                        self.log(f"✅ All {len(days)} days have exercises")
                    else:
                        self.log(f"❌ Only {days_with_exercises}/{len(days)} days have exercises")
                    
                    # Check for weekly progression
                    weekly_progression = plan.get("weekly_progression", [])
                    if len(weekly_progression) == 4:
                        self.log(f"✅ Plan has weekly progression with 4 items")
                    else:
                        self.log(f"❌ Plan has wrong weekly progression count: {len(weekly_progression)} (expected 4)")
                    
                    # Check exercises have tutorial field (text only, NO video_url)
                    sample_exercises = []
                    for day in days[:3]:  # Check first 3 days
                        for ex in day.get("exercises", [])[:2]:  # First 2 exercises per day
                            sample_exercises.append(ex)
                    
                    tutorial_count = 0
                    video_url_count = 0
                    for ex in sample_exercises:
                        if ex.get("tutorial"):
                            tutorial_count += 1
                        if ex.get("video_url"):
                            video_url_count += 1
                    
                    if tutorial_count > 0:
                        self.log(f"✅ Exercises have tutorial field ({tutorial_count}/{len(sample_exercises)} checked)")
                    else:
                        self.log(f"❌ No exercises have tutorial field")
                    
                    if video_url_count == 0:
                        self.log(f"✅ No video_url fields found (as expected)")
                    else:
                        self.log(f"⚠️ Found {video_url_count} video_url fields (should be 0)")
                    
                    # Check plan metadata
                    required_fields = ["split_type", "cycle_weeks", "training_days_per_week"]
                    for field in required_fields:
                        if plan.get(field) is not None:
                            self.log(f"✅ Plan has {field}: {plan.get(field)}")
                        else:
                            self.log(f"❌ Plan missing {field}")
                    
                    # Sample exercise details
                    if sample_exercises:
                        ex = sample_exercises[0]
                        self.log(f"📋 Sample exercise: {ex.get('name', 'N/A')}")
                        self.log(f"   Tutorial: {ex.get('tutorial', 'N/A')[:100]}...")
                        self.log(f"   Sets: {ex.get('sets', 'N/A')}, Reps: {ex.get('reps', 'N/A')}")
                
                else:
                    self.log("❌ No plan object in response")
                
                return True
                
            else:
                self.log(f"❌ TEST 1 FAILED - HTTP {response.status_code}")
                self.log(f"Response: {response.text[:500]}...")
                return False
                
        except requests.exceptions.Timeout:
            self.log("❌ TEST 1 FAILED - Request timed out after 120 seconds")
            return False
        except Exception as e:
            self.log(f"❌ TEST 1 FAILED - Exception: {e}")
            return False
    
    def test_simple_workout_generation(self):
        """Test 2: Generate a simple period-based workout (periodo mode) - single day"""
        self.log("\n=== TEST 2: SIMPLE PERIOD-BASED WORKOUT GENERATION ===")
        self.log("Testing single day workout generation")
        
        payload = {
            "objective": "hipertrofia",
            "level": "iniciante",
            "generation_mode": "periodo",
            "duration": "dia",
            "muscle_groups": ["peito", "trapezio", "panturrilha"]
        }
        
        self.log(f"Payload: {json.dumps(payload, indent=2)}")
        
        try:
            start_time = time.time()
            self.log("🚀 Sending request to /api/workout-plans/generate...")
            
            response = self.session.post(
                f"{BACKEND_URL}/workout-plans/generate", 
                json=payload,
                timeout=60  # 60 seconds timeout
            )
            
            end_time = time.time()
            duration = end_time - start_time
            self.log(f"⏱️ Request completed in {duration:.1f} seconds")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ TEST 2 PASSED - Simple workout generation successful")
                
                # Verify response structure
                if data.get("success") == True:
                    self.log("✅ Response has success: true")
                else:
                    self.log("❌ Response missing success: true")
                
                plan = data.get("plan", {})
                if plan:
                    self.log("✅ Plan object present")
                    
                    # Check exercises have tutorial (text description only)
                    exercises = plan.get("exercises", [])
                    if exercises:
                        self.log(f"✅ Plan has {len(exercises)} exercises")
                        
                        tutorial_count = 0
                        video_url_count = 0
                        target_muscle_groups = set(["peito", "trapezio", "panturrilha"])
                        found_muscle_groups = set()
                        
                        for ex in exercises:
                            if ex.get("tutorial"):
                                tutorial_count += 1
                            if ex.get("video_url"):
                                video_url_count += 1
                            
                            muscle_group = ex.get("muscle_group", "")
                            if muscle_group in target_muscle_groups:
                                found_muscle_groups.add(muscle_group)
                        
                        if tutorial_count == len(exercises):
                            self.log(f"✅ All exercises have tutorial field")
                        else:
                            self.log(f"❌ Only {tutorial_count}/{len(exercises)} exercises have tutorial")
                        
                        if video_url_count == 0:
                            self.log(f"✅ No video_url fields found (as expected)")
                        else:
                            self.log(f"⚠️ Found {video_url_count} video_url fields (should be 0)")
                        
                        # Check if exercises target specified muscle groups
                        if found_muscle_groups:
                            self.log(f"✅ Exercises target specified muscle groups: {', '.join(found_muscle_groups)}")
                        else:
                            self.log(f"⚠️ No exercises found targeting specified muscle groups")
                        
                        # Sample exercise details
                        ex = exercises[0]
                        self.log(f"📋 Sample exercise: {ex.get('name', 'N/A')}")
                        self.log(f"   Tutorial: {ex.get('tutorial', 'N/A')[:100]}...")
                        self.log(f"   Muscle group: {ex.get('muscle_group', 'N/A')}")
                        self.log(f"   Sets: {ex.get('sets', 'N/A')}, Reps: {ex.get('reps', 'N/A')}")
                    
                    else:
                        self.log("❌ No exercises in plan")
                
                else:
                    self.log("❌ No plan object in response")
                
                return True
                
            else:
                self.log(f"❌ TEST 2 FAILED - HTTP {response.status_code}")
                self.log(f"Response: {response.text[:500]}...")
                return False
                
        except requests.exceptions.Timeout:
            self.log("❌ TEST 2 FAILED - Request timed out after 60 seconds")
            return False
        except Exception as e:
            self.log(f"❌ TEST 2 FAILED - Exception: {e}")
            return False
    
    def run_all_tests(self):
        """Run all tests"""
        self.log("🏋️ AI WORKOUT GENERATION ENDPOINT TESTING")
        self.log(f"Backend URL: {BACKEND_URL}")
        self.log(f"Test User: {TEST_USER_EMAIL}")
        
        # Authentication
        if not self.register_and_login():
            self.log("❌ TESTING ABORTED - Authentication failed")
            return False
        
        # Run tests
        test_results = []
        
        test_results.append(self.test_split_workout_generation())
        test_results.append(self.test_simple_workout_generation())
        
        # Summary
        self.log("\n=== TEST SUMMARY ===")
        passed = sum(test_results)
        total = len(test_results)
        
        self.log(f"Tests passed: {passed}/{total}")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED!")
            return True
        else:
            self.log("❌ SOME TESTS FAILED")
            return False

def main():
    """Main function"""
    tester = WorkoutAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()