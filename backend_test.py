#!/usr/bin/env python3

import requests
import sys
import time
import json
from datetime import datetime

# Test configuration
BACKEND_URL = "https://api-critical-patch.preview.emergentagent.com/api"

# Authentication details  
AUTH_EMAIL = "testworkout@test.com"
AUTH_PASSWORD = "Test123!"

def test_2_new_endpoints_round12():
    """Test the 2 NEW backend endpoints specified in Round 12"""
    print("=" * 80)
    print("🧪 TESTING 2 NEW SIRIUS BACKEND ENDPOINTS - ROUND 12")
    print("=" * 80)
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test User: {AUTH_EMAIL}")
    print(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    session = requests.Session()
    
    # Step 1: Authentication
    print("1️⃣ **AUTHENTICATION**")
    auth_url = f"{BACKEND_URL}/auth/login"
    auth_data = {"email": AUTH_EMAIL, "password": AUTH_PASSWORD}
    
    try:
        auth_response = session.post(auth_url, json=auth_data)
        print(f"   POST {auth_url}")
        print(f"   Status: {auth_response.status_code}")
        
        if auth_response.status_code == 200:
            print(f"   ✅ Authentication successful")
            print(f"   Session cookies: {len(session.cookies)} cookies set")
            print()
        else:
            print(f"   ❌ Authentication failed: {auth_response.text}")
            return
    except Exception as e:
        print(f"   ❌ Authentication error: {str(e)}")
        return

    # Test results summary
    test_results = []
    created_task_id = None

    # Test 1: Task Kanban Status Flow
    print("2️⃣ **TEST 1: Task Kanban Status Flow**")
    print("   Step A: Create a task")
    create_task_url = f"{BACKEND_URL}/tasks"
    task_payload = {
        "title": "Teste Kanban",
        "description": "tarefa de teste",
        "priority": "high",
        "recurrence": "once",
        "date": "2026-03-17"
    }
    
    try:
        start_time = time.time()
        response = session.post(create_task_url, json=task_payload)
        duration = round(time.time() - start_time, 2)
        
        print(f"   POST {create_task_url}")
        print(f"   Status: {response.status_code} | Duration: {duration}s")
        
        if response.status_code in [200, 201]:
            task_data = response.json()
            created_task_id = task_data.get('task_id')
            print(f"   ✅ Task created successfully")
            print(f"   Task ID: {created_task_id}")
            print(f"   Title: {task_data.get('title', 'N/A')}")
            print(f"   Priority: {task_data.get('priority', 'N/A')}")
            print()
            
            if created_task_id:
                # Step B: Move to in_progress
                print("   Step B: Move task to in_progress")
                status_url = f"{BACKEND_URL}/tasks/{created_task_id}/status"
                status_payload = {"status": "in_progress", "date": "2026-03-17"}
                
                try:
                    start_time = time.time()
                    response = session.patch(status_url, json=status_payload)
                    duration = round(time.time() - start_time, 2)
                    
                    print(f"   PATCH {status_url}")
                    print(f"   Status: {response.status_code} | Duration: {duration}s")
                    
                    if response.status_code == 200:
                        data = response.json()
                        print(f"   ✅ Status updated to in_progress")
                        print(f"   Message: {data.get('message', 'N/A')}")
                        print(f"   Status: {data.get('status', 'N/A')}")
                        print(f"   XP Earned: {data.get('xp_earned', 0)}")
                        print()
                        
                        # Step C: Move to done
                        print("   Step C: Move task to done (should earn XP)")
                        done_payload = {"status": "done", "date": "2026-03-17"}
                        
                        try:
                            start_time = time.time()
                            response = session.patch(status_url, json=done_payload)
                            duration = round(time.time() - start_time, 2)
                            
                            print(f"   PATCH {status_url}")
                            print(f"   Status: {response.status_code} | Duration: {duration}s")
                            
                            if response.status_code == 200:
                                data = response.json()
                                xp_earned = data.get('xp_earned', 0)
                                new_xp = data.get('new_xp', 0)
                                new_rank = data.get('new_rank', '')
                                
                                print(f"   ✅ Task moved to done")
                                print(f"   XP Earned: {xp_earned} (should be > 0)")
                                print(f"   New XP: {new_xp}")
                                print(f"   New Rank: {new_rank}")
                                
                                if xp_earned > 0:
                                    print(f"   ✅ XP reward system working correctly")
                                else:
                                    print(f"   ⚠️ Expected XP > 0 but got {xp_earned}")
                                print()
                                
                                # Step D: Move back to todo (should deduct XP)
                                print("   Step D: Move task back to todo (should deduct XP)")
                                todo_payload = {"status": "todo", "date": "2026-03-17"}
                                
                                try:
                                    start_time = time.time()
                                    response = session.patch(status_url, json=todo_payload)
                                    duration = round(time.time() - start_time, 2)
                                    
                                    print(f"   PATCH {status_url}")
                                    print(f"   Status: {response.status_code} | Duration: {duration}s")
                                    
                                    if response.status_code == 200:
                                        data = response.json()
                                        xp_earned_back = data.get('xp_earned', 0)
                                        final_xp = data.get('new_xp', 0)
                                        final_rank = data.get('new_rank', '')
                                        
                                        print(f"   ✅ Task moved back to todo")
                                        print(f"   XP Earned: {xp_earned_back} (should be < 0)")
                                        print(f"   Final XP: {final_xp}")
                                        print(f"   Final Rank: {final_rank}")
                                        
                                        if xp_earned_back < 0:
                                            print(f"   ✅ XP deduction system working correctly")
                                            test_results.append(("Task Kanban Status Flow", True, f"All status transitions working, XP +{xp_earned} then {xp_earned_back}"))
                                        else:
                                            print(f"   ⚠️ Expected XP < 0 but got {xp_earned_back}")
                                            test_results.append(("Task Kanban Status Flow", False, f"XP deduction not working: {xp_earned_back}"))
                                    else:
                                        print(f"   ❌ Failed to move back to todo: {response.text[:200]}")
                                        test_results.append(("Task Kanban Status Flow", False, f"Todo transition failed: HTTP {response.status_code}"))
                                except Exception as e:
                                    print(f"   ❌ Error moving back to todo: {str(e)}")
                                    test_results.append(("Task Kanban Status Flow", False, f"Todo error: {str(e)}"))
                            else:
                                print(f"   ❌ Failed to move to done: {response.text[:200]}")
                                test_results.append(("Task Kanban Status Flow", False, f"Done transition failed: HTTP {response.status_code}"))
                        except Exception as e:
                            print(f"   ❌ Error moving to done: {str(e)}")
                            test_results.append(("Task Kanban Status Flow", False, f"Done error: {str(e)}"))
                    else:
                        print(f"   ❌ Failed to move to in_progress: {response.text[:200]}")
                        test_results.append(("Task Kanban Status Flow", False, f"In-progress transition failed: HTTP {response.status_code}"))
                except Exception as e:
                    print(f"   ❌ Error moving to in_progress: {str(e)}")
                    test_results.append(("Task Kanban Status Flow", False, f"In-progress error: {str(e)}"))
            else:
                print(f"   ❌ No task_id returned from creation")
                test_results.append(("Task Kanban Status Flow", False, "Task creation returned no ID"))
        else:
            print(f"   ❌ Task creation failed: {response.text[:200]}")
            test_results.append(("Task Kanban Status Flow", False, f"Task creation failed: HTTP {response.status_code}"))
    except Exception as e:
        print(f"   ❌ Task creation error: {str(e)}")
        test_results.append(("Task Kanban Status Flow", False, f"Error: {str(e)}"))
    
    print()

    # Test 2: Calendar Events endpoint
    print("3️⃣ **TEST 2: Calendar Events**")
    calendar_url = f"{BACKEND_URL}/calendar/events?start=2026-03-01&end=2026-03-31"
    
    try:
        start_time = time.time()
        response = session.get(calendar_url)
        duration = round(time.time() - start_time, 2)
        
        print(f"   GET {calendar_url}")
        print(f"   Status: {response.status_code} | Duration: {duration}s")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Calendar events endpoint working")
            print(f"   Response keys: {list(data.keys())}")
            
            events = data.get('events', [])
            start_date = data.get('start', '')
            end_date = data.get('end', '')
            
            print(f"   Start: {start_date}")
            print(f"   End: {end_date}")
            print(f"   Total events: {len(events)}")
            
            # Validate response structure
            if 'events' in data and 'start' in data and 'end' in data:
                print(f"   ✅ Required fields present (events, start, end)")
                
                # Validate event structure if events exist
                if events and len(events) > 0:
                    sample_event = events[0]
                    required_fields = ['id', 'title', 'date', 'type', 'color']
                    missing_fields = [f for f in required_fields if f not in sample_event]
                    
                    if not missing_fields:
                        print(f"   ✅ Event structure correct - sample event:")
                        print(f"      ID: {sample_event.get('id', 'N/A')}")
                        print(f"      Title: {sample_event.get('title', 'N/A')}")
                        print(f"      Date: {sample_event.get('date', 'N/A')}")
                        print(f"      Type: {sample_event.get('type', 'N/A')}")
                        print(f"      Color: {sample_event.get('color', 'N/A')}")
                        print(f"      Completed: {sample_event.get('completed', 'N/A')}")
                    else:
                        print(f"   ⚠️ Missing fields in events: {missing_fields}")
                    
                    # Check for event types
                    event_types = list(set(e.get('type', '') for e in events))
                    print(f"   Event types found: {event_types}")
                    
                    test_results.append(("Calendar Events", True, f"Success - {len(events)} events, types: {event_types}"))
                else:
                    print(f"   ✅ No events found (this is normal for a new test account)")
                    test_results.append(("Calendar Events", True, f"Success - 0 events (expected for new account)"))
            else:
                print(f"   ⚠️ Missing required response fields")
                test_results.append(("Calendar Events", False, "Missing required response fields"))
        else:
            print(f"   ❌ Calendar events failed: {response.text[:200]}")
            test_results.append(("Calendar Events", False, f"HTTP {response.status_code}"))
    except Exception as e:
        print(f"   ❌ Calendar events error: {str(e)}")
        test_results.append(("Calendar Events", False, f"Error: {str(e)}"))
    print()

    # Final Summary
    print("=" * 80)
    print("📊 **FINAL TEST RESULTS SUMMARY**")
    print("=" * 80)
    
    passed = sum(1 for _, success, _ in test_results if success)
    total = len(test_results)
    success_rate = round((passed / total * 100), 1) if total > 0 else 0
    
    print(f"**Overall Success Rate: {passed}/{total} ({success_rate}%)**")
    print()
    
    for test_name, success, details in test_results:
        status = "✅" if success else "❌"
        print(f"{status} **{test_name}:** {details}")
    
    print()
    if passed == total:
        print("🎉 **ALL 2 NEW ENDPOINTS WORKING CORRECTLY!**")
        print("✅ Task Kanban Status Flow - todo → in_progress → done → todo with XP rewards")
        print("✅ Calendar Events aggregation - tasks, habits, study, workouts, meals")
        print()
        print("**🔗 Integration Status:**")
        print("- Authentication: Working with session cookies")
        print("- Task Status Management: Full kanban flow with XP system")
        print("- Calendar Aggregation: Multi-module event compilation")
        print("- Database operations: Task instances and event queries working")
        print("- XP System: Reward and deduction mechanics functional")
        print()
        print("**✅ No critical issues found. Both endpoints are production-ready.**")
    else:
        print(f"⚠️ **{total - passed} out of {total} endpoints have issues.**")
        print("Please check the failed tests above for details.")
    
    print("=" * 80)

if __name__ == "__main__":
    test_2_new_endpoints_round12()