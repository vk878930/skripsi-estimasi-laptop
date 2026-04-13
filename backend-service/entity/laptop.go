package entity

import "time"

// SpesifikasiLaptop adalah representasi data yang dikirim user
type SpesifikasiLaptop struct {
	RAM     int `json:"ram"`
	SSD     int `json:"ssd"`
	Tahun   int `json:"tahun"`
	Kondisi int `json:"kondisi"`
}

type RiwayatPrediksi struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	RAM       int       `json:"ram"`
	SSD       int       `json:"ssd"`
	Tahun     int       `json:"tahun"`
	Kondisi   int       `json:"kondisi"`
	Harga     int       `json:"harga"`
	CreatedAt time.Time `json:"created_at"`
}