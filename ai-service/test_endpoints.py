"""Full endpoint test suite for NEXOVA AI Service"""
import httpx
import json
import sys

BASE = "http://localhost:8000"

sensor = {
    "machine_id": "MACH_0001",
    "temperature": 72.5,
    "vibration": 4.2,
    "power_consumption": 85.3,
    "voltage": 378.5,
    "current": 112.0,
    "runtime_hours": 2450.0,
    "ambient_temperature": 28.3,
    "humidity": 62.0,
}

passed = 0
failed = 0

def test(method, path, data=None):
    global passed, failed
    try:
        if method == "GET":
            r = httpx.get(f"{BASE}{path}", timeout=10)
        else:
            r = httpx.post(f"{BASE}{path}", json=data, timeout=10)

        status = "PASS" if r.status_code == 200 else f"FAIL({r.status_code})"
        if r.status_code == 200:
            passed += 1
        else:
            failed += 1

        print(f"[{status}] {method} {path}")
        try:
            d = r.json()
            # Print key fields based on endpoint
            if path == "/health":
                print(f"       status={d.get('status')}, version={d.get('version')}")
            elif path == "/models/status":
                print(f"       loaded_models={list(d.get('models', {}).keys())}")
            elif path == "/predict-energy":
                print(f"       predicted_kwh={d.get('predicted_kwh')}, confidence={d.get('confidence')}")
            elif path == "/detect-anomaly":
                print(f"       is_anomaly={d.get('is_anomaly')}, score={d.get('anomaly_score')}")
            elif path == "/predict-failure":
                print(f"       failure_probable={d.get('failure_probable')}, probability={d.get('failure_probability')}")
            elif path == "/optimize":
                print(f"       total_actions={d.get('total_actions')}, model={d.get('model')}")
            elif path == "/ai-decision":
                print(f"       risk_score={d.get('risk_score')}, risk_level={d.get('risk_level')}")
                assess = d.get("assessment", "")
                print(f"       assessment={assess[:100]}...")
                print(f"       confidence={d.get('confidence')}, inference_ms={d.get('total_inference_ms')}ms")
            elif path == "/ai-decision/batch":
                print(f"       total={d.get('total')}, summary={d.get('summary')}")
        except Exception:
            print(f"       raw={r.text[:200]}")
    except Exception as e:
        failed += 1
        print(f"[FAIL] {method} {path} -> {e}")

print("=" * 60)
print("NEXOVA AI SERVICE - ENDPOINT TEST SUITE")
print("=" * 60)
print()

test("GET", "/health")
test("GET", "/models/status")
test("GET", "/models/metrics")
test("POST", "/predict-energy", sensor)
test("POST", "/detect-anomaly", sensor)
test("POST", "/predict-failure", sensor)
test("POST", "/optimize", sensor)
test("POST", "/ai-decision", sensor)

high_risk_sensor = {**sensor, "temperature": 98.0, "vibration": 9.5, "power_consumption": 120.0}
batch = {"readings": [sensor, high_risk_sensor]}
test("POST", "/ai-decision/batch", batch)

# Legacy endpoints
test("POST", "/forecast", {"data": [50, 60, 70], "horizon": 24})
test("POST", "/anomaly", {"data": [{"power": 50, "temperature": 55, "vibration": 3}]})
test("POST", "/recommendations", {"data": [{"power": 50, "temperature": 55, "vibration": 3}]})

print()
print("=" * 60)
print(f"RESULTS: {passed} passed, {failed} failed, {passed + failed} total")
print("=" * 60)

sys.exit(0 if failed == 0 else 1)
