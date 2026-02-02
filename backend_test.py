#!/usr/bin/env python3
"""
Backend Testing Suite for Sirius Financial Management System
Tests the new features: Credit Card Installments, Projections, and AI Integration
"""

import requests
import json
import time
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Configuration
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://expense-planner-85.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
TEST_EMAIL = "testsirius@test.com"
TEST_PASSWORD = "Test123!"

class SiriusBackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session_token = None
        self.user_id = None
        self.test_card_id = None
        self.test_projection_id = None
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def login(self):
        """Login with test credentials"""
        self.log("🔐 Testing login...")
        
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        try:
            response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.session_token = data.get('session_token')
                self.user_id = data.get('user', {}).get('user_id')
                
                # Set session cookie
                self.session.cookies.set('session_token', self.session_token)
                
                self.log(f"✅ Login successful - User ID: {self.user_id}")
                return True
            else:
                self.log(f"❌ Login failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login error: {str(e)}", "ERROR")
            return False
    
    def test_credit_card_creation(self):
        """Test creating a new credit card"""
        self.log("💳 Testing credit card creation...")
        
        card_data = {
            "name": "Teste Visa",
            "limit": 5000.00,
            "closing_day": 15,
            "due_day": 10
        }
        
        try:
            response = self.session.post(f"{API_BASE}/credit-cards", json=card_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_card_id = data.get('card_id')
                self.log(f"✅ Credit card created - ID: {self.test_card_id}")
                return True
            else:
                self.log(f"❌ Credit card creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Credit card creation error: {str(e)}", "ERROR")
            return False
    
    def test_credit_card_charge_installments(self):
        """Test charging to credit card with installments"""
        if not self.test_card_id:
            self.log("❌ No test card available for charge test", "ERROR")
            return False
            
        self.log("💰 Testing credit card charge with installments...")
        
        charge_data = {
            "amount": 1200.00,
            "description": "Compra teste parcelada",
            "category": "lazer",
            "payment_type": "parcelado",
            "installments": 3
        }
        
        try:
            response = self.session.post(f"{API_BASE}/credit-cards/{self.test_card_id}/charge", json=charge_data)
            
            if response.status_code == 200:
                data = response.json()
                installment_amount = data.get('installment_amount')
                total_amount = data.get('total_amount')
                installments = data.get('installments')
                
                # Verify installment calculation
                expected_installment = 1200.00 / 3
                if abs(installment_amount - expected_installment) < 0.01:
                    self.log(f"✅ Credit card charge successful - Installment: R$ {installment_amount:.2f}")
                    self.log(f"   Total: R$ {total_amount:.2f}, Installments: {installments}")
                    return True
                else:
                    self.log(f"❌ Installment calculation error: Expected {expected_installment:.2f}, Got {installment_amount:.2f}", "ERROR")
                    return False
            else:
                self.log(f"❌ Credit card charge failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Credit card charge error: {str(e)}", "ERROR")
            return False
    
    def test_projections_get(self):
        """Test getting projections for next month"""
        self.log("📊 Testing projections GET endpoint...")
        
        # Test for next month (2025-08)
        next_month = "2025-08"
        
        try:
            response = self.session.get(f"{API_BASE}/projections?month={next_month}")
            
            if response.status_code == 200:
                data = response.json()
                self.log(f"✅ Projections GET successful - Found {len(data)} projections for {next_month}")
                
                # Check if installment projections were created from previous charge
                installment_projections = [p for p in data if p.get('projection_type') == 'installment']
                if installment_projections:
                    self.log(f"   Found {len(installment_projections)} installment projections")
                
                return True
            else:
                self.log(f"❌ Projections GET failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Projections GET error: {str(e)}", "ERROR")
            return False
    
    def test_projections_summary(self):
        """Test projections summary endpoint"""
        self.log("📈 Testing projections summary endpoint...")
        
        next_month = "2025-08"
        
        try:
            response = self.session.get(f"{API_BASE}/projections/summary?month={next_month}")
            
            if response.status_code == 200:
                data = response.json()
                total_projected = data.get('total_projected_expenses', 0)
                fixed_expenses = data.get('fixed_expenses', 0)
                installment_expenses = data.get('installment_expenses', 0)
                
                self.log(f"✅ Projections summary successful")
                self.log(f"   Total projected: R$ {total_projected:.2f}")
                self.log(f"   Fixed expenses: R$ {fixed_expenses:.2f}")
                self.log(f"   Installment expenses: R$ {installment_expenses:.2f}")
                return True
            else:
                self.log(f"❌ Projections summary failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Projections summary error: {str(e)}", "ERROR")
            return False
    
    def test_projections_create(self):
        """Test creating a manual projection"""
        self.log("➕ Testing projections POST endpoint...")
        
        projection_data = {
            "description": "Aluguel",
            "amount": 1500.00,
            "category": "moradia",
            "month": "2025-08",
            "is_fixed": True
        }
        
        try:
            response = self.session.post(f"{API_BASE}/projections", json=projection_data)
            
            if response.status_code == 200:
                data = response.json()
                self.test_projection_id = data.get('projection_id')
                self.log(f"✅ Projection created - ID: {self.test_projection_id}")
                return True
            else:
                self.log(f"❌ Projection creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Projection creation error: {str(e)}", "ERROR")
            return False
    
    def test_projections_update(self):
        """Test updating a projection"""
        if not self.test_projection_id:
            self.log("❌ No test projection available for update test", "ERROR")
            return False
            
        self.log("✏️ Testing projections PATCH endpoint...")
        
        try:
            response = self.session.patch(
                f"{API_BASE}/projections/{self.test_projection_id}?amount=1600&description=Aluguel atualizado"
            )
            
            if response.status_code == 200:
                self.log("✅ Projection updated successfully")
                return True
            else:
                self.log(f"❌ Projection update failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Projection update error: {str(e)}", "ERROR")
            return False
    
    def test_projections_delete(self):
        """Test deleting a projection"""
        if not self.test_projection_id:
            self.log("❌ No test projection available for delete test", "ERROR")
            return False
            
        self.log("🗑️ Testing projections DELETE endpoint...")
        
        try:
            response = self.session.delete(f"{API_BASE}/projections/{self.test_projection_id}")
            
            if response.status_code == 200:
                self.log("✅ Projection deleted successfully")
                return True
            else:
                self.log(f"❌ Projection deletion failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Projection deletion error: {str(e)}", "ERROR")
            return False
    
    def test_ai_insights(self):
        """Test AI insights generation"""
        self.log("🤖 Testing AI insights endpoint...")
        
        try:
            response = self.session.post(f"{API_BASE}/projections/insights?month=2025-08")
            
            if response.status_code == 200:
                data = response.json()
                insights = data.get('insights', '')
                
                if insights and len(insights) > 50:  # Basic check for meaningful response
                    self.log("✅ AI insights generated successfully")
                    self.log(f"   Insights length: {len(insights)} characters")
                    return True
                else:
                    self.log("❌ AI insights response too short or empty", "ERROR")
                    return False
            else:
                self.log(f"❌ AI insights failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ AI insights error: {str(e)}", "ERROR")
            return False
    
    def test_ai_chat(self):
        """Test AI chat integration"""
        self.log("💬 Testing AI chat endpoint...")
        
        chat_data = {
            "content": "Como estão minhas finanças?"
        }
        
        try:
            response = self.session.post(f"{API_BASE}/chat/send", json=chat_data)
            
            if response.status_code == 200:
                data = response.json()
                ai_message = data.get('ai_message', {})
                ai_content = ai_message.get('content', '')
                
                if ai_content and len(ai_content) > 20:  # Basic check for meaningful response
                    self.log("✅ AI chat response generated successfully")
                    self.log(f"   Response length: {len(ai_content)} characters")
                    return True
                else:
                    self.log("❌ AI chat response too short or empty", "ERROR")
                    return False
            else:
                self.log(f"❌ AI chat failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ AI chat error: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        self.log("🚀 Starting Sirius Backend Tests")
        self.log(f"Backend URL: {BACKEND_URL}")
        
        results = {}
        
        # Authentication
        results['login'] = self.login()
        
        if not results['login']:
            self.log("❌ Cannot proceed without authentication", "ERROR")
            return results
        
        # Credit Card Tests
        results['credit_card_creation'] = self.test_credit_card_creation()
        results['credit_card_charge_installments'] = self.test_credit_card_charge_installments()
        
        # Projections Tests
        results['projections_get'] = self.test_projections_get()
        results['projections_summary'] = self.test_projections_summary()
        results['projections_create'] = self.test_projections_create()
        results['projections_update'] = self.test_projections_update()
        results['projections_delete'] = self.test_projections_delete()
        
        # AI Integration Tests
        results['ai_insights'] = self.test_ai_insights()
        results['ai_chat'] = self.test_ai_chat()
        
        # Summary
        self.log("\n" + "="*60)
        self.log("📋 TEST RESULTS SUMMARY")
        self.log("="*60)
        
        passed = 0
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name.replace('_', ' ').title()}: {status}")
            if result:
                passed += 1
        
        self.log(f"\nOverall: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
        
        if passed == total:
            self.log("🎉 All tests passed!")
        else:
            self.log(f"⚠️ {total - passed} test(s) failed")
        
        return results

def main():
    """Main test execution"""
    tester = SiriusBackendTester()
    results = tester.run_all_tests()
    
    # Return exit code based on results
    all_passed = all(results.values())
    return 0 if all_passed else 1

if __name__ == "__main__":
    exit(main())