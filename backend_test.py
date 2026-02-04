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
BACKEND_URL = os.getenv('REACT_APP_BACKEND_URL', 'https://ai-tool-switch.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test credentials for Gemini integration testing
TEST_EMAIL = "testegemini@test.com"
TEST_PASSWORD = "Test123!"
TEST_NAME = "Teste Gemini"

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
        
    def register_test_user(self):
        """Register test user if it doesn't exist"""
        self.log("📝 Registering test user...")
        
        register_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        }
        
        try:
            response = self.session.post(f"{API_BASE}/auth/register", json=register_data)
            
            if response.status_code == 200:
                data = response.json()
                self.session_token = data.get('session_token')
                self.user_id = data.get('user', {}).get('user_id')
                
                # Set session cookie
                self.session.cookies.set('session_token', self.session_token)
                
                self.log(f"✅ User registered successfully - User ID: {self.user_id}")
                return True
            elif response.status_code == 400 and "already registered" in response.text:
                self.log("ℹ️ User already exists, proceeding to login...")
                return self.login()
            else:
                self.log(f"❌ Registration failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Registration error: {str(e)}", "ERROR")
            return False

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
            elif response.status_code == 401:
                # Try to register first
                self.log("ℹ️ Login failed, trying to register user...")
                return self.register_test_user()
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
                else:
                    # Check current month and next few months to see where projections were created
                    self.log("   No installment projections found for 2025-08, checking other months...")
                    for month_offset in [0, 1, 2, 3]:
                        check_date = datetime.now() + timedelta(days=30 * month_offset)
                        check_month = check_date.strftime("%Y-%m")
                        check_response = self.session.get(f"{API_BASE}/projections?month={check_month}")
                        if check_response.status_code == 200:
                            check_data = check_response.json()
                            installments = [p for p in check_data if p.get('projection_type') == 'installment']
                            if installments:
                                self.log(f"   Found {len(installments)} installment projections in {check_month}")
                
                return True
            else:
                self.log(f"❌ Projections GET failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Projections GET error: {str(e)}", "ERROR")
            return False

    def test_installment_projections_verification(self):
        """Verify that installment projections are created correctly"""
        self.log("🔍 Verifying installment projections creation...")
        
        # Create a new charge to test installment projections
        if not self.test_card_id:
            self.log("❌ No test card available", "ERROR")
            return False
            
        charge_data = {
            "amount": 600.00,
            "description": "Teste verificação parcelas",
            "category": "outros",
            "payment_type": "parcelado",
            "installments": 3
        }
        
        try:
            # Make the charge
            response = self.session.post(f"{API_BASE}/credit-cards/{self.test_card_id}/charge", json=charge_data)
            
            if response.status_code != 200:
                self.log(f"❌ Failed to create test charge: {response.status_code}", "ERROR")
                return False
            
            # Check projections for the next 3 months
            current_date = datetime.now()
            installments_found = 0
            
            for month_offset in range(1, 4):  # Check next 3 months
                future_date = current_date + timedelta(days=30 * month_offset)
                check_month = future_date.strftime("%Y-%m")
                
                proj_response = self.session.get(f"{API_BASE}/projections?month={check_month}")
                if proj_response.status_code == 200:
                    projections = proj_response.json()
                    installment_projs = [p for p in projections if 
                                       p.get('projection_type') == 'installment' and 
                                       'Teste verificação parcelas' in p.get('description', '')]
                    
                    if installment_projs:
                        installments_found += len(installment_projs)
                        self.log(f"   Found installment projection in {check_month}: R$ {installment_projs[0]['amount']:.2f}")
            
            if installments_found >= 2:  # Should find at least 2 future installments (installments 2 and 3)
                self.log(f"✅ Installment projections verified - Found {installments_found} future installments")
                return True
            else:
                self.log(f"❌ Expected at least 2 installment projections, found {installments_found}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Installment verification error: {str(e)}", "ERROR")
            return False
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
                else:
                    # Check current month and next few months to see where projections were created
                    self.log("   No installment projections found for 2025-08, checking other months...")
                    for month_offset in [0, 1, 2, 3]:
                        check_date = datetime.now() + timedelta(days=30 * month_offset)
                        check_month = check_date.strftime("%Y-%m")
                        check_response = self.session.get(f"{API_BASE}/projections?month={check_month}")
                        if check_response.status_code == 200:
                            check_data = check_response.json()
                            installments = [p for p in check_data if p.get('projection_type') == 'installment']
                            if installments:
                                self.log(f"   Found {len(installments)} installment projections in {check_month}")
                
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

    def test_chat_register_income(self):
        """Test chat functionality for registering income"""
        self.log("💰 Testing chat - register income...")
        
        # Test income registration via chat
        income_messages = [
            "Recebi 1000 no cartão pré-pago",
            "Ganhei 500 de freelance"
        ]
        
        success_count = 0
        
        for message in income_messages:
            try:
                chat_data = {"content": message}
                response = self.session.post(f"{API_BASE}/chat/send", json=chat_data)
                
                if response.status_code == 200:
                    data = response.json()
                    ai_message = data.get('ai_message', {})
                    transaction_data = ai_message.get('transaction_data')
                    
                    if transaction_data and transaction_data.get('type') == 'income':
                        self.log(f"✅ Income registered: {message} -> R$ {transaction_data.get('amount'):.2f}")
                        success_count += 1
                    else:
                        self.log(f"❌ No transaction data found for: {message}", "ERROR")
                else:
                    self.log(f"❌ Chat income failed: {response.status_code} - {response.text}", "ERROR")
                    
            except Exception as e:
                self.log(f"❌ Chat income error: {str(e)}", "ERROR")
        
        return success_count == len(income_messages)

    def test_chat_register_expense(self):
        """Test chat functionality for registering expenses"""
        self.log("🛒 Testing chat - register expense...")
        
        # Test expense registration via chat
        expense_messages = [
            "Gastei 150 no supermercado",
            "Paguei 200 de luz"
        ]
        
        success_count = 0
        
        for message in expense_messages:
            try:
                chat_data = {"content": message}
                response = self.session.post(f"{API_BASE}/chat/send", json=chat_data)
                
                if response.status_code == 200:
                    data = response.json()
                    ai_message = data.get('ai_message', {})
                    transaction_data = ai_message.get('transaction_data')
                    
                    if transaction_data and transaction_data.get('type') == 'expense':
                        self.log(f"✅ Expense registered: {message} -> R$ {transaction_data.get('amount'):.2f}")
                        success_count += 1
                    else:
                        self.log(f"❌ No transaction data found for: {message}", "ERROR")
                else:
                    self.log(f"❌ Chat expense failed: {response.status_code} - {response.text}", "ERROR")
                    
            except Exception as e:
                self.log(f"❌ Chat expense error: {str(e)}", "ERROR")
        
        return success_count == len(expense_messages)

    def test_chat_reports(self):
        """Test chat functionality for financial reports"""
        self.log("📊 Testing chat - financial reports...")
        
        chat_data = {"content": "Como estão minhas finanças?"}
        
        try:
            response = self.session.post(f"{API_BASE}/chat/send", json=chat_data)
            
            if response.status_code == 200:
                data = response.json()
                ai_message = data.get('ai_message', {})
                ai_content = ai_message.get('content', '')
                
                # Check if response contains financial report keywords
                report_keywords = ['receitas', 'despesas', 'saldo', 'R$']
                has_report_content = any(keyword.lower() in ai_content.lower() for keyword in report_keywords)
                
                if has_report_content and len(ai_content) > 100:
                    self.log("✅ Financial report generated successfully")
                    self.log(f"   Report length: {len(ai_content)} characters")
                    return True
                else:
                    self.log("❌ Financial report missing expected content", "ERROR")
                    return False
            else:
                self.log(f"❌ Chat reports failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Chat reports error: {str(e)}", "ERROR")
            return False

    def test_chat_help(self):
        """Test chat help functionality"""
        self.log("❓ Testing chat - help command...")
        
        chat_data = {"content": "ajuda"}
        
        try:
            response = self.session.post(f"{API_BASE}/chat/send", json=chat_data)
            
            if response.status_code == 200:
                data = response.json()
                ai_message = data.get('ai_message', {})
                ai_content = ai_message.get('content', '')
                
                # Check if response contains help keywords
                help_keywords = ['comandos', 'funcionalidades', 'registrar', 'relatórios', 'orçamento']
                has_help_content = any(keyword.lower() in ai_content.lower() for keyword in help_keywords)
                
                if has_help_content and len(ai_content) > 200:
                    self.log("✅ Help message generated successfully")
                    self.log(f"   Help length: {len(ai_content)} characters")
                    return True
                else:
                    self.log("❌ Help message missing expected content", "ERROR")
                    return False
            else:
                self.log(f"❌ Chat help failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Chat help error: {str(e)}", "ERROR")
            return False

    def test_chat_create_budget(self):
        """Test chat functionality for creating budgets"""
        self.log("💼 Testing chat - create budget...")
        
        chat_data = {"content": "Criar orçamento de 500 para alimentação"}
        
        try:
            response = self.session.post(f"{API_BASE}/chat/send", json=chat_data)
            
            if response.status_code == 200:
                data = response.json()
                ai_message = data.get('ai_message', {})
                ai_content = ai_message.get('content', '')
                
                # Check if response indicates budget creation
                budget_keywords = ['orçamento', 'criado', 'alimentação', '500']
                has_budget_content = any(keyword.lower() in ai_content.lower() for keyword in budget_keywords)
                
                if has_budget_content:
                    self.log("✅ Budget creation via chat successful")
                    return True
                else:
                    self.log("❌ Budget creation response missing expected content", "ERROR")
                    return False
            else:
                self.log(f"❌ Chat budget creation failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Chat budget creation error: {str(e)}", "ERROR")
            return False

    def test_habit_toggle_xp(self):
        """Test habit completion/uncompletion with XP changes"""
        self.log("🎯 Testing habit toggle with XP...")
        
        # First create a habit
        habit_data = {
            "name": "Test Habit",
            "color": "#007AFF"
        }
        
        try:
            # Create habit
            response = self.session.post(f"{API_BASE}/habits", json=habit_data)
            if response.status_code != 200:
                self.log(f"❌ Failed to create test habit: {response.status_code}", "ERROR")
                return False
            
            habit_id = response.json().get('habit_id')
            test_date = "2025-07-03"
            
            # Get initial XP
            me_response = self.session.get(f"{API_BASE}/auth/me")
            if me_response.status_code != 200:
                self.log("❌ Failed to get user info", "ERROR")
                return False
            
            initial_xp = me_response.json().get('xp', 0)
            
            # Complete habit (should add XP)
            complete_response = self.session.post(f"{API_BASE}/habits/{habit_id}/complete?date={test_date}")
            if complete_response.status_code != 200:
                self.log(f"❌ Failed to complete habit: {complete_response.status_code}", "ERROR")
                return False
            
            complete_data = complete_response.json()
            xp_earned_complete = complete_data.get('xp_earned', 0)
            
            if xp_earned_complete != 15:
                self.log(f"❌ Expected 15 XP for completion, got {xp_earned_complete}", "ERROR")
                return False
            
            # Uncomplete habit (should deduct XP)
            uncomplete_response = self.session.post(f"{API_BASE}/habits/{habit_id}/complete?date={test_date}")
            if uncomplete_response.status_code != 200:
                self.log(f"❌ Failed to uncomplete habit: {uncomplete_response.status_code}", "ERROR")
                return False
            
            uncomplete_data = uncomplete_response.json()
            xp_earned_uncomplete = uncomplete_data.get('xp_earned', 0)
            
            if xp_earned_uncomplete != -15:
                self.log(f"❌ Expected -15 XP for uncompletion, got {xp_earned_uncomplete}", "ERROR")
                return False
            
            self.log("✅ Habit toggle with XP working correctly")
            self.log(f"   Complete: +{xp_earned_complete} XP, Uncomplete: {xp_earned_uncomplete} XP")
            return True
            
        except Exception as e:
            self.log(f"❌ Habit toggle XP error: {str(e)}", "ERROR")
            return False

    def test_task_toggle_xp(self):
        """Test task completion/uncompletion with XP changes"""
        self.log("📋 Testing task toggle with XP...")
        
        # First create a task
        task_data = {
            "title": "Test Task",
            "date": "2025-07-03",
            "priority": "medium",
            "recurrence": "daily"
        }
        
        try:
            # Create task
            response = self.session.post(f"{API_BASE}/tasks", json=task_data)
            if response.status_code != 200:
                self.log(f"❌ Failed to create test task: {response.status_code}", "ERROR")
                return False
            
            task_id = response.json().get('task_id')
            test_date = "2025-07-03"
            
            # Get initial XP
            me_response = self.session.get(f"{API_BASE}/auth/me")
            if me_response.status_code != 200:
                self.log("❌ Failed to get user info", "ERROR")
                return False
            
            initial_xp = me_response.json().get('xp', 0)
            
            # Complete task (should add XP)
            complete_response = self.session.patch(f"{API_BASE}/tasks/{task_id}?completed=true&date={test_date}")
            if complete_response.status_code != 200:
                self.log(f"❌ Failed to complete task: {complete_response.status_code}", "ERROR")
                return False
            
            complete_data = complete_response.json()
            xp_earned_complete = complete_data.get('xp_earned', 0)
            
            if xp_earned_complete != 20:  # Medium priority = 20 XP
                self.log(f"❌ Expected 20 XP for completion, got {xp_earned_complete}", "ERROR")
                return False
            
            # Uncomplete task (should deduct XP)
            uncomplete_response = self.session.patch(f"{API_BASE}/tasks/{task_id}?completed=false&date={test_date}")
            if uncomplete_response.status_code != 200:
                self.log(f"❌ Failed to uncomplete task: {uncomplete_response.status_code}", "ERROR")
                return False
            
            uncomplete_data = uncomplete_response.json()
            xp_earned_uncomplete = uncomplete_data.get('xp_earned', 0)
            
            if xp_earned_uncomplete != -20:
                self.log(f"❌ Expected -20 XP for uncompletion, got {xp_earned_uncomplete}", "ERROR")
                return False
            
            self.log("✅ Task toggle with XP working correctly")
            self.log(f"   Complete: +{xp_earned_complete} XP, Uncomplete: {xp_earned_uncomplete} XP")
            return True
            
        except Exception as e:
            self.log(f"❌ Task toggle XP error: {str(e)}", "ERROR")
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
        
        # Enhanced Chat Functionality Tests
        results['chat_register_income'] = self.test_chat_register_income()
        results['chat_register_expense'] = self.test_chat_register_expense()
        results['chat_reports'] = self.test_chat_reports()
        results['chat_help'] = self.test_chat_help()
        results['chat_create_budget'] = self.test_chat_create_budget()
        
        # XP Toggle Tests
        results['habit_toggle_xp'] = self.test_habit_toggle_xp()
        results['task_toggle_xp'] = self.test_task_toggle_xp()
        
        # Credit Card Tests
        results['credit_card_creation'] = self.test_credit_card_creation()
        results['credit_card_charge_installments'] = self.test_credit_card_charge_installments()
        
        # Projections Tests
        results['projections_get'] = self.test_projections_get()
        results['installment_projections_verification'] = self.test_installment_projections_verification()
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