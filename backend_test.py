#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime

# Configuration
API_URL = "https://api-critical-patch.preview.emergentagent.com/api"
TEST_USER = {
    "email": "testworkout@test.com",
    "password": "Test123!"
}

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.authenticated = False
        
    def authenticate(self):
        """Authenticate with the backend"""
        print("🔐 Authenticating...")
        
        try:
            response = self.session.post(
                f"{API_URL}/auth/login",
                json=TEST_USER,
                timeout=10
            )
            
            if response.status_code == 200:
                self.authenticated = True
                print("✅ Authentication successful")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {str(e)}")
            return False
    
    def test_streaks_global(self):
        """Test GET /api/streaks/global endpoint"""
        print("\n📊 Testing GET /api/streaks/global...")
        
        try:
            start_time = time.time()
            response = self.session.get(
                f"{API_URL}/streaks/global",
                timeout=30
            )
            duration = time.time() - start_time
            
            print(f"Response time: {duration:.2f}s")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = [
                    'current_streak', 'longest_streak', 'total_active_days', 
                    'today_modules', 'combo_count', 'combo_bonus_xp', 
                    'heatmap', 'module_streaks'
                ]
                
                missing_fields = []
                for field in required_fields:
                    if field not in data:
                        missing_fields.append(field)
                
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    return False
                
                # Validate data types and structure
                if not isinstance(data['current_streak'], (int, float)) or data['current_streak'] < 0:
                    print(f"❌ Invalid current_streak: {data['current_streak']}")
                    return False
                    
                if not isinstance(data['longest_streak'], (int, float)) or data['longest_streak'] < 0:
                    print(f"❌ Invalid longest_streak: {data['longest_streak']}")
                    return False
                
                if not isinstance(data['total_active_days'], (int, float)):
                    print(f"❌ Invalid total_active_days: {data['total_active_days']}")
                    return False
                
                if not isinstance(data['today_modules'], list):
                    print(f"❌ Invalid today_modules: {data['today_modules']}")
                    return False
                
                if not isinstance(data['combo_count'], (int, float)):
                    print(f"❌ Invalid combo_count: {data['combo_count']}")
                    return False
                
                if not isinstance(data['combo_bonus_xp'], (int, float)):
                    print(f"❌ Invalid combo_bonus_xp: {data['combo_bonus_xp']}")
                    return False
                
                # Validate heatmap structure (should be array of 7 objects)
                if not isinstance(data['heatmap'], list) or len(data['heatmap']) != 7:
                    print(f"❌ Invalid heatmap structure: expected 7 items, got {len(data['heatmap'])}")
                    return False
                
                # Check heatmap object structure
                for i, day in enumerate(data['heatmap']):
                    if not all(key in day for key in ['date', 'active', 'modules', 'count']):
                        print(f"❌ Invalid heatmap item {i}: missing required keys")
                        return False
                    
                    if not isinstance(day['active'], bool):
                        print(f"❌ Invalid heatmap item {i}: active should be boolean")
                        return False
                    
                    if not isinstance(day['modules'], list):
                        print(f"❌ Invalid heatmap item {i}: modules should be array")
                        return False
                    
                    if not isinstance(day['count'], (int, float)):
                        print(f"❌ Invalid heatmap item {i}: count should be number")
                        return False
                
                # Validate module_streaks structure
                if not isinstance(data['module_streaks'], dict):
                    print(f"❌ Invalid module_streaks: should be object")
                    return False
                
                expected_modules = ['tasks', 'habits', 'study', 'workouts', 'nutrition']
                for module in expected_modules:
                    if module not in data['module_streaks']:
                        print(f"❌ Missing module streak: {module}")
                        return False
                    
                    if not isinstance(data['module_streaks'][module], (int, float)):
                        print(f"❌ Invalid module streak value for {module}: {data['module_streaks'][module]}")
                        return False
                
                print("✅ Streaks endpoint working correctly:")
                print(f"   Current streak: {data['current_streak']}")
                print(f"   Longest streak: {data['longest_streak']}")
                print(f"   Total active days: {data['total_active_days']}")
                print(f"   Today modules: {data['today_modules']}")
                print(f"   Combo: {data['combo_count']} (bonus: {data['combo_bonus_xp']} XP)")
                print(f"   Heatmap: {len(data['heatmap'])} days")
                print(f"   Module streaks: {data['module_streaks']}")
                
                return True
                
            else:
                print(f"❌ Streaks endpoint failed: {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return False
                
        except Exception as e:
            print(f"❌ Streaks endpoint error: {str(e)}")
            return False
    
    def test_daily_summary(self):
        """Test GET /api/dashboard/daily-summary endpoint"""
        print("\n📋 Testing GET /api/dashboard/daily-summary...")
        
        try:
            start_time = time.time()
            response = self.session.get(
                f"{API_URL}/dashboard/daily-summary",
                timeout=30  # 30 second timeout as specified
            )
            duration = time.time() - start_time
            
            print(f"Response time: {duration:.2f}s")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required top-level fields
                required_fields = ['user_id', 'date', 'summary', 'raw_data', 'created_at']
                
                missing_fields = []
                for field in required_fields:
                    if field not in data:
                        missing_fields.append(field)
                
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    return False
                
                # Validate summary structure
                if not isinstance(data['summary'], dict):
                    print(f"❌ Invalid summary: should be object")
                    return False
                
                required_summary_fields = [
                    'greeting', 'progress_summary', 'pending_items', 
                    'motivation', 'priority_action', 'score'
                ]
                
                for field in required_summary_fields:
                    if field not in data['summary']:
                        print(f"❌ Missing summary field: {field}")
                        return False
                
                # Validate score range (0-100)
                score = data['summary']['score']
                if not isinstance(score, (int, float)) or score < 0 or score > 100:
                    print(f"❌ Invalid score: {score} (should be 0-100)")
                    return False
                
                # Validate pending_items is array
                if not isinstance(data['summary']['pending_items'], list):
                    print(f"❌ Invalid pending_items: should be array")
                    return False
                
                # Validate raw_data structure
                if not isinstance(data['raw_data'], dict):
                    print(f"❌ Invalid raw_data: should be object")
                    return False
                
                required_raw_fields = [
                    'tasks_pending', 'tasks_done', 'habits_pending', 'habits_done',
                    'study_minutes', 'meals_count', 'calories', 'workouts_count'
                ]
                
                for field in required_raw_fields:
                    if field not in data['raw_data']:
                        print(f"❌ Missing raw_data field: {field}")
                        return False
                
                # Validate user_id is string
                if not isinstance(data['user_id'], str):
                    print(f"❌ Invalid user_id: should be string")
                    return False
                
                # Validate date is string (today's date)
                if not isinstance(data['date'], str):
                    print(f"❌ Invalid date: should be string")
                    return False
                
                # Validate created_at is string
                if not isinstance(data['created_at'], str):
                    print(f"❌ Invalid created_at: should be string")
                    return False
                
                print("✅ Daily summary endpoint working correctly:")
                print(f"   User ID: {data['user_id']}")
                print(f"   Date: {data['date']}")
                print(f"   Score: {data['summary']['score']}/100")
                print(f"   Greeting: {data['summary']['greeting'][:50]}...")
                print(f"   Progress: {data['summary']['progress_summary'][:50]}...")
                print(f"   Pending items: {len(data['summary']['pending_items'])}")
                print(f"   Motivation: {data['summary']['motivation'][:50]}...")
                print(f"   Priority action: {data['summary']['priority_action'][:50]}...")
                print(f"   Raw data: tasks ({data['raw_data']['tasks_pending']}/{data['raw_data']['tasks_done']}), " +
                      f"habits ({data['raw_data']['habits_pending']}/{data['raw_data']['habits_done']}), " +
                      f"study ({data['raw_data']['study_minutes']}min), " +
                      f"workouts ({data['raw_data']['workouts_count']})")
                print(f"   Created: {data['created_at']}")
                
                return True
                
            else:
                print(f"❌ Daily summary endpoint failed: {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return False
                
        except Exception as e:
            print(f"❌ Daily summary endpoint error: {str(e)}")
            return False
    
    def run_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests")
        print(f"Backend URL: {API_URL}")
        print(f"Test User: {TEST_USER['email']}")
        print("=" * 50)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed, stopping tests")
            return False
        
        # Test results
        results = {
            "streaks_global": self.test_streaks_global(),
            "daily_summary": self.test_daily_summary()
        }
        
        # Summary
        print("\n" + "=" * 50)
        print("📊 TEST RESULTS SUMMARY:")
        
        total_tests = len(results)
        passed_tests = sum(1 for result in results.values() if result)
        
        for test_name, passed in results.items():
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"   {test_name}: {status}")
        
        success_rate = (passed_tests / total_tests) * 100
        print(f"\n🎯 Success Rate: {passed_tests}/{total_tests} ({success_rate:.0f}%)")
        
        if success_rate == 100:
            print("🎉 ALL TESTS PASSED!")
        else:
            print("⚠️  Some tests failed - check details above")
        
        return success_rate == 100

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_tests()
    exit(0 if success else 1)