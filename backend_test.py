#!/usr/bin/env python3
"""
Backend Testing Script for Dashboard Tasks Counter Fix
"""

import requests
import json
import os
from datetime import datetime, timezone

# Load the backend URL from frontend/.env
def get_backend_url():
    with open('/app/frontend/.env', 'r') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                return line.strip().split('=', 1)[1]
    return None

BASE_URL = get_backend_url()
if not BASE_URL:
    raise Exception("REACT_APP_BACKEND_URL not found in frontend/.env")

API_URL = f"{BASE_URL}/api"
print(f"Testing against: {API_URL}")

# Test data
TEST_EMAIL = "testdashfix@test.com"
TEST_PASSWORD = "Test123!"
TEST_NAME = "Dashboard Test User"

def print_test_step(step, description):
    print(f"\n{'='*60}")
    print(f"Step {step}: {description}")
    print(f"{'='*60}")

def register_and_login():
    """Register/login test user and return session token"""
    print_test_step(1, "Register/Login Test User")
    
    # Try to register (might fail if user exists)
    register_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": TEST_NAME
    }
    
    try:
        print(f"Registering user: {TEST_EMAIL}")
        response = requests.post(f"{API_URL}/auth/register", json=register_data)
        if response.status_code == 200:
            print("✅ User registered successfully")
            return response.json()["session_token"]
        elif response.status_code == 400 and "already registered" in response.text:
            print("ℹ️ User already exists, attempting login")
        else:
            print(f"❌ Registration failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Registration error: {e}")
    
    # Login
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    try:
        print(f"Logging in user: {TEST_EMAIL}")
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            token = response.json()["session_token"]
            print("✅ User logged in successfully")
            return token
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def create_task(session_token):
    """Create a task via POST /api/tasks"""
    print_test_step(2, "Create Task via POST /api/tasks")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    task_data = {
        "title": "Teste tarefa",
        "date": today,
        "priority": "medium",
        "recurrence": "once"
    }
    
    headers = {"Authorization": f"Bearer {session_token}"}
    
    try:
        print(f"Creating task: {task_data}")
        response = requests.post(f"{API_URL}/tasks", json=task_data, headers=headers)
        
        if response.status_code == 200:
            task = response.json()
            print(f"✅ Task created successfully: {task['task_id']}")
            print(f"   Title: {task['title']}")
            print(f"   Priority: {task['priority']}")
            print(f"   Date: {task['date']}")
            print(f"   Is Template: {task.get('is_template', 'Not specified')}")
            return task["task_id"]
        else:
            print(f"❌ Task creation failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Task creation error: {e}")
        return None

def check_dashboard_stats(session_token, step_number, expected_description):
    """Check GET /api/stats/dashboard"""
    print_test_step(step_number, expected_description)
    
    headers = {"Authorization": f"Bearer {session_token}"}
    
    try:
        print("Calling GET /api/stats/dashboard")
        response = requests.get(f"{API_URL}/stats/dashboard", headers=headers)
        
        if response.status_code == 200:
            stats = response.json()
            print("✅ Dashboard stats retrieved successfully")
            print(f"   tasks_today: {stats.get('tasks_today', 'N/A')}")
            print(f"   tasks_completed_today: {stats.get('tasks_completed_today', 'N/A')}")
            print(f"   habits_total: {stats.get('habits_total', 'N/A')}")
            print(f"   habits_completed_today: {stats.get('habits_completed_today', 'N/A')}")
            print(f"   goals_avg_progress: {stats.get('goals_avg_progress', 'N/A')}")
            
            # Verify tasks_today > 0 after creating task
            if step_number == 3:
                if stats.get('tasks_today', 0) > 0:
                    print(f"✅ VERIFICATION PASSED: tasks_today = {stats['tasks_today']} (should be at least 1)")
                else:
                    print(f"❌ VERIFICATION FAILED: tasks_today = {stats.get('tasks_today', 0)} (should be at least 1)")
            
            # Verify tasks_completed_today > 0 after completing task
            if step_number == 5:
                if stats.get('tasks_completed_today', 0) > 0:
                    print(f"✅ VERIFICATION PASSED: tasks_completed_today = {stats['tasks_completed_today']} (should be at least 1)")
                else:
                    print(f"❌ VERIFICATION FAILED: tasks_completed_today = {stats.get('tasks_completed_today', 0)} (should be at least 1)")
            
            return stats
        else:
            print(f"❌ Dashboard stats failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Dashboard stats error: {e}")
        return None

def complete_task(session_token, task_id):
    """Complete task via PATCH /api/tasks/{task_id}?completed=true&date=today"""
    print_test_step(4, "Complete Task via PATCH /api/tasks/{task_id}")
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    headers = {"Authorization": f"Bearer {session_token}"}
    params = {"completed": "true", "date": today}
    
    try:
        print(f"Completing task {task_id} for date {today}")
        response = requests.patch(f"{API_URL}/tasks/{task_id}", params=params, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Task completed successfully")
            print(f"   Message: {result.get('message', 'N/A')}")
            print(f"   XP Earned: {result.get('xp_earned', 'N/A')}")
            print(f"   New XP: {result.get('new_xp', 'N/A')}")
            return True
        else:
            print(f"❌ Task completion failed: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"Task completion error: {e}")
        return False

def main():
    """Main test execution"""
    print("🚀 Starting Dashboard Tasks Counter Fix Testing")
    print(f"Target API: {API_URL}")
    print(f"Test User: {TEST_EMAIL}")
    
    # Step 1: Register/Login
    session_token = register_and_login()
    if not session_token:
        print("❌ Failed to authenticate. Exiting.")
        return
    
    # Step 2: Create Task
    task_id = create_task(session_token)
    if not task_id:
        print("❌ Failed to create task. Exiting.")
        return
    
    # Step 3: Check stats - verify tasks_today > 0
    stats_before = check_dashboard_stats(session_token, 3, "Verify tasks_today > 0 after creating task")
    if not stats_before:
        print("❌ Failed to get dashboard stats. Exiting.")
        return
    
    # Step 4: Complete Task
    success = complete_task(session_token, task_id)
    if not success:
        print("❌ Failed to complete task. Exiting.")
        return
    
    # Step 5: Check stats again - verify tasks_completed_today > 0
    stats_after = check_dashboard_stats(session_token, 5, "Verify tasks_completed_today > 0 after completing task")
    if not stats_after:
        print("❌ Failed to get dashboard stats after completion. Exiting.")
        return
    
    # Step 6: Verify other stats are returned properly
    print_test_step(6, "Verify other dashboard stats are returned properly")
    
    required_fields = ["habits_total", "habits_completed_today", "goals_avg_progress"]
    all_present = True
    
    for field in required_fields:
        if field in stats_after:
            print(f"✅ {field}: {stats_after[field]}")
        else:
            print(f"❌ Missing field: {field}")
            all_present = False
    
    if all_present:
        print("✅ All required dashboard stats fields are present")
    else:
        print("❌ Some required dashboard stats fields are missing")
    
    # Final Summary
    print_test_step("FINAL", "Test Summary")
    
    tasks_today_ok = stats_before.get('tasks_today', 0) > 0
    tasks_completed_ok = stats_after.get('tasks_completed_today', 0) > 0
    other_stats_ok = all_present
    
    print(f"✅ tasks_today > 0: {tasks_today_ok} (value: {stats_before.get('tasks_today', 0)})")
    print(f"✅ tasks_completed_today > 0: {tasks_completed_ok} (value: {stats_after.get('tasks_completed_today', 0)})")
    print(f"✅ Other stats present: {other_stats_ok}")
    
    if tasks_today_ok and tasks_completed_ok and other_stats_ok:
        print("\n🎉 ALL TESTS PASSED - Dashboard Tasks Counter Fix is working correctly!")
    else:
        print("\n❌ SOME TESTS FAILED - Dashboard Tasks Counter Fix needs attention")

if __name__ == "__main__":
    main()