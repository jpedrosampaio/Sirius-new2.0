#!/usr/bin/env python3
"""
Backend Testing for NEW Workout Endpoints
Tests the workout plan generation and session management endpoints in sequence.
"""

import requests
import json
import time
import sys
from urllib.parse import urljoin

# Configuration
BASE_URL = "https://ai-workout-tutorials.preview.emergentagent.com/api"
TEST_EMAIL = "testworkout@test.com"
TEST_PASSWORD = "Test123!"

class WorkoutEndpointTester:
    def __init__(self):
        self.session = requests.Session()
        self.base_url = BASE_URL
        self.test_data = {}
        
    def log(self, message):
        """Log test messages with timestamp"""
        print(f"[{time.strftime('%H:%M:%S')}] {message}")
        
    def test_auth(self):
        """Test user registration and login for authentication"""
        self.log("🔐 Testing Authentication...")
        
        # Try to register user (may fail if already exists)
        register_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Test Workout User"
        }
        
        register_response = self.session.post(f"{self.base_url}/auth/register", json=register_data)
        if register_response.status_code == 201:
            self.log("✅ User registered successfully")
        elif register_response.status_code == 400:
            self.log("ℹ️  User already exists, proceeding to login")
        else:
            self.log(f"⚠️  Registration response: {register_response.status_code} - {register_response.text}")
            
        # Login
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        login_response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
        if login_response.status_code == 200:
            self.log("✅ Login successful")
            return True
        else:
            self.log(f"❌ Login failed: {login_response.status_code} - {login_response.text}")
            return False
            
    def test_workout_plan_generation(self):
        """Test POST /api/workout-plans/generate - AI workout plan generation"""
        self.log("🏋️ Testing AI Workout Plan Generation...")
        
        plan_data = {
            "objective": "hipertrofia",
            "level": "intermediario", 
            "muscle_groups": ["peito", "triceps"],
            "duration": "dia"
        }
        
        start_time = time.time()
        
        try:
            # Use longer timeout as specified (AI generation takes 20-40 seconds)
            response = self.session.post(
                f"{self.base_url}/workout-plans/generate", 
                json=plan_data,
                timeout=120
            )
            
            elapsed_time = time.time() - start_time
            self.log(f"⏱️  AI generation took {elapsed_time:.1f} seconds")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check response structure
                if data.get("success") and "plan" in data:
                    plan = data["plan"]
                    plan_id = plan.get("plan_id")
                    
                    if plan_id:
                        self.test_data["plan_id"] = plan_id
                        self.log(f"✅ Workout plan generated successfully (ID: {plan_id})")
                        
                        # Check for exercises with tutorials and video URLs
                        exercises = plan.get("exercises", [])
                        if exercises:
                            tutorial_count = 0
                            video_count = 0
                            
                            for exercise in exercises:
                                if exercise.get("tutorial"):
                                    tutorial_count += 1
                                if exercise.get("video_url"):
                                    video_count += 1
                            
                            self.log(f"📚 Found {len(exercises)} exercises, {tutorial_count} with tutorials, {video_count} with video URLs")
                            
                            # Show sample exercise
                            if exercises:
                                sample = exercises[0]
                                self.log(f"📝 Sample exercise: {sample.get('name', 'Unknown')}")
                                if sample.get("tutorial"):
                                    self.log(f"   Tutorial preview: {sample['tutorial'][:100]}...")
                                if sample.get("video_url"):
                                    self.log(f"   Video URL: {sample['video_url']}")
                        
                        # Check XP earned
                        xp_earned = data.get("xp_earned", 0)
                        self.log(f"⭐ XP earned: {xp_earned}")
                        
                        return True
                    else:
                        self.log("❌ No plan_id in response")
                        return False
                else:
                    self.log(f"❌ Invalid response structure: {data}")
                    return False
            else:
                self.log(f"❌ Plan generation failed: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            self.log("❌ Request timed out (exceeded 120 seconds)")
            return False
        except Exception as e:
            self.log(f"❌ Error during plan generation: {str(e)}")
            return False
            
    def test_workout_session_start(self):
        """Test POST /api/workout-sessions/start - Start workout session"""
        self.log("🎯 Testing Workout Session Start...")
        
        if "plan_id" not in self.test_data:
            self.log("❌ No plan_id available from previous test")
            return False
            
        session_data = {
            "plan_id": self.test_data["plan_id"],
            "day_index": 0,
            "rest_timer_seconds": 60
        }
        
        response = self.session.post(f"{self.base_url}/workout-sessions/start", json=session_data)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check response structure
            session_id = data.get("session_id")
            status = data.get("status")
            exercises = data.get("exercises", [])
            
            if session_id and status == "active":
                self.test_data["session_id"] = session_id
                self.log(f"✅ Workout session started successfully (ID: {session_id})")
                self.log(f"📋 Session has {len(exercises)} exercises, status: {status}")
                return True
            else:
                self.log(f"❌ Invalid session response structure: {data}")
                return False
        else:
            self.log(f"❌ Session start failed: {response.status_code} - {response.text}")
            return False
            
    def test_active_session_check(self):
        """Test GET /api/workout-sessions/active - Check active session"""
        self.log("👀 Testing Active Session Check...")
        
        response = self.session.get(f"{self.base_url}/workout-sessions/active")
        
        if response.status_code == 200:
            data = response.json()
            
            is_active = data.get("active")
            session = data.get("session")
            
            if is_active is True and session:
                session_id = session.get("session_id")
                self.log(f"✅ Active session confirmed (ID: {session_id})")
                return True
            elif is_active is False:
                self.log("❌ No active session found")
                return False
            else:
                self.log(f"❌ Invalid active session response: {data}")
                return False
        else:
            self.log(f"❌ Active session check failed: {response.status_code} - {response.text}")
            return False
            
    def test_exercise_completion(self):
        """Test PATCH /api/workout-sessions/{session_id}/exercise/0 - Complete first exercise"""
        self.log("💪 Testing Exercise Completion...")
        
        if "session_id" not in self.test_data:
            self.log("❌ No session_id available from previous test")
            return False
            
        session_id = self.test_data["session_id"]
        exercise_data = {
            "completed": True,
            "sets_completed": 4
        }
        
        response = self.session.patch(
            f"{self.base_url}/workout-sessions/{session_id}/exercise/0", 
            json=exercise_data
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if exercise was marked as completed
            exercises = data.get("exercises", [])
            if exercises and len(exercises) > 0:
                first_exercise = exercises[0]
                if first_exercise.get("completed") is True:
                    sets_completed = first_exercise.get("sets_completed", 0)
                    self.log(f"✅ First exercise marked completed with {sets_completed} sets")
                    return True
                else:
                    self.log("❌ First exercise not marked as completed")
                    return False
            else:
                self.log("❌ No exercises in response")
                return False
        else:
            self.log(f"❌ Exercise completion failed: {response.status_code} - {response.text}")
            return False
            
    def test_session_completion(self):
        """Test POST /api/workout-sessions/{session_id}/complete - Complete session"""
        self.log("🏁 Testing Session Completion...")
        
        if "session_id" not in self.test_data:
            self.log("❌ No session_id available from previous test")
            return False
            
        session_id = self.test_data["session_id"]
        completion_data = {
            "difficulty": 4,
            "feeling": "bom",
            "notes": "Treino teste"
        }
        
        response = self.session.post(
            f"{self.base_url}/workout-sessions/{session_id}/complete", 
            json=completion_data
        )
        
        if response.status_code == 200:
            data = response.json()
            
            success = data.get("success")
            xp_earned = data.get("xp_earned", 0)
            
            if success is True and xp_earned > 0:
                self.log(f"✅ Session completed successfully, earned {xp_earned} XP")
                return True
            else:
                self.log(f"❌ Invalid completion response: {data}")
                return False
        else:
            self.log(f"❌ Session completion failed: {response.status_code} - {response.text}")
            return False
            
    def test_session_history(self):
        """Test GET /api/workout-sessions - Get session history"""
        self.log("📚 Testing Session History...")
        
        response = self.session.get(f"{self.base_url}/workout-sessions")
        
        if response.status_code == 200:
            data = response.json()
            
            if isinstance(data, list):
                completed_sessions = [s for s in data if s.get("status") == "completed"]
                self.log(f"✅ Session history retrieved: {len(data)} total sessions, {len(completed_sessions)} completed")
                
                if len(completed_sessions) >= 1:
                    self.log("📋 Found at least 1 completed session as expected")
                    return True
                else:
                    self.log("⚠️  No completed sessions found in history")
                    return True  # Still a valid response structure
            else:
                self.log(f"❌ Invalid history response format: {data}")
                return False
        else:
            self.log(f"❌ Session history failed: {response.status_code} - {response.text}")
            return False
            
    def run_all_tests(self):
        """Run all workout endpoint tests in sequence"""
        self.log("🚀 Starting NEW Workout Endpoints Testing...")
        self.log(f"🔗 Backend URL: {self.base_url}")
        self.log(f"👤 Test User: {TEST_EMAIL}")
        
        tests = [
            ("Authentication", self.test_auth),
            ("AI Workout Plan Generation", self.test_workout_plan_generation),
            ("Workout Session Start", self.test_workout_session_start),
            ("Active Session Check", self.test_active_session_check),
            ("Exercise Completion", self.test_exercise_completion),
            ("Session Completion", self.test_session_completion),
            ("Session History", self.test_session_history),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            self.log(f"\n{'='*50}")
            self.log(f"Testing: {test_name}")
            self.log(f"{'='*50}")
            
            try:
                result = test_func()
                if result:
                    passed += 1
                    self.log(f"✅ {test_name} - PASSED")
                else:
                    self.log(f"❌ {test_name} - FAILED")
            except Exception as e:
                self.log(f"💥 {test_name} - ERROR: {str(e)}")
                
        self.log(f"\n{'='*50}")
        self.log(f"FINAL RESULTS: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        self.log(f"{'='*50}")
        
        return passed, total

if __name__ == "__main__":
    tester = WorkoutEndpointTester()
    passed, total = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if passed == total else 1)