package usecase

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	// Sesuaikan "skripsi-backend" dengan nama module di file go.mod kamu
	"github.com/vk878930/skripsi-backend/entity"
	"github.com/vk878930/skripsi-backend/internal/repository"
)

// LaptopUsecase adalah interface (Kontrak) untuk logika laptop
// Di industri, pakai interface itu wajib agar kode mudah di-mocking saat Unit Test
type LaptopUsecase interface {
	DapatkanEstimasiHarga(spek entity.SpesifikasiLaptop) (map[string]interface{}, error)
}

type laptopUsecaseImpl struct {
	pythonAPIUrl string
	laptopRepo   repository.LaptopRepository
}

// NewLaptopUsecase adalah constructor untuk membuat usecase baru
func NewLaptopUsecase(pythonURL string, repo repository.LaptopRepository) LaptopUsecase {
	return &laptopUsecaseImpl{
		pythonAPIUrl: pythonURL,
		laptopRepo:   repo}
}

// DapatkanEstimasiHarga adalah implementasi dari logika memanggil ML Service
func (u *laptopUsecaseImpl) DapatkanEstimasiHarga(spek entity.SpesifikasiLaptop) (map[string]interface{}, error) {
	jsonData, err := json.Marshal(spek)
	if err != nil {
		return nil, err
	}

	// Menembak ke Python
	response, err := http.Post(u.pythonAPIUrl, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, errors.New("gagal menghubungi service ML")
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return nil, errors.New("mendapat respon error dari service ML")
	}

	bodyBytes, _ := io.ReadAll(response.Body)
	var hasil map[string]interface{}
	json.Unmarshal(bodyBytes, &hasil)

	// --- LOGIKA BARU: SIMPAN KE DATABASE ---
	// Ambil harga dari hasil JSON (karena JSON angka, di Golang jadi float64)
	hargaFloat, ok := hasil["estimasi_harga_rupiah"].(float64)
	hargaInt := 0
	if ok {
		hargaInt = int(hargaFloat)
	}

	// Bentuk data untuk disimpan ke tabel PostgreSQL
	riwayat := &entity.RiwayatPrediksi{
		RAM:       spek.RAM,
		SSD:       spek.SSD,
		Tahun:     spek.Tahun,
		Kondisi:   spek.Kondisi,
		Harga:     hargaInt,
		CreatedAt: time.Now(),
	}

	// Panggil repository untuk menyimpan (jika gagal, kita abaikan saja agar user tetap dapat harga)
	_ = u.laptopRepo.SimpanRiwayat(riwayat)
	// --------------------------------------

	return hasil, nil
}
