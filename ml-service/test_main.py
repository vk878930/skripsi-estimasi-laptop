from fastapi.testclient import TestClient
from main import app, parse_processor
import pytest

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert "Service ML Aktif!" in response.json()["message"]
    assert "model_ready" in response.json()

def test_parse_processor_intel():
    family, gen = parse_processor("Intel Core i5-8250U")
    assert family == "i5"
    assert gen == 8

def test_parse_processor_ryzen():
    family, gen = parse_processor("Ryzen 5 3500U")
    assert family == "ryzen 5"
    assert gen == 3

def test_parse_processor_mac():
    family, gen = parse_processor("Apple M2 Chip")
    assert family == "m2"
    assert gen == 0

def test_parse_processor_no_gen():
    family, gen = parse_processor("Intel Core i3")
    assert family == "i3"
    assert gen == 0
