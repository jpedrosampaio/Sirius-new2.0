#!/usr/bin/env python3

import asyncio
import aiohttp
import json
import logging
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Backend URL as specified in the review request
BACKEND_URL = "https://api-critical-patch.preview.emergentagent.com/api"

# Test credentials as specified in the review request
TEST_EMAIL = "testworkout@test.com" 
TEST_PASSWORD = "Test123!"

class BackendTester:
    def __init__(self):
        self.session = None
        self.session_cookie = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def login(self):
        """Login and get session cookie"""
        logger.info("🔑 Logging in with testworkout@test.com...")
        
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        async with self.session.post(f"{BACKEND_URL}/auth/login", json=login_data) as resp:
            if resp.status == 200:
                # Extract session cookie from response
                for name, morsel in resp.cookies.items():
                    if name == "session_token":
                        self.session_cookie = morsel.value
                        logger.info(f"✅ Login successful! Session cookie obtained.")
                        return True
                logger.error("❌ Login response 200 but no session_token cookie found")
                return False
            else:
                error_text = await resp.text()
                logger.error(f"❌ Login failed: {resp.status} - {error_text}")
                return False
    
    async def create_test_image(self):
        """Create a simple test image with text that looks like a receipt"""
        logger.info("🖼️ Creating test JPEG image...")
        
        # Create a simple receipt-like image
        img = Image.new('RGB', (400, 600), color='white')
        draw = ImageDraw.Draw(img)
        
        # Try to use a basic font, fallback to default if not available
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        except:
            font = ImageFont.load_default()
            font_small = font
        
        # Draw receipt content
        y_pos = 20
        draw.text((20, y_pos), "SUPERMERCADO BOM PREÇO", fill='black', font=font)
        y_pos += 30
        draw.text((20, y_pos), "Rua das Flores, 123", fill='black', font=font_small)
        y_pos += 20
        draw.text((20, y_pos), "Tel: (11) 1234-5678", fill='black', font=font_small)
        y_pos += 40
        
        draw.text((20, y_pos), "Data: 10/03/2026 14:30", fill='black', font=font_small)
        y_pos += 30
        
        # Items
        draw.text((20, y_pos), "1x Frango 1kg       R$ 12,50", fill='black', font=font_small)
        y_pos += 20
        draw.text((20, y_pos), "2x Arroz 5kg        R$ 25,00", fill='black', font=font_small)
        y_pos += 20
        draw.text((20, y_pos), "1x Brócolis         R$  3,50", fill='black', font=font_small)
        y_pos += 20
        draw.text((20, y_pos), "3x Tomate           R$  6,00", fill='black', font=font_small)
        y_pos += 30
        
        draw.line([(20, y_pos), (380, y_pos)], fill='black', width=1)
        y_pos += 10
        draw.text((20, y_pos), "TOTAL:              R$ 47,00", fill='black', font=font)
        y_pos += 30
        
        draw.text((20, y_pos), "Pagamento: Cartão de Débito", fill='black', font=font_small)
        y_pos += 20
        draw.text((20, y_pos), "Obrigado pela preferência!", fill='black', font=font_small)
        
        # Save to BytesIO
        img_buffer = BytesIO()
        img.save(img_buffer, format='JPEG', quality=90)
        img_buffer.seek(0)
        
        logger.info("✅ Test JPEG image created successfully")
        return img_buffer.getvalue()
    
    async def test_image_analysis(self):
        """Test POST /api/chat/analyze-image endpoint with multipart form"""
        logger.info("🧪 Testing POST /api/chat/analyze-image endpoint...")
        
        # Create test image
        image_data = await self.create_test_image()
        
        # Prepare multipart form data
        data = aiohttp.FormData()
        data.add_field('image', image_data, filename='receipt.jpg', content_type='image/jpeg')
        data.add_field('description', 'teste de análise')
        
        # Add session cookie
        cookies = {'session_token': self.session_cookie} if self.session_cookie else {}
        
        start_time = time.time()
        
        try:
            timeout = aiohttp.ClientTimeout(total=60)  # 60 seconds as specified
            async with self.session.post(
                f"{BACKEND_URL}/chat/analyze-image", 
                data=data,
                cookies=cookies,
                timeout=timeout
            ) as resp:
                elapsed = time.time() - start_time
                logger.info(f"⏱️ Image analysis took {elapsed:.1f} seconds")
                
                if resp.status == 200:
                    result = await resp.json()
                    logger.info("✅ POST /api/chat/analyze-image - SUCCESS")
                    logger.info(f"📝 Response keys: {list(result.keys())}")
                    
                    # Check expected response structure
                    if 'user_message' in result and 'ai_message' in result and 'transactions_created' in result:
                        logger.info("✅ Response contains expected fields: user_message, ai_message, transactions_created")
                        
                        ai_message = result.get('ai_message', {})
                        transactions = result.get('transactions_created', [])
                        
                        logger.info(f"🤖 AI Response length: {len(ai_message.get('content', ''))}")
                        logger.info(f"💰 Transactions created: {len(transactions)}")
                        
                        if transactions:
                            logger.info("📊 Transaction details:")
                            for i, t in enumerate(transactions, 1):
                                logger.info(f"  {i}. R$ {t.get('amount', 0):.2f} - {t.get('category', 'N/A')} - {t.get('description', 'N/A')}")
                        
                        return True
                    else:
                        logger.error(f"❌ Missing expected response fields. Got: {list(result.keys())}")
                        return False
                else:
                    error_text = await resp.text()
                    logger.error(f"❌ POST /api/chat/analyze-image failed: {resp.status} - {error_text}")
                    return False
                    
        except asyncio.TimeoutError:
            logger.error("❌ POST /api/chat/analyze-image - TIMEOUT (60s exceeded)")
            return False
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"❌ POST /api/chat/analyze-image error after {elapsed:.1f}s: {str(e)}")
            return False
    
    async def test_recipe_suggest(self):
        """Test POST /api/nutrition/recipes/suggest endpoint with JSON body"""
        logger.info("🧪 Testing POST /api/nutrition/recipes/suggest endpoint...")
        
        # Test data as specified in the review request
        recipe_data = {
            "diet_type": "balanceada",
            "meal_type": "almoço", 
            "available_ingredients": ["frango", "arroz", "brócolis"],
            "restrictions": [],
            "cuisine": "brasileira",
            "max_prep_time_minutes": 45
        }
        
        # Add session cookie
        cookies = {'session_token': self.session_cookie} if self.session_cookie else {}
        
        headers = {'Content-Type': 'application/json'}
        start_time = time.time()
        
        try:
            timeout = aiohttp.ClientTimeout(total=60)  # 60 seconds as specified
            async with self.session.post(
                f"{BACKEND_URL}/nutrition/recipes/suggest",
                json=recipe_data,
                cookies=cookies,
                headers=headers,
                timeout=timeout
            ) as resp:
                elapsed = time.time() - start_time
                logger.info(f"⏱️ Recipe suggestion took {elapsed:.1f} seconds")
                
                if resp.status == 200:
                    result = await resp.json()
                    logger.info("✅ POST /api/nutrition/recipes/suggest - SUCCESS")
                    logger.info(f"📝 Response keys: {list(result.keys())}")
                    
                    # Check expected response structure for recipe data
                    required_fields = ['name', 'ingredients', 'instructions', 'calories_per_serving']
                    has_required = all(field in result for field in required_fields)
                    
                    if has_required:
                        logger.info("✅ Response contains expected recipe fields")
                        logger.info(f"🍽️ Recipe Name: {result.get('name', 'N/A')}")
                        logger.info(f"🥘 Ingredients count: {len(result.get('ingredients', []))}")
                        logger.info(f"📋 Instructions count: {len(result.get('instructions', []))}")
                        logger.info(f"🔥 Calories per serving: {result.get('calories_per_serving', 'N/A')}")
                        logger.info(f"⏱️ Prep time: {result.get('prep_time_minutes', 'N/A')} min")
                        logger.info(f"🍳 Cook time: {result.get('cook_time_minutes', 'N/A')} min")
                        
                        return True
                    else:
                        missing_fields = [f for f in required_fields if f not in result]
                        logger.error(f"❌ Missing required recipe fields: {missing_fields}")
                        logger.error(f"Available fields: {list(result.keys())}")
                        return False
                else:
                    error_text = await resp.text()
                    logger.error(f"❌ POST /api/nutrition/recipes/suggest failed: {resp.status} - {error_text}")
                    return False
                    
        except asyncio.TimeoutError:
            logger.error("❌ POST /api/nutrition/recipes/suggest - TIMEOUT (60s exceeded)")
            return False
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"❌ POST /api/nutrition/recipes/suggest error after {elapsed:.1f}s: {str(e)}")
            return False

async def main():
    """Run all backend tests"""
    logger.info("🚀 Starting Backend P0 Fixes Testing")
    logger.info(f"🔗 Backend URL: {BACKEND_URL}")
    logger.info(f"👤 Test User: {TEST_EMAIL}")
    logger.info("=" * 60)
    
    results = {
        'login': False,
        'image_analysis': False,
        'recipe_suggest': False
    }
    
    async with BackendTester() as tester:
        # Step 1: Login
        results['login'] = await tester.login()
        if not results['login']:
            logger.error("❌ Cannot continue without successful login")
            return results
            
        logger.info("=" * 60)
        
        # Step 2: Test image analysis endpoint (previously failing)
        results['image_analysis'] = await tester.test_image_analysis()
        
        logger.info("=" * 60)
        
        # Step 3: Test recipe suggest endpoint (previously failing) 
        results['recipe_suggest'] = await tester.test_recipe_suggest()
    
    logger.info("=" * 60)
    logger.info("📊 FINAL TEST RESULTS:")
    logger.info(f"🔑 Authentication: {'✅ PASS' if results['login'] else '❌ FAIL'}")
    logger.info(f"🖼️ Image Analysis Fix: {'✅ PASS' if results['image_analysis'] else '❌ FAIL'}")
    logger.info(f"🍽️ Recipe Suggest Fix: {'✅ PASS' if results['recipe_suggest'] else '❌ FAIL'}")
    
    passed_count = sum(1 for v in results.values() if v)
    total_count = len(results)
    
    logger.info(f"📈 SUCCESS RATE: {passed_count}/{total_count} ({(passed_count/total_count)*100:.1f}%)")
    
    if passed_count == total_count:
        logger.info("🎉 ALL P0 FIXES WORKING CORRECTLY!")
    else:
        logger.info("⚠️ Some P0 fixes still have issues - see details above")
    
    return results

if __name__ == "__main__":
    asyncio.run(main())