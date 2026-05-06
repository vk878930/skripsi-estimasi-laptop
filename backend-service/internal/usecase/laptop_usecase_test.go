package usecase

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/vk878930/skripsi-backend/entity"
)

type mockLaptopRepo struct {
	riwayat []entity.RiwayatPrediksi
}

func (m *mockLaptopRepo) SimpanRiwayat(riwayat *entity.RiwayatPrediksi) error {
	m.riwayat = append(m.riwayat, *riwayat)
	return nil
}

func (m *mockLaptopRepo) AmbilSemuaRiwayat() ([]entity.RiwayatPrediksi, error) {
	return m.riwayat, nil
}

func TestDapatkanEstimasiHarga(t *testing.T) {
	// Setup mock Python ML Server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"estimasi_harga_rupiah": 5000000.0,
			"status":                "success",
		})
	}))
	defer ts.Close()

	repo := &mockLaptopRepo{}
	uc := NewLaptopUsecase(ts.URL, repo)

	spek := entity.SpesifikasiLaptop{
		Merek:     "Lenovo",
		Processor: "Intel Core i5-8250U",
		RAM:       8,
		SSD:       256,
		Tahun:     2019,
		Kondisi:   4,
	}

	hasil, err := uc.DapatkanEstimasiHarga(spek)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if harga, ok := hasil["estimasi_harga_rupiah"].(float64); !ok || harga != 5000000.0 {
		t.Errorf("Expected estimasi harga 5000000, got %v", harga)
	}

	// Memastikan data riwayat disimpan ke repository
	if len(repo.riwayat) != 1 {
		t.Errorf("Expected 1 riwayat to be saved, got %d", len(repo.riwayat))
	}
	if repo.riwayat[0].Merek != "Lenovo" {
		t.Errorf("Expected Merek Lenovo, got %v", repo.riwayat[0].Merek)
	}
}

func TestDapatkanRiwayat(t *testing.T) {
	repo := &mockLaptopRepo{
		riwayat: []entity.RiwayatPrediksi{
			{Merek: "Lenovo", Harga: 5000000},
		},
	}
	uc := NewLaptopUsecase("http://dummy", repo)

	data, err := uc.DapatkanRiwayat()
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if len(data) != 1 {
		t.Errorf("Expected 1 riwayat, got %d", len(data))
	}
}

func TestEvaluasiModel(t *testing.T) {
	// Setup mock Python ML Server for evaluation
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Mock url will be ts.URL + /evaluate but the usecase does URL parsing.
		// Let's just handle it regardless of path for this test.
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "success",
			"k":      5,
			"mae":    100000,
			"rmse":   150000,
		})
	}))
	defer ts.Close()

	// laptop_usecase trims the last 8 characters assuming url ends with /predict
	// We'll set pythonAPIUrl to a dummy value ending with 8 chars "12345678"
	mockURL := ts.URL + "/12345678"
	
	repo := &mockLaptopRepo{}
	uc := NewLaptopUsecase(mockURL, repo)

	hasil, err := uc.EvaluasiModel(5)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if k, ok := hasil["k"].(float64); !ok || k != 5.0 {
		t.Errorf("Expected k=5, got %v", k)
	}
}
