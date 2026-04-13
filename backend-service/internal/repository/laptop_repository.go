package repository

import (
	"github.com/vk878930/skripsi-backend/entity"
	"gorm.io/gorm"
)

// Kontrak (Interface) untuk repository
type LaptopRepository interface {
	SimpanRiwayat(riwayat *entity.RiwayatPrediksi) error
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