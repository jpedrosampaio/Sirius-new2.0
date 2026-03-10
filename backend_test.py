#!/usr/bin/env python3
"""
Backend Testing for Edital Schedule App - NEW/UPDATED ENDPOINTS
Test the following endpoints:
1. GET /api/motivational-quote - daily cached quote 
2. GET /api/study/programs/{program_id}/edital-verticalizado - program with disciplines
3. GET /api/study/programs/{program_id}/cronograma - schedule with topics and conteudo_programatico
"""

import requests
import json
from datetime import datetime

# Test Configuration
BASE_URL = "https://edital-schedule.preview.emergentagent.com/api"
TEST_USER = {
    "email": "testedital@test.com",
    "password": "Test123!"
}

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.session_token = None
        
    def login(self):
        """Login and get session cookie"""
        print("🔐 Logging in...")
        login_url = f"{BASE_URL}/auth/login"
        response = self.session.post(login_url, json=TEST_USER)
        
        if response.status_code != 200:
            raise Exception(f"Login failed: {response.status_code} - {response.text}")
            
        data = response.json()
        self.session_token = data.get("session_token")
        print(f"✅ Login successful - User: {data.get('user', {}).get('email')}")
        return True
    
    def test_motivational_quote(self):
        """Test GET /api/motivational-quote endpoint"""
        print("\n📝 Testing: GET /api/motivational-quote")
        
        url = f"{BASE_URL}/motivational-quote"
        response = self.session.get(url)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"   ❌ FAILED - {response.text}")
            return False
            
        data = response.json()
        
        # Check required fields
        required_fields = ["quote", "motivational_date", "cached"]
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            print(f"   ❌ FAILED - Missing fields: {missing_fields}")
            return False
            
        print(f"   ✅ SUCCESS - Fields present: {list(data.keys())}")
        print(f"   📅 Motivational Date: {data.get('motivational_date')}")
        print(f"   🔄 Cached: {data.get('cached')}")
        print(f"   💬 Quote Length: {len(data.get('quote', ''))}")
        
        # Show partial quote
        quote = data.get('quote', '')
        if len(quote) > 50:
            quote = quote[:50] + "..."
        print(f"   💭 Quote Preview: {quote}")
        
        return True
    
    def get_edital_programs(self):
        """Get list of study programs and find edital imports"""
        print("\n📚 Getting study programs...")
        
        url = f"{BASE_URL}/study/programs"
        response = self.session.get(url)
        
        if response.status_code != 200:
            print(f"   ❌ Failed to get programs: {response.status_code}")
            return []
            
        programs = response.json()
        print(f"   📊 Found {len(programs)} total programs")
        
        # Find programs with source_type="edital_import"
        edital_programs = [p for p in programs if p.get('source_type') == 'edital_import']
        
        print(f"   🎯 Found {len(edital_programs)} edital programs:")
        for program in edital_programs:
            print(f"      - {program.get('name', 'No Name')} (ID: {program.get('program_id')})")
            
        return edital_programs
    
    def test_edital_verticalizado(self, program_id, program_name):
        """Test GET /api/study/programs/{program_id}/edital-verticalizado"""
        print(f"\n📋 Testing: GET /api/study/programs/{program_id}/edital-verticalizado")
        print(f"   Program: {program_name}")
        
        url = f"{BASE_URL}/study/programs/{program_id}/edital-verticalizado"
        response = self.session.get(url)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"   ❌ FAILED - {response.text}")
            return False
            
        data = response.json()
        
        # Check required fields based on endpoint spec
        required_fields = ["program_name", "total_disciplinas", "total_assuntos", "disciplinas"]
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            print(f"   ❌ FAILED - Missing fields: {missing_fields}")
            return False
            
        print(f"   ✅ SUCCESS - Fields present: {list(data.keys())}")
        print(f"   📚 Program Name: {data.get('program_name')}")
        
        # Check concurso info if present
        concurso = data.get('concurso', {})
        if concurso:
            print(f"   🏛️ Concurso: {concurso.get('nome', 'No name')}")
            if concurso.get('banca'):
                print(f"   🏢 Banca: {concurso.get('banca')}")
        
        print(f"   📊 Total Disciplinas: {data.get('total_disciplinas')}")
        print(f"   📝 Total Assuntos: {data.get('total_assuntos')}")
        
        # Check disciplinas array
        disciplinas = data.get('disciplinas', [])
        if disciplinas:
            print(f"   📋 Sample disciplina fields:")
            first_disc = disciplinas[0]
            disc_fields = ["nome", "peso", "conteudo_programatico", "topicos", "study_hours", "accuracy"]
            
            for field in disc_fields:
                if field in first_disc:
                    value = first_disc[field]
                    if field == "conteudo_programatico":
                        print(f"      - {field}: {len(value)} items")
                    elif field == "topicos":
                        print(f"      - {field}: {len(value)} items")  
                    else:
                        print(f"      - {field}: {value}")
                else:
                    print(f"      - {field}: MISSING")
                    
            print(f"   📋 Disciplinas breakdown:")
            for disc in disciplinas:
                name = disc.get('nome', 'No name')
                peso = disc.get('peso', 0)
                conteudo_count = len(disc.get('conteudo_programatico', []))
                topicos_count = len(disc.get('topicos', []))
                study_hours = disc.get('study_hours', 0)
                accuracy = disc.get('accuracy', 0)
                print(f"      - {name}: peso={peso}, conteudo={conteudo_count}, topicos={topicos_count}, hours={study_hours}, acc={accuracy}%")
        
        return True
    
    def test_cronograma(self, program_id, program_name):
        """Test GET /api/study/programs/{program_id}/cronograma"""
        print(f"\n📅 Testing: GET /api/study/programs/{program_id}/cronograma")  
        print(f"   Program: {program_name}")
        
        url = f"{BASE_URL}/study/programs/{program_id}/cronograma"
        response = self.session.get(url)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"   ❌ FAILED - {response.text}")
            return False
            
        data = response.json()
        
        # Check main structure
        required_fields = ["program", "cronograma", "disciplinas"]
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            print(f"   ❌ FAILED - Missing fields: {missing_fields}")
            return False
            
        print(f"   ✅ SUCCESS - Fields present: {list(data.keys())}")
        
        # Check disciplinas array for topicos and conteudo_programatico
        disciplinas = data.get('disciplinas', [])
        if disciplinas:
            print(f"   📊 Disciplinas ({len(disciplinas)}) with topicos & conteudo_programatico:")
            for disc in disciplinas:
                name = disc.get('disciplina', disc.get('nome', 'No name'))
                topicos = disc.get('topicos', [])
                conteudo = disc.get('conteudo_programatico', [])
                peso = disc.get('peso', 0)
                print(f"      - {name}: peso={peso}, topicos={len(topicos)}, conteudo={len(conteudo)}")
                
                if topicos and isinstance(topicos, list) and len(topicos) > 0:
                    print(f"        📝 Topicos: {topicos[:2]}{'...' if len(topicos) > 2 else ''}")
                
                if conteudo and isinstance(conteudo, list) and len(conteudo) > 0:
                    sample_conteudo = conteudo[0] if conteudo else {}
                    if isinstance(sample_conteudo, dict):
                        assunto = sample_conteudo.get('assunto', sample_conteudo.get('titulo', 'No title'))
                        subtopicos = sample_conteudo.get('subtopicos', [])
                        print(f"        📖 Sample conteudo: {assunto} ({len(subtopicos)} subtopicos)")
        
        # Check cronograma schedule blocks for assuntos_foco
        cronograma = data.get('cronograma', [])
        print(f"   📅 Schedule Days: {len(cronograma)}")
        
        assuntos_foco_found = False
        for day in cronograma:
            day_label = day.get('day_label', day.get('day', 'No day'))
            blocos = day.get('blocos', [])
            
            if blocos:
                print(f"   📆 {day_label}: {len(blocos)} blocos")
                for bloco in blocos:
                    assuntos_foco = bloco.get('assuntos_foco', [])
                    if assuntos_foco:
                        assuntos_foco_found = True
                        disciplina = bloco.get('disciplina_nome', 'No name')
                        start_time = bloco.get('start_time', 'No time')
                        end_time = bloco.get('end_time', 'No time')
                        print(f"      ⏰ {start_time}-{end_time} {disciplina}")
                        print(f"         🎯 Assuntos foco: {assuntos_foco}")
                        break  # Just show first example
        
        if assuntos_foco_found:
            print("   ✅ assuntos_foco field found in schedule blocks")
        else:
            print("   ⚠️  No assuntos_foco found in schedule blocks (may be empty)")
            
        return True
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests for NEW/UPDATED Endpoints")
        print("=" * 60)
        
        try:
            # Login
            self.login()
            
            # Test 1: Motivational Quote
            test1_pass = self.test_motivational_quote()
            
            # Test 2 & 3: Get programs and test edital endpoints  
            edital_programs = self.get_edital_programs()
            
            if not edital_programs:
                print("   ⚠️  No edital programs found - skipping edital-specific tests")
                test2_pass = False
                test3_pass = False
            else:
                # Use first edital program for testing
                program = edital_programs[0]
                program_id = program.get('program_id')
                program_name = program.get('name', 'Unnamed Program')
                
                # Test 2: Edital Verticalizado 
                test2_pass = self.test_edital_verticalizado(program_id, program_name)
                
                # Test 3: Cronograma
                test3_pass = self.test_cronograma(program_id, program_name)
            
            # Results Summary
            print("\n" + "=" * 60)
            print("📊 TEST RESULTS SUMMARY")
            print("=" * 60)
            
            tests = [
                ("GET /api/motivational-quote", test1_pass),
                ("GET /api/study/programs/{id}/edital-verticalizado", test2_pass if edital_programs else "SKIPPED"),
                ("GET /api/study/programs/{id}/cronograma", test3_pass if edital_programs else "SKIPPED")
            ]
            
            passed = 0
            for test_name, result in tests:
                if result is True:
                    print(f"✅ {test_name}")
                    passed += 1
                elif result is False:
                    print(f"❌ {test_name}")
                else:
                    print(f"⚠️  {test_name} - {result}")
            
            total_testable = len([t for t in tests if t[1] != "SKIPPED"])
            
            print(f"\n🏆 FINAL SCORE: {passed}/{total_testable} tests passed")
            
            if passed == total_testable:
                print("🎉 ALL TESTS PASSED!")
            else:
                print("⚠️  Some tests failed - check details above")
                
        except Exception as e:
            print(f"\n💥 CRITICAL ERROR: {str(e)}")
            return False
            
        return True

if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()