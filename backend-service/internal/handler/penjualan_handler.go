package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/vk878930/skripsi-backend/entity"
	"github.com/vk878930/skripsi-backend/internal/usecase"
)

type PenjualanHandler struct {
	penjualanUsecase usecase.PenjualanUsecase
}

func NewPenjualanHandler(r *gin.Engine, u usecase.PenjualanUsecase) {
	handler := &PenjualanHandler{
		penjualanUsecase: u,
	}

	// Mendaftarkan 5 Endpoint CRUD untuk Penjualan
	r.POST("/api/penjualan", handler.BuatTransaksi)
	r.GET("/api/penjualan", handler.AmbilSemuaTransaksi)
	r.GET("/api/penjualan/:id", handler.AmbilTransaksiByID)
	r.PUT("/api/penjualan/:id", handler.UpdateTransaksi)
	r.DELETE("/api/penjualan/:id", handler.HapusTransaksi)
}

// 1. CREATE
func (h *PenjualanHandler) BuatTransaksi(c *gin.Context) {
	var penjualan entity.Penjualan
	if err := c.ShouldBindJSON(&penjualan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Format data tidak valid",
			"detail": err.Error(),
		})
		return
	}

	if err := h.penjualanUsecase.BuatTransaksiBaru(&penjualan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"pesan": "Transaksi berhasil disimpan!", "data": penjualan})
}

// 2. READ ALL
func (h *PenjualanHandler) AmbilSemuaTransaksi(c *gin.Context) {
	data, err := h.penjualanUsecase.DapatkanSemuaTransaksi()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": data})
}

// 3. READ ONE BY ID
func (h *PenjualanHandler) AmbilTransaksiByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID harus berupa angka"})
		return
	}

	data, err := h.penjualanUsecase.DapatkanTransaksiBerdasarkanID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Transaksi tidak ditemukan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": data})
}

// 4. UPDATE
func (h *PenjualanHandler) UpdateTransaksi(c *gin.Context) {
	idParam := c.Param("id")
	id, _ := strconv.Atoi(idParam)

	var penjualan entity.Penjualan
	if err := c.ShouldBindJSON(&penjualan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}
	
	// Pastikan ID di payload sama dengan ID di URL
	penjualan.ID = uint(id)

	if err := h.penjualanUsecase.PerbaruiTransaksi(&penjualan); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui transaksi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"pesan": "Transaksi berhasil diperbarui!", "data": penjualan})
}

// 5. DELETE
func (h *PenjualanHandler) HapusTransaksi(c *gin.Context) {
	idParam := c.Param("id")
	id, _ := strconv.Atoi(idParam)

	if err := h.penjualanUsecase.HapusTransaksi(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus transaksi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"pesan": "Transaksi beserta detail laptopnya berhasil dihapus!"})
}