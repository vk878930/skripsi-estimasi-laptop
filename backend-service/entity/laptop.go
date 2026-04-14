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

// TABEL TRANSAKSI (Header / Order Utama)
type Penjualan struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	OrderID     string    `gorm:"uniqueIndex" json:"order_id"`
	NamaPembeli string    `json:"nama_pembeli"`
	TanggalJual time.Time `json:"tanggal_jual"`
	HargaTotal  int       `json:"harga_total"`
	CreatedAt   time.Time `json:"created_at"`
	// Ini keajaiban GORM: Menyambungkan Transaksi dengan banyak Item
	Items []ItemPenjualan `gorm:"foreignKey:PenjualanID" json:"items"`
}

// TABEL ITEM (Detail Laptop yang dibeli dalam 1 Order)
type ItemPenjualan struct {
	ID           uint   `gorm:"primaryKey" json:"id"` // ID Unik untuk baris ini
	PenjualanID  uint   `json:"penjualan_id"`         // <--- INI WAJIB ADA (Penghubung ke ID Transaksi)
	Barcode      string `json:"barcode"`              // Pakai string agar angka nol di depan tidak hilang
	Merek        string `json:"merek"`
	NamaUnit     string `json:"nama_unit"`
	Processor    string `json:"processor"`
	RAM          int    `json:"ram"`
	SSD          int    `json:"ssd"`
	Tahun        int    `json:"tahun"`
	Kondisi      int    `json:"kondisi"`
	Qty          int    `json:"qty"`
	HargaTerjual int    `json:"harga_terjual"` // Harga per 1 unit
	SubTotal     int    `json:"sub_total"`     // Qty * HargaTerjual
}
