import requests
import sys
import json
from datetime import datetime

class MedicineTrackerAPITester:
    def __init__(self, base_url="https://pillremind-7.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, expected_count=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            if success:
                # Additional validation for specific endpoints
                if expected_count is not None and isinstance(response_data, list):
                    if len(response_data) == expected_count:
                        self.tests_passed += 1
                        print(f"✅ Passed - Status: {response.status_code}, Count: {len(response_data)}")
                    else:
                        success = False
                        print(f"❌ Failed - Expected {expected_count} items, got {len(response_data)}")
                else:
                    self.tests_passed += 1
                    print(f"✅ Passed - Status: {response.status_code}")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            self.test_results.append({
                "name": name,
                "success": success,
                "status_code": response.status_code,
                "expected_status": expected_status,
                "response_preview": str(response_data)[:100] if response_data else "No data"
            })

            return success, response_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                "name": name,
                "success": False,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test API root endpoint"""
        return self.run_test("API Root", "GET", "", 200)

    def test_get_all_medicines(self):
        """Test getting all medicines - should return 12 medicines"""
        return self.run_test("Get All Medicines", "GET", "medicines", 200, expected_count=12)

    def test_get_medicine_by_id(self):
        """Test getting a specific medicine by ID"""
        return self.run_test("Get Medicine by ID", "GET", "medicines/1", 200)

    def test_get_schedule_for_feb_7_2026(self):
        """Test getting medicines scheduled for Feb 7, 2026 (default date)"""
        success, data = self.run_test("Get Schedule for Feb 7, 2026", "GET", "medicines/schedule/2026-02-07", 200)
        if success and isinstance(data, list):
            print(f"   Found {len(data)} scheduled medicines for Feb 7, 2026")
            # Verify some medicines are scheduled
            if len(data) > 0:
                print(f"   Sample medicine: {data[0].get('name', 'Unknown')} at {data[0].get('time', 'Unknown')}")
        return success, data

    def test_get_intake_records(self):
        """Test getting intake records for a date"""
        return self.run_test("Get Intake Records", "GET", "intake/2026-02-07", 200)

    def test_create_intake_record(self):
        """Test creating an intake record"""
        intake_data = {
            "medicine_id": "1",
            "date": "2026-02-07",
            "time": "08:00",
            "taken": True
        }
        return self.run_test("Create Intake Record", "POST", "intake", 200, data=intake_data)

    def test_get_daily_stats(self):
        """Test getting daily statistics"""
        success, data = self.run_test("Get Daily Stats", "GET", "stats/2026-02-07", 200)
        if success and isinstance(data, dict):
            print(f"   Stats: Total: {data.get('total', 0)}, Taken: {data.get('taken', 0)}, Pending: {data.get('pending', 0)}")
        return success, data

    def test_get_full_schedule(self):
        """Test getting full schedule"""
        success, data = self.run_test("Get Full Schedule", "GET", "schedule/full", 200)
        if success and isinstance(data, list):
            print(f"   Full schedule contains {len(data)} entries")
        return success, data

    def test_invalid_date_format(self):
        """Test API with invalid date format"""
        return self.run_test("Invalid Date Format", "GET", "medicines/schedule/invalid-date", 400)

    def test_nonexistent_medicine(self):
        """Test getting non-existent medicine"""
        return self.run_test("Non-existent Medicine", "GET", "medicines/999", 404)

def main():
    print("🧪 Starting Medicine Tracker API Tests")
    print("=" * 50)
    
    tester = MedicineTrackerAPITester()
    
    # Run all tests
    test_methods = [
        tester.test_root_endpoint,
        tester.test_get_all_medicines,
        tester.test_get_medicine_by_id,
        tester.test_get_schedule_for_feb_7_2026,
        tester.test_get_intake_records,
        tester.test_create_intake_record,
        tester.test_get_daily_stats,
        tester.test_get_full_schedule,
        tester.test_invalid_date_format,
        tester.test_nonexistent_medicine
    ]
    
    for test_method in test_methods:
        try:
            test_method()
        except Exception as e:
            print(f"❌ Test {test_method.__name__} failed with exception: {str(e)}")
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 Test Summary:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed / tester.tests_run * 100):.1f}%")
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": round(tester.tests_passed / tester.tests_run * 100, 1)
            },
            "detailed_results": tester.test_results
        }, f, indent=2)
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())