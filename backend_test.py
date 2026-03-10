#!/usr/bin/env python3
"""
Backend API Testing - General Integrated Chat Endpoint
Testing the /api/chat/general endpoint functionality
"""

import requests
import json
import time
from typing import Dict, Any, List

# Configuration
BASE_URL = "https://edital-schedule.preview.emergentagent.com/api"
TEST_EMAIL = "testedital@test.com"
TEST_PASSWORD = "Test123!"

# Global session to maintain cookies
session = requests.Session()

def test_login() -> bool:
    """Login to get session cookie"""
    print("🔐 Testing authentication...")
    
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    response = session.post(f"{BASE_URL}/auth/login", json=login_data)
    
    if response.status_code == 200:
        print(f"✅ Login successful for {TEST_EMAIL}")
        return True
    else:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return False

def test_chat_general(content: str, expected_intent: str = None, test_name: str = "") -> Dict[str, Any]:
    """Test the general chat endpoint"""
    print(f"\n📝 Testing: {test_name}")
    print(f"   Input: \"{content}\"")
    
    payload = {"content": content}
    
    try:
        response = session.post(f"{BASE_URL}/chat/general", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Request successful (200)")
            
            # Extract key information
            intent = data.get("intent", "unknown")
            saved_item = data.get("saved_item")
            ai_message = data.get("ai_message", {})
            ai_content = ai_message.get("content", "")
            
            print(f"   Intent detected: {intent}")
            if expected_intent and intent != expected_intent:
                print(f"   ⚠️  Expected intent: {expected_intent}, got: {intent}")
            
            if saved_item:
                print(f"   Saved item: {saved_item['type']} - {saved_item.get('id', '')}")
                if saved_item['type'] == 'transactions':
                    items = saved_item.get('items', [])
                    print(f"   Transactions created: {len(items)}")
                    for i, item in enumerate(items, 1):
                        print(f"     {i}. {item['type']}: R$ {item['amount']:.2f} ({item['category']}) - {item['description']}")
            
            # Show part of AI response
            if ai_content:
                preview = ai_content[:150] + "..." if len(ai_content) > 150 else ai_content
                print(f"   AI Response: {preview}")
            
            return data
        else:
            print(f"❌ Request failed: {response.status_code} - {response.text}")
            return {"error": response.text, "status_code": response.status_code}
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return {"error": str(e)}

def verify_transactions(expected_count: int = None, month: str = "2026-03") -> List[Dict]:
    """Verify transactions were saved"""
    print(f"\n🔍 Verifying transactions for {month}...")
    
    try:
        response = session.get(f"{BASE_URL}/transactions?month={month}")
        
        if response.status_code == 200:
            transactions = response.json()
            print(f"✅ Found {len(transactions)} transactions in {month}")
            
            # Show recent transactions
            for i, trans in enumerate(transactions[-10:], 1):  # Show last 10
                trans_type = trans.get('type', 'unknown')
                amount = trans.get('amount', 0)
                category = trans.get('category', '')
                desc = trans.get('description', '')
                date = trans.get('date', '')
                emoji = "💰" if trans_type == "income" else "🔴"
                sign = "+" if trans_type == "income" else "-"
                print(f"   {i}. {emoji} {sign}R$ {amount:.2f} | {category} | {desc} | {date}")
            
            if expected_count is not None:
                if len(transactions) >= expected_count:
                    print(f"✅ Expected at least {expected_count} transactions, found {len(transactions)}")
                else:
                    print(f"⚠️  Expected at least {expected_count} transactions, found {len(transactions)}")
            
            return transactions
        else:
            print(f"❌ Failed to get transactions: {response.status_code} - {response.text}")
            return []
            
    except Exception as e:
        print(f"❌ Error verifying transactions: {str(e)}")
        return []

def main():
    """Main test execution"""
    print("=" * 80)
    print("🚀 GENERAL INTEGRATED CHAT ENDPOINT TESTING")
    print("=" * 80)
    
    # Step 1: Login
    if not test_login():
        print("❌ Cannot proceed without authentication")
        return
    
    # Wait a moment for session to stabilize
    time.sleep(2)
    
    print("\n" + "=" * 80)
    print("🧪 CHAT ENDPOINT TESTS")
    print("=" * 80)
    
    # Test 1: Finance Expense (Multiple)
    result1 = test_chat_general(
        "Gastei 50 reais no supermercado e 30 de uber",
        expected_intent="finance_expense",
        test_name="Test 1 - Multiple Expenses"
    )
    
    # Test 2: Finance Income (Single)  
    result2 = test_chat_general(
        "Recebi 5000 de salário hoje",
        expected_intent="finance_income",
        test_name="Test 2 - Single Income"
    )
    
    # Test 3: Task Creation
    result3 = test_chat_general(
        "Criar tarefa: Estudar direito constitucional amanhã",
        expected_intent="task",
        test_name="Test 3 - Task Creation"
    )
    
    # Test 4: Goal Creation
    result4 = test_chat_general(
        "Minha meta é perder 5kg até dezembro",
        expected_intent="goal",
        test_name="Test 4 - Goal Creation"
    )
    
    # Test 5: Finance Report
    result5 = test_chat_general(
        "Como estão minhas finanças este mês?",
        expected_intent="finance_report",
        test_name="Test 5 - Finance Report"
    )
    
    # Step 6: Verify transactions were saved
    transactions = verify_transactions(expected_count=3)  # At least 3 from the tests
    
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    
    test_results = []
    
    # Analyze Test 1 Results
    if "error" not in result1:
        intent1 = result1.get("intent")
        saved1 = result1.get("saved_item")
        if intent1 == "finance_expense" and saved1 and saved1.get("type") == "transactions":
            items1 = saved1.get("items", [])
            if len(items1) == 2:  # Should detect 2 expenses
                print("✅ Test 1 PASSED: Detected finance_expense intent, created 2 transactions")
                test_results.append(True)
            else:
                print(f"❌ Test 1 FAILED: Expected 2 transactions, got {len(items1)}")
                test_results.append(False)
        else:
            print(f"❌ Test 1 FAILED: Wrong intent ({intent1}) or no transactions saved")
            test_results.append(False)
    else:
        print("❌ Test 1 FAILED: Request error")
        test_results.append(False)
    
    # Analyze Test 2 Results
    if "error" not in result2:
        intent2 = result2.get("intent")
        saved2 = result2.get("saved_item")
        if intent2 == "finance_income" and saved2 and saved2.get("type") == "transactions":
            items2 = saved2.get("items", [])
            if len(items2) == 1:  # Should detect 1 income
                print("✅ Test 2 PASSED: Detected finance_income intent, created 1 transaction")
                test_results.append(True)
            else:
                print(f"❌ Test 2 FAILED: Expected 1 transaction, got {len(items2)}")
                test_results.append(False)
        else:
            print(f"❌ Test 2 FAILED: Wrong intent ({intent2}) or no transactions saved")
            test_results.append(False)
    else:
        print("❌ Test 2 FAILED: Request error")
        test_results.append(False)
    
    # Analyze Test 3 Results
    if "error" not in result3:
        intent3 = result3.get("intent")
        saved3 = result3.get("saved_item")
        if intent3 == "task" and saved3 and saved3.get("type") == "task":
            print("✅ Test 3 PASSED: Detected task intent, created task")
            test_results.append(True)
        else:
            print(f"❌ Test 3 FAILED: Wrong intent ({intent3}) or no task saved")
            test_results.append(False)
    else:
        print("❌ Test 3 FAILED: Request error")
        test_results.append(False)
    
    # Analyze Test 4 Results
    if "error" not in result4:
        intent4 = result4.get("intent")
        saved4 = result4.get("saved_item")
        if intent4 == "goal" and saved4 and saved4.get("type") == "goal":
            print("✅ Test 4 PASSED: Detected goal intent, created goal")
            test_results.append(True)
        else:
            print(f"❌ Test 4 FAILED: Wrong intent ({intent4}) or no goal saved")
            test_results.append(False)
    else:
        print("❌ Test 4 FAILED: Request error")
        test_results.append(False)
    
    # Analyze Test 5 Results
    if "error" not in result5:
        intent5 = result5.get("intent")
        ai_msg5 = result5.get("ai_message", {}).get("content", "")
        if intent5 == "finance_report" and len(ai_msg5) > 100:  # Should have substantial content
            print("✅ Test 5 PASSED: Detected finance_report intent, generated analysis")
            test_results.append(True)
        else:
            print(f"❌ Test 5 FAILED: Wrong intent ({intent5}) or insufficient response content")
            test_results.append(False)
    else:
        print("❌ Test 5 FAILED: Request error")
        test_results.append(False)
    
    # Overall Results
    passed_tests = sum(test_results)
    total_tests = len(test_results)
    
    print(f"\n🎯 FINAL RESULTS: {passed_tests}/{total_tests} tests passed ({passed_tests/total_tests*100:.1f}%)")
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED! General chat endpoint is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the individual test results above.")
    
    print(f"📚 Transaction verification: {len(transactions)} total transactions found")

if __name__ == "__main__":
    main()