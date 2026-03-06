#!/usr/bin/env python3
"""
Backend testing for Edital Import endpoints - Sirius Study App
Testing the new endpoints for importing edital PDFs and generating study programs with AI.
"""

import requests
import json
import tempfile
import os
from io import BytesIO

# Backend URL from frontend .env
BACKEND_URL = "https://exam-prep-ai-46.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def register_and_login():
    """Register and login a test user for edital import testing"""
    print("🔐 Setting up authentication for edital import tests...")
    
    # User credentials as specified in review request
    user_data = {
        "email": "testedital@test.com",
        "password": "Test123!",
        "name": "Test Edital"
    }
    
    # Register user
    try:
        register_response = requests.post(f"{API_BASE}/auth/register", json=user_data)
        print(f"   📝 Register response: {register_response.status_code}")
        if register_response.status_code == 409 or (register_response.status_code == 400 and "already registered" in register_response.text.lower()):
            print("   ℹ️  User already exists, proceeding to login...")
        elif register_response.status_code not in [200, 201]:
            print(f"   ⚠️  Register failed but continuing to login: {register_response.text}")
    except Exception as e:
        print(f"   ⚠️  Register error but continuing to login: {e}")
    
    # Login
    try:
        login_data = {
            "email": user_data["email"], 
            "password": user_data["password"]
        }
        login_response = requests.post(f"{API_BASE}/auth/login", json=login_data)
        print(f"   🔑 Login response: {login_response.status_code}")
        
        if login_response.status_code == 200:
            session_cookie = login_response.cookies.get('session_token')
            if session_cookie:
                print("   ✅ Authentication successful")
                return session_cookie
            else:
                print("   ❌ No session cookie received")
                return None
        else:
            print(f"   ❌ Login failed: {login_response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Login error: {e}")
        return None

def test_get_study_areas(session_token):
    """Test GET /api/study/areas endpoint"""
    print("\n📚 Testing GET /api/study/areas...")
    
    try:
        cookies = {'session_token': session_token}
        response = requests.get(f"{API_BASE}/study/areas", cookies=cookies)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            areas = response.json()
            print(f"   ✅ Retrieved {len(areas)} study areas")
            
            if areas:
                # Find "Concursos" area as mentioned in the review request
                concursos_area = None
                for area in areas:
                    print(f"   📖 Area: {area.get('name', 'N/A')} (ID: {area.get('area_id', 'N/A')})")
                    if "concursos" in area.get('name', '').lower():
                        concursos_area = area
                
                if concursos_area:
                    print(f"   🎯 Found 'Concursos' area: {concursos_area['area_id']}")
                    return concursos_area['area_id']
                else:
                    # Return first area for testing
                    print(f"   🎯 Using first area for testing: {areas[0]['area_id']}")
                    return areas[0]['area_id']
            else:
                print("   ⚠️  No areas found")
                return None
        else:
            print(f"   ❌ Failed to get study areas: {response.text}")
            return None
            
    except Exception as e:
        print(f"   ❌ Error testing study areas: {e}")
        return None

def create_test_pdf():
    """Create a simple test PDF with some text content"""
    try:
        # Create a simple PDF using reportlab if available, otherwise create a fake PDF structure
        try:
            from reportlab.pdfgen import canvas
            from reportlab.lib.pagesizes import letter
            
            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=letter)
            p.drawString(100, 750, "EDITAL DE CONCURSO PÚBLICO")
            p.drawString(100, 720, "TRIBUNAL REGIONAL FEDERAL")
            p.drawString(100, 690, "CARGO: Analista Judiciário")
            p.drawString(100, 660, "DISCIPLINAS:")
            p.drawString(120, 630, "• Direito Constitucional (20 questões)")
            p.drawString(120, 600, "• Direito Civil (15 questões)")
            p.drawString(120, 570, "• Direito Penal (10 questões)")
            p.drawString(120, 540, "• Português (15 questões)")
            p.drawString(120, 510, "• Informática (10 questões)")
            p.showPage()
            p.save()
            buffer.seek(0)
            return buffer.getvalue(), "test_edital.pdf"
            
        except ImportError:
            # Fallback: create minimal PDF structure
            pdf_content = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
100 700 Td
(EDITAL DE CONCURSO PUBLICO) Tj
0 -30 Td
(TRIBUNAL REGIONAL FEDERAL) Tj
0 -30 Td
(CARGO: Analista Judiciario) Tj
0 -30 Td
(DISCIPLINAS:) Tj
0 -20 Td
(Direito Constitucional - 20 questoes) Tj
0 -20 Td
(Direito Civil - 15 questoes) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000100 00000 n 
0000000179 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
429
%%EOF"""
            return pdf_content, "test_edital.pdf"
            
    except Exception as e:
        print(f"   ⚠️  Error creating test PDF: {e}")
        return None, None

def test_import_edital_validations(session_token, area_id):
    """Test POST /api/study/programs/import-edital endpoint validation"""
    print("\n📄 Testing POST /api/study/programs/import-edital validation...")
    
    cookies = {'session_token': session_token}
    
    # Test 1: Missing file
    print("   🧪 Test 1: Request without file")
    try:
        data = {'area_id': area_id}
        response = requests.post(f"{API_BASE}/study/programs/import-edital", data=data, cookies=cookies)
        print(f"   Status: {response.status_code}")
        if response.status_code == 422:
            print("   ✅ Correctly rejected request without file")
        else:
            print(f"   ⚠️  Expected 422, got {response.status_code}: {response.text}")
    except Exception as e:
        print(f"   ❌ Error in test 1: {e}")
    
    # Test 2: Non-PDF file
    print("   🧪 Test 2: Non-PDF file")
    try:
        files = {'file': ('test.txt', 'This is not a PDF', 'text/plain')}
        data = {'area_id': area_id}
        response = requests.post(f"{API_BASE}/study/programs/import-edital", files=files, data=data, cookies=cookies)
        print(f"   Status: {response.status_code}")
        if response.status_code == 400 and "Apenas arquivos PDF são aceitos" in response.text:
            print("   ✅ Correctly rejected non-PDF file with expected error message")
        else:
            print(f"   ⚠️  Expected 400 with PDF error, got {response.status_code}: {response.text}")
    except Exception as e:
        print(f"   ❌ Error in test 2: {e}")
    
    # Test 3: Valid PDF file (endpoint accessibility test)
    print("   🧪 Test 3: Valid PDF file (accessibility test)")
    try:
        pdf_content, pdf_filename = create_test_pdf()
        if pdf_content:
            files = {'file': (pdf_filename, pdf_content, 'application/pdf')}
            data = {
                'area_id': area_id,
                'target_date': '2025-06-15',
                'hours_per_day': '4',
                'days_per_week': '5'
            }
            response = requests.post(f"{API_BASE}/study/programs/import-edital", files=files, data=data, cookies=cookies)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print("   ✅ Endpoint accessible and processed PDF successfully")
                print(f"   📋 Program created: {result.get('program', {}).get('name', 'N/A')}")
                program_id = result.get('program', {}).get('program_id')
                if program_id:
                    print(f"   🆔 Program ID: {program_id}")
                    return program_id
                else:
                    print("   ⚠️  No program_id in response")
                    return None
            elif response.status_code == 500:
                error_text = response.text
                if "IA indisponível" in error_text or "Gemini" in error_text:
                    print("   ⚠️  AI service unavailable (Google Gemini issue)")
                else:
                    print(f"   ❌ Server error: {error_text}")
                return None
            else:
                print(f"   ⚠️  Unexpected response {response.status_code}: {response.text}")
                return None
        else:
            print("   ❌ Could not create test PDF")
            return None
    except Exception as e:
        print(f"   ❌ Error in test 3: {e}")
        return None

def test_get_cronograma(session_token, program_id=None):
    """Test GET /api/study/programs/{program_id}/cronograma endpoint"""
    print("\n📅 Testing GET /api/study/programs/{program_id}/cronograma...")
    
    cookies = {'session_token': session_token}
    
    # Test 1: Non-existent program_id
    print("   🧪 Test 1: Non-existent program_id")
    try:
        fake_id = "nonexistent_program_123"
        response = requests.get(f"{API_BASE}/study/programs/{fake_id}/cronograma", cookies=cookies)
        print(f"   Status: {response.status_code}")
        if response.status_code == 404:
            print("   ✅ Correctly returned 404 for non-existent program")
        else:
            print(f"   ⚠️  Expected 404, got {response.status_code}: {response.text}")
    except Exception as e:
        print(f"   ❌ Error in test 1: {e}")
    
    # Test 2: Valid program_id (if available)
    if program_id:
        print(f"   🧪 Test 2: Valid program_id ({program_id})")
        try:
            response = requests.get(f"{API_BASE}/study/programs/{program_id}/cronograma", cookies=cookies)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                result = response.json()
                cronograma = result.get('cronograma', [])
                disciplinas = result.get('disciplinas', [])
                print(f"   ✅ Retrieved cronograma with {len(cronograma)} days and {len(disciplinas)} disciplines")
                
                # Show some details
                if cronograma:
                    for day in cronograma[:2]:  # Show first 2 days
                        day_label = day.get('day_label', 'N/A')
                        blocos = day.get('blocos', [])
                        print(f"   📅 {day_label}: {len(blocos)} study blocks")
                        
                if disciplinas:
                    for disc in disciplinas[:3]:  # Show first 3 disciplines
                        nome = disc.get('disciplina', 'N/A')
                        peso = disc.get('peso', 'N/A')
                        print(f"   📚 {nome} (peso: {peso})")
            else:
                print(f"   ❌ Failed to get cronograma: {response.text}")
        except Exception as e:
            print(f"   ❌ Error in test 2: {e}")
    else:
        print("   ⚠️  No program_id available for cronograma test")

def test_get_existing_edital_program(session_token):
    """Find existing program with source_type='edital_import'"""
    print("\n🔍 Finding existing edital-imported program...")
    
    try:
        cookies = {'session_token': session_token}
        response = requests.get(f"{API_BASE}/study/programs", cookies=cookies)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            programs = response.json()
            print(f"   ✅ Retrieved {len(programs)} programs")
            
            # Look for edital-imported program
            edital_program = None
            for program in programs:
                source_type = program.get('source_type')
                if source_type == 'edital_import':
                    edital_program = program
                    print(f"   🎯 Found edital program: {program.get('name', 'N/A')} (ID: {program.get('program_id', 'N/A')})")
                    break
            
            if edital_program:
                return edital_program['program_id']
            else:
                print("   ⚠️  No edital-imported program found")
                return None
        else:
            print(f"   ❌ Failed to get programs: {response.text}")
            return None
            
    except Exception as e:
        print(f"   ❌ Error finding edital program: {e}")
        return None

def test_get_program_notebooks(session_token, program_id):
    """Get notebooks/disciplines for a program"""
    print(f"\n📚 Getting notebooks for program {program_id}...")
    
    try:
        cookies = {'session_token': session_token}
        response = requests.get(f"{API_BASE}/study/notebooks?program_id={program_id}", cookies=cookies)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            notebooks = response.json()
            print(f"   ✅ Retrieved {len(notebooks)} notebooks")
            
            if notebooks:
                # Show notebook details
                for nb in notebooks[:3]:  # Show first 3
                    name = nb.get('name', 'N/A')
                    nb_id = nb.get('notebook_id', 'N/A')
                    weight = nb.get('weight', 'N/A')
                    print(f"   📖 {name} (ID: {nb_id}, Weight: {weight})")
                
                return notebooks
            else:
                print("   ⚠️  No notebooks found")
                return []
        else:
            print(f"   ❌ Failed to get notebooks: {response.text}")
            return []
            
    except Exception as e:
        print(f"   ❌ Error getting notebooks: {e}")
        return []

def test_update_disciplinas_endpoint(session_token, program_id, notebooks):
    """Test POST /api/study/programs/{program_id}/update-disciplinas"""
    print(f"\n🔧 Testing POST /api/study/programs/{program_id}/update-disciplinas...")
    
    if not notebooks:
        print("   ⚠️  No notebooks available for testing")
        return False
    
    try:
        cookies = {'session_token': session_token}
        
        # Test data as specified in review request
        test_data = {
            "program_name": "Meu Programa Editado",
            "disciplinas": [
                {
                    "notebook_id": notebooks[0]["notebook_id"],
                    "weight": 5,
                    "dificuldade": "alta",
                    "user_difficulty": "alta"
                }
            ],
            "regenerate_schedule": True,
            "hours_per_day": 4,
            "days_per_week": 5
        }
        
        response = requests.post(
            f"{API_BASE}/study/programs/{program_id}/update-disciplinas",
            json=test_data,
            cookies=cookies
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("   ✅ Update disciplinas endpoint working correctly")
            print(f"   📋 Updated: {result.get('updated', 'N/A')} disciplinas")
            
            if result.get('schedules_regenerated'):
                print(f"   📅 Schedules regenerated: {result.get('schedules_regenerated', 'N/A')} blocks")
            
            return True
        else:
            print(f"   ❌ Failed to update disciplinas: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error testing update disciplinas: {e}")
        return False

def test_verify_program_name_updated(session_token, program_id):
    """Verify program name was updated to 'Meu Programa Editado'"""
    print(f"\n✅ Verifying program name was updated...")
    
    try:
        cookies = {'session_token': session_token}
        response = requests.get(f"{API_BASE}/study/programs", cookies=cookies)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            programs = response.json()
            
            # Find our program
            target_program = None
            for program in programs:
                if program.get('program_id') == program_id:
                    target_program = program
                    break
            
            if target_program:
                program_name = target_program.get('name', '')
                print(f"   📋 Program name: '{program_name}'")
                
                if program_name == "Meu Programa Editado":
                    print("   ✅ Program name updated successfully")
                    return True
                else:
                    print(f"   ❌ Expected 'Meu Programa Editado', got '{program_name}'")
                    return False
            else:
                print("   ❌ Program not found")
                return False
        else:
            print(f"   ❌ Failed to get programs: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error verifying program name: {e}")
        return False

def test_study_indicators_endpoint(session_token, program_id):
    """Test GET /api/study/programs/{program_id}/study-indicators"""
    print(f"\n📊 Testing GET /api/study/programs/{program_id}/study-indicators...")
    
    try:
        cookies = {'session_token': session_token}
        response = requests.get(f"{API_BASE}/study/programs/{program_id}/study-indicators", cookies=cookies)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            indicators = result.get('indicators', [])
            print(f"   ✅ Retrieved indicators for {len(indicators)} disciplines")
            
            # Verify indicator structure
            if indicators:
                indicator = indicators[0]
                required_fields = [
                    'name', 'weight', 'accuracy', 'total_questions_answered',
                    'study_hours', 'flashcards_total', 'flashcards_due',
                    'notes_count', 'question_progress'
                ]
                
                print("   📋 Checking indicator structure:")
                for field in required_fields:
                    value = indicator.get(field, 'MISSING')
                    print(f"      • {field}: {value}")
                
                # Check if all required fields are present
                missing_fields = [f for f in required_fields if f not in indicator]
                if not missing_fields:
                    print("   ✅ All required indicator fields present")
                    return True
                else:
                    print(f"   ❌ Missing fields: {missing_fields}")
                    return False
            else:
                print("   ⚠️  No indicators found (empty program)")
                return True  # This is acceptable for empty programs
        else:
            print(f"   ❌ Failed to get study indicators: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error testing study indicators: {e}")
        return False

def test_cronograma_regenerated(session_token, program_id):
    """Verify cronograma was regenerated"""
    print(f"\n📅 Verifying cronograma regeneration for program {program_id}...")
    
    try:
        cookies = {'session_token': session_token}
        response = requests.get(f"{API_BASE}/study/programs/{program_id}/cronograma", cookies=cookies)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            cronograma = result.get('cronograma', [])
            disciplinas = result.get('disciplinas', [])
            
            print(f"   ✅ Cronograma has {len(cronograma)} schedule days")
            print(f"   📚 Disciplinas summary: {len(disciplinas)} disciplines")
            
            if cronograma:
                # Show schedule entries
                for day in cronograma[:2]:  # Show first 2 days
                    day_label = day.get('day_label', 'N/A')
                    blocos = day.get('blocos', [])
                    print(f"   📅 {day_label}: {len(blocos)} study blocks")
                    
                    for bloco in blocos[:1]:  # Show first block per day
                        materia = bloco.get('materia', 'N/A')
                        horario = f"{bloco.get('start_time', 'N/A')}-{bloco.get('end_time', 'N/A')}"
                        print(f"      • {materia} ({horario})")
            
            return True
        else:
            print(f"   ❌ Failed to get cronograma: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Error verifying cronograma: {e}")
        return False

def run_enhanced_edital_tests():
    """Main test runner for enhanced edital import functionality"""
    print("🚀 Starting Enhanced Edital Import Backend Tests")
    print("=" * 70)
    
    # Step 1: Authentication
    session_token = register_and_login()
    if not session_token:
        print("❌ Authentication failed - cannot continue tests")
        return False
    
    # Step 2: Find existing edital program
    program_id = test_get_existing_edital_program(session_token)
    if not program_id:
        print("❌ No edital program found - creating one first...")
        # Try to create one using existing functionality
        area_id = test_get_study_areas(session_token)
        if area_id:
            program_id = test_import_edital_validations(session_token, area_id)
        
        if not program_id:
            print("❌ Could not get or create edital program - cannot continue tests")
            return False
    
    # Step 3: Get notebooks for the program
    notebooks = test_get_program_notebooks(session_token, program_id)
    
    # Step 4: Test update-disciplinas endpoint
    update_success = test_update_disciplinas_endpoint(session_token, program_id, notebooks)
    
    # Step 5: Verify program name was updated
    name_success = test_verify_program_name_updated(session_token, program_id)
    
    # Step 6: Test study-indicators endpoint
    indicators_success = test_study_indicators_endpoint(session_token, program_id)
    
    # Step 7: Verify cronograma was regenerated
    cronograma_success = test_cronograma_regenerated(session_token, program_id)
    
    print("\n" + "=" * 70)
    print("🏁 Enhanced Edital Import Backend Tests Completed")
    
    # Summary
    results = {
        "Update Disciplinas": update_success,
        "Program Name Update": name_success, 
        "Study Indicators": indicators_success,
        "Cronograma Regeneration": cronograma_success
    }
    
    print("\n📊 Test Results Summary:")
    for test_name, success in results.items():
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"   {test_name}: {status}")
    
    passed_count = sum(1 for success in results.values() if success)
    total_count = len(results)
    
    print(f"\n🎯 Overall: {passed_count}/{total_count} tests passed ({passed_count/total_count*100:.1f}%)")
    
    return passed_count == total_count

def run_edital_import_tests():
    """Main test runner for edital import functionality"""
    print("🚀 Starting Edital Import Backend Tests")
    print("=" * 60)
    
    # Step 1: Authentication
    session_token = register_and_login()
    if not session_token:
        print("❌ Authentication failed - cannot continue tests")
        return False
    
    # Step 2: Get study areas
    area_id = test_get_study_areas(session_token)
    if not area_id:
        print("❌ Could not get study areas - cannot continue tests")
        return False
    
    # Step 3: Test edital import endpoint
    program_id = test_import_edital_validations(session_token, area_id)
    
    # Step 4: Test cronograma endpoint
    test_get_cronograma(session_token, program_id)
    
    print("\n" + "=" * 60)
    print("🏁 Edital Import Backend Tests Completed")
    
    return True

if __name__ == "__main__":
    print("🎯 Running Enhanced Edital Import Tests (Focus: New Endpoints)\n")
    success = run_enhanced_edital_tests()
    if success:
        print("✅ All enhanced tests passed successfully")
    else:
        print("⚠️  Some enhanced tests failed - check details above")
        
    print("\n" + "="*50)
    print("🔄 Running Basic Edital Import Tests (Original)\n") 
    basic_success = run_edital_import_tests()
    if basic_success:
        print("✅ Basic tests executed successfully")
    else:
        print("❌ Some basic tests failed")