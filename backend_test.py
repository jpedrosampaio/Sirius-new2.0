#!/usr/bin/env python3
"""
Backend Testing for Finance Categories CRUD Endpoints
Tests the finance categories endpoints as specified in review request.
"""

import requests
import json
import time
import sys
from urllib.parse import urljoin

# Configuration
BASE_URL = "https://api-critical-patch.preview.emergentagent.com/api"
TEST_EMAIL = "testworkout@test.com"
TEST_PASSWORD = "Test123!"

class FinanceCategoriesTester:
    def __init__(self):
        self.session = requests.Session()
        self.base_url = BASE_URL
        self.test_data = {}
        
    def log(self, message):
        """Log test messages with timestamp"""
        print(f"[{time.strftime('%H:%M:%S')}] {message}")
        
    def test_auth_login(self):
        """Test login as testworkout@test.com / Test123!"""
        self.log("🔐 Testing Authentication...")
        
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
            
    def test_get_categories_initial(self):
        """Test GET /api/finance/categories - Should return default categories"""
        self.log("📋 Testing GET Categories (initial)...")
        
        response = self.session.get(f"{self.base_url}/finance/categories")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check response structure
            if "categories" in data and isinstance(data["categories"], list):
                categories = data["categories"]
                default_count = len([c for c in categories if c.get("is_default", False)])
                custom_count = len([c for c in categories if not c.get("is_default", True)])
                
                self.log(f"✅ Categories retrieved: {len(categories)} total ({default_count} defaults, {custom_count} custom)")
                
                # Check for specific default categories
                category_names = [c["name"] for c in categories]
                expected_defaults = ["alimentação", "transporte", "moradia", "saúde", "educação", "lazer"]
                
                found_defaults = [cat for cat in expected_defaults if cat in category_names]
                self.log(f"📝 Default categories found: {', '.join(found_defaults)}")
                
                return True
            else:
                self.log(f"❌ Invalid response structure: {data}")
                return False
        else:
            self.log(f"❌ Get categories failed: {response.status_code} - {response.text}")
            return False
            
    def test_create_custom_category(self):
        """Test POST /api/finance/categories - Create custom category 'roupas'"""
        self.log("🆕 Testing Create Custom Category (roupas)...")
        
        category_data = {
            "name": "roupas"
        }
        
        response = self.session.post(f"{self.base_url}/finance/categories", json=category_data)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check response structure
            if (data.get("success") == True and 
                "category" in data and 
                data["category"].get("name") == "roupas" and 
                data["category"].get("is_default") == False):
                
                self.log("✅ Custom category 'roupas' created successfully")
                self.log(f"📝 Response: {data}")
                return True
            else:
                self.log(f"❌ Invalid response structure: {data}")
                return False
        else:
            self.log(f"❌ Create custom category failed: {response.status_code} - {response.text}")
            return False
            
    def test_get_categories_with_custom(self):
        """Test GET /api/finance/categories - Verify 'roupas' now appears"""
        self.log("👀 Testing GET Categories (with custom)...")
        
        response = self.session.get(f"{self.base_url}/finance/categories")
        
        if response.status_code == 200:
            data = response.json()
            
            if "categories" in data:
                categories = data["categories"]
                category_names = [c["name"] for c in categories]
                
                if "roupas" in category_names:
                    # Find the roupas category
                    roupas_cat = next((c for c in categories if c["name"] == "roupas"), None)
                    if roupas_cat and roupas_cat.get("is_default") == False:
                        self.log("✅ Custom category 'roupas' found in list with is_default=false")
                        return True
                    else:
                        self.log("❌ 'roupas' category found but has wrong is_default value")
                        return False
                else:
                    self.log("❌ Custom category 'roupas' not found in categories list")
                    self.log(f"📝 Available categories: {category_names}")
                    return False
            else:
                self.log(f"❌ Invalid response structure: {data}")
                return False
        else:
            self.log(f"❌ Get categories failed: {response.status_code} - {response.text}")
            return False
            
    def test_create_duplicate_default(self):
        """Test POST /api/finance/categories - Try to create 'alimentação' (should fail 400)"""
        self.log("🚫 Testing Create Duplicate Default Category (alimentação)...")
        
        category_data = {
            "name": "alimentação"
        }
        
        response = self.session.post(f"{self.base_url}/finance/categories", json=category_data)
        
        if response.status_code == 400:
            data = response.json()
            self.log("✅ Correctly rejected duplicate default category with 400 error")
            self.log(f"📝 Error message: {data.get('detail', 'No detail')}")
            return True
        else:
            self.log(f"❌ Expected 400 error for duplicate default, got: {response.status_code} - {response.text}")
            return False
            
    def test_create_duplicate_custom(self):
        """Test POST /api/finance/categories - Try to create 'roupas' again (should fail 400)"""
        self.log("🚫 Testing Create Duplicate Custom Category (roupas)...")
        
        category_data = {
            "name": "roupas"
        }
        
        response = self.session.post(f"{self.base_url}/finance/categories", json=category_data)
        
        if response.status_code == 400:
            data = response.json()
            self.log("✅ Correctly rejected duplicate custom category with 400 error")
            self.log(f"📝 Error message: {data.get('detail', 'No detail')}")
            return True
        else:
            self.log(f"❌ Expected 400 error for duplicate custom, got: {response.status_code} - {response.text}")
            return False
            
    def test_delete_custom_category(self):
        """Test DELETE /api/finance/categories/roupas - Should succeed"""
        self.log("🗑️ Testing Delete Custom Category (roupas)...")
        
        response = self.session.delete(f"{self.base_url}/finance/categories/roupas")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("success") == True:
                self.log("✅ Custom category 'roupas' deleted successfully")
                self.log(f"📝 Response: {data}")
                return True
            else:
                self.log(f"❌ Invalid response structure: {data}")
                return False
        else:
            self.log(f"❌ Delete custom category failed: {response.status_code} - {response.text}")
            return False
            
    def test_delete_default_category(self):
        """Test DELETE /api/finance/categories/alimentação - Should fail 400"""
        self.log("🚫 Testing Delete Default Category (alimentação)...")
        
        response = self.session.delete(f"{self.base_url}/finance/categories/alimentação")
        
        if response.status_code == 400:
            data = response.json()
            self.log("✅ Correctly rejected delete default category with 400 error")
            self.log(f"📝 Error message: {data.get('detail', 'No detail')}")
            return True
        else:
            self.log(f"❌ Expected 400 error for deleting default, got: {response.status_code} - {response.text}")
            return False
            
    def test_get_categories_final(self):
        """Test GET /api/finance/categories - Verify 'roupas' is gone"""
        self.log("🔍 Testing GET Categories (final verification)...")
        
        response = self.session.get(f"{self.base_url}/finance/categories")
        
        if response.status_code == 200:
            data = response.json()
            
            if "categories" in data:
                categories = data["categories"]
                category_names = [c["name"] for c in categories]
                
                if "roupas" not in category_names:
                    self.log("✅ Confirmed 'roupas' category is gone from list")
                    
                    # Count categories again
                    default_count = len([c for c in categories if c.get("is_default", False)])
                    custom_count = len([c for c in categories if not c.get("is_default", True)])
                    self.log(f"📝 Final count: {len(categories)} total ({default_count} defaults, {custom_count} custom)")
                    
                    return True
                else:
                    self.log("❌ 'roupas' category still found in list (should be deleted)")
                    return False
            else:
                self.log(f"❌ Invalid response structure: {data}")
                return False
        else:
            self.log(f"❌ Get categories failed: {response.status_code} - {response.text}")
            return False
            
    def run_all_tests(self):
        """Run all finance categories CRUD tests in sequence"""
        self.log("🚀 Starting Finance Categories CRUD Testing...")
        self.log(f"🔗 Backend URL: {self.base_url}")
        self.log(f"👤 Test User: {TEST_EMAIL}")
        
        tests = [
            ("Login Authentication", self.test_auth_login),
            ("GET Categories (Initial)", self.test_get_categories_initial),
            ("POST Create Custom Category", self.test_create_custom_category),
            ("GET Categories (With Custom)", self.test_get_categories_with_custom),
            ("POST Create Duplicate Default (Error)", self.test_create_duplicate_default),
            ("POST Create Duplicate Custom (Error)", self.test_create_duplicate_custom),
            ("DELETE Custom Category", self.test_delete_custom_category),
            ("DELETE Default Category (Error)", self.test_delete_default_category),
            ("GET Categories (Final Verification)", self.test_get_categories_final),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            self.log(f"\n{'='*60}")
            self.log(f"Testing: {test_name}")
            self.log(f"{'='*60}")
            
            try:
                result = test_func()
                if result:
                    passed += 1
                    self.log(f"✅ {test_name} - PASSED")
                else:
                    self.log(f"❌ {test_name} - FAILED")
            except Exception as e:
                self.log(f"💥 {test_name} - ERROR: {str(e)}")
                
        self.log(f"\n{'='*60}")
        self.log(f"FINAL RESULTS: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        self.log(f"{'='*60}")
        
        return passed, total

if __name__ == "__main__":
    tester = FinanceCategoriesTester()
    passed, total = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if passed == total else 1)