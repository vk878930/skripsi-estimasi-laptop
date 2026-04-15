package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	// Sesuaikan "skripsi-backend" dengan nama module di file go.mod kamu
	"github.com/vk878930/skripsi-backend/entity"
	"github.com/vk878930/skripsi-backend/internal/usecase"
)

type LaptopHandler struct {
	laptopUsecase usecase.LaptopUsecase
}

// NewLaptopHandler adalah constructor
func NewLaptopHandler(r *gin.Engine, us usecase.LaptopUsecase) {
	handler := &LaptopHandler{
		laptopUsecase: us,
	}

	// Mendaftarkan routing endpoint
	r.POST("/api/estimasi", handler.EstimasiHarga)
	r.GET("/api/estimasi/riwayat", handler.AmbilRiwayatPrediksi)
}

// EstimasiHarga adalah fungsi yang menangani endpoint POST /api/estimasi
func (h *LaptopHandler) EstimasiHarga(c *gin.Context) {
	var spek entity.SpesifikasiLaptop

	// 1. Validasi input JSON
	if err := c.ShouldBindJSON(&spek); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format spesifikasi tidak valid"})
		return
	}

	// 2. Lempar ke Usecase untuk diproses (Handler tidak perlu tahu cara kerja Python)
	hasil, err := h.laptopUsecase.DapatkanEstimasiHarga(spek)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// 3. Kembalikan hasil ke user
	c.JSON(http.StatusOK, gin.H{
		"pesan": "Berhasil memproses via arsitektur clean",
		"data":  hasil,
	})
}


func (h *LaptopHandler) AmbilRiwayatPrediksi(c *gin.Context) {
	// Panggil fungsi dari usecase (Sesuaikan nama fungsinya dengan yang ada di usecase kamu)
	data, err := h.laptopUsecase.DapatkanRiwayat() 
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil riwayat prediksi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": data})
}