#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime

# Configuration
API_URL = "https://dual-mode-training.preview.emergentagent.com/api"
TEST_USER = {
    "email": "demo@test.com",
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
    
    def test_telegram_status(self):
        """Test GET /api/telegram/status endpoint"""
        print("\n📱 Testing GET /api/telegram/status...")
        
        try:
            start_time = time.time()
            response = self.session.get(
                f"{API_URL}/telegram/status",
                timeout=10
            )
            duration = time.time() - start_time
            
            print(f"Response time: {duration:.2f}s")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ['linked', 'bot_configured', 'bot_username']
                
                missing_fields = []
                for field in required_fields:
                    if field not in data:
                        missing_fields.append(field)
                
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    return False
                
                # Validate data types
                if not isinstance(data['linked'], bool):
                    print(f"❌ Invalid linked field: {data['linked']} (should be boolean)")
                    return False
                    
                if not isinstance(data['bot_configured'], bool):
                    print(f"❌ Invalid bot_configured field: {data['bot_configured']} (should be boolean)")
                    return False
                
                # bot_configured must be True as specified in review request
                if not data['bot_configured']:
                    print(f"❌ bot_configured is False, should be True as per requirements")
                    return False
                
                if 'bot_username' in data and data['bot_username'] and not isinstance(data['bot_username'], str):
                    print(f"❌ Invalid bot_username field: {data['bot_username']} (should be string or null)")
                    return False
                
                print("✅ Telegram status endpoint working correctly:")
                print(f"   Linked: {data['linked']}")
                print(f"   Bot configured: {data['bot_configured']}")
                print(f"   Bot username: {data.get('bot_username', 'N/A')}")
                
                return True
                
            else:
                print(f"❌ Telegram status endpoint failed: {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return False
                
        except Exception as e:
            print(f"❌ Telegram status endpoint error: {str(e)}")
            return False
    
    def test_telegram_link(self):
        """Test POST /api/telegram/link endpoint"""
        print("\n🔗 Testing POST /api/telegram/link...")
        
        try:
            start_time = time.time()
            response = self.session.post(
                f"{API_URL}/telegram/link",
                timeout=10
            )
            duration = time.time() - start_time
            
            print(f"Response time: {duration:.2f}s")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ['code', 'expires_in_minutes', 'bot_username', 'bot_link']
                
                missing_fields = []
                for field in required_fields:
                    if field not in data:
                        missing_fields.append(field)
                
                if missing_fields:
                    print(f"❌ Missing required fields: {missing_fields}")
                    return False
                
                # Validate data types and values
                if not isinstance(data['code'], str) or not data['code']:
                    print(f"❌ Invalid code field: {data['code']} (should be non-empty string)")
                    return False
                    
                if not isinstance(data['expires_in_minutes'], (int, float)) or data['expires_in_minutes'] != 10:
                    print(f"❌ Invalid expires_in_minutes field: {data['expires_in_minutes']} (should be 10)")
                    return False
                
                if not isinstance(data['bot_username'], str):
                    print(f"❌ Invalid bot_username field: {data['bot_username']} (should be string)")
                    return False
                
                if not isinstance(data['bot_link'], str) or not data['bot_link'].startswith('https://t.me/'):
                    print(f"❌ Invalid bot_link field: {data['bot_link']} (should be https://t.me/ URL)")
                    return False
                
                print("✅ Telegram link endpoint working correctly:")
                print(f"   Code: {data['code']}")
                print(f"   Expires in: {data['expires_in_minutes']} minutes")
                print(f"   Bot username: {data['bot_username']}")
                print(f"   Bot link: {data['bot_link']}")
                
                return True
                
            else:
                print(f"❌ Telegram link endpoint failed: {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return False
                
        except Exception as e:
            print(f"❌ Telegram link endpoint error: {str(e)}")
            return False
    
    def test_telegram_unlink(self):
        """Test POST /api/telegram/unlink endpoint"""
        print("\n🔓 Testing POST /api/telegram/unlink...")
        
        try:
            start_time = time.time()
            response = self.session.post(
                f"{API_URL}/telegram/unlink",
                timeout=10
            )
            duration = time.time() - start_time
            
            print(f"Response time: {duration:.2f}s")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                if 'success' not in data:
                    print(f"❌ Missing required field: success")
                    return False
                
                # Validate data type
                if not isinstance(data['success'], bool) or not data['success']:
                    print(f"❌ Invalid success field: {data['success']} (should be true)")
                    return False
                
                print("✅ Telegram unlink endpoint working correctly:")
                print(f"   Success: {data['success']}")
                
                return True
                
            else:
                print(f"❌ Telegram unlink endpoint failed: {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return False
                
        except Exception as e:
            print(f"❌ Telegram unlink endpoint error: {str(e)}")
            return False
    
    def test_motivational_quote(self):
        """Test GET /api/motivational-quote endpoint"""
        print("\n✨ Testing GET /api/motivational-quote...")
        
        try:
            start_time = time.time()
            response = self.session.get(
                f"{API_URL}/motivational-quote",
                timeout=30  # Timeout for AI generation
            )
            duration = time.time() - start_time
            
            print(f"Response time: {duration:.2f}s")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if quote field exists
                if 'quote' not in data:
                    print(f"❌ Missing required field: quote")
                    return False
                
                quote_text = data.get('quote', '')
                
                # Validate quote is a string
                if not isinstance(quote_text, str):
                    print(f"❌ Invalid quote field: should be string")
                    return False
                
                # Check that quote does NOT contain "503" or "UNAVAILABLE" as per requirements
                if "503" in quote_text or "UNAVAILABLE" in quote_text.upper():
                    print(f"❌ Quote contains '503' or 'UNAVAILABLE': {quote_text[:100]}...")
                    return False
                
                # Check that quote is not empty and looks motivational
                if not quote_text.strip():
                    print(f"❌ Quote is empty")
                    return False
                
                # Basic length check (should be at least 10 characters for a meaningful quote)
                if len(quote_text.strip()) < 10:
                    print(f"❌ Quote too short (less than 10 characters): {quote_text}")
                    return False
                
                print("✅ Motivational quote endpoint working correctly:")
                print(f"   Quote: {quote_text[:100]}{'...' if len(quote_text) > 100 else ''}")
                print(f"   Quote length: {len(quote_text)} characters")
                
                # Print additional fields if present
                if 'motivational_date' in data:
                    print(f"   Date: {data['motivational_date']}")
                if 'cached' in data:
                    print(f"   Cached: {data['cached']}")
                
                return True
                
            else:
                print(f"❌ Motivational quote endpoint failed: {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return False
                
        except Exception as e:
            print(f"❌ Motivational quote endpoint error: {str(e)}")
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
        
        # Test results for NEW endpoints specified in review request
        results = {
            "telegram_status": self.test_telegram_status(),
            "telegram_link": self.test_telegram_link(),
            "telegram_unlink": self.test_telegram_unlink(),
            "motivational_quote": self.test_motivational_quote()
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