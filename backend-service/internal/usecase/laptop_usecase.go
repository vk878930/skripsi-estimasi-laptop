package usecase

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	
    // Sesuaikan "skripsi-backend" dengan nama module di file go.mod kamu
	"github.com/vk878930/skripsi-backend/entity" 
)

// LaptopUsecase adalah interface (Kontrak) untuk logika laptop
// Di industri, pakai interface itu wajib agar kode mudah di-mocking saat Unit Test
type LaptopUsecase interface {
	DapatkanEstimasiHarga(spek entity.SpesifikasiLaptop) (map[string]interface{}, error)
}

type laptopUsecaseImpl struct {
	pythonAPIUrl string
}

// NewLaptopUsecase adalah constructor untuk membuat usecase baru
func NewLaptopUsecase(pythonURL string) LaptopUsecase {
	return &laptopUsecaseImpl{
		pythonAPIUrl: pythonURL,
	}
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

	return hasil, nil
}