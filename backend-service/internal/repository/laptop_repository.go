package repository

import (
	"github.com/vk878930/skripsi-backend/entity"
	"gorm.io/gorm"
)

// Kontrak (Interface) untuk repository
type LaptopRepository interface {
	SimpanRiwayat(riwayat *entity.RiwayatPrediksi) error
	AmbilSemuaRiwayat() ([]entity.RiwayatPrediksi, error) // <-- Tambahkan baris ini
}

type laptopRepositoryImpl struct {
	db *gorm.DB
}

// Constructor
func NewLaptopRepository(db *gorm.DB) LaptopRepository {
	return &laptopRepositoryImpl{
		db: db,
	}
}

// Implementasi fungsi menyimpan data ke tabel
func (r *laptopRepositoryImpl) SimpanRiwayat(riwayat *entity.RiwayatPrediksi) error {
	// GORM akan otomatis mengeksekusi: INSERT INTO riwayat_prediksis (...) VALUES (...)
	return r.db.Create(riwayat).Error
}

// Implementasi fungsi mengambil semua data riwayat
func (r *laptopRepositoryImpl) AmbilSemuaRiwayat() ([]entity.RiwayatPrediksi, error) {
    var daftarRiwayat []entity.RiwayatPrediksi
    
    // Ambil data dan urutkan berdasarkan waktu pembuatan dari yang paling baru (Descending)
    err := r.db.Order("created_at desc").Find(&daftarRiwayat).Error
    
    return daftarRiwayat, err
}