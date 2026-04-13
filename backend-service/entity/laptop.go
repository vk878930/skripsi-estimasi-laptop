package entity

// SpesifikasiLaptop adalah representasi data yang dikirim user
type SpesifikasiLaptop struct {
	RAM     int `json:"ram"`
	SSD     int `json:"ssd"`
	Tahun   int `json:"tahun"`
	Kondisi int `json:"kondisi"`
}