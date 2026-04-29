package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/vk878930/skripsi-backend/entity"
	"github.com/vk878930/skripsi-backend/internal/usecase"
	"github.com/xuri/excelize/v2"
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
	r.GET("/api/penjualan/terpopuler", handler.AmbilLaptopTerpopuler)
	r.POST("/api/penjualan/import", handler.ImportExcel)
	r.GET("/api/penjualan/:id", handler.AmbilTransaksiByID)
	r.PUT("/api/penjualan/:id", handler.UpdateTransaksi)
	r.DELETE("/api/penjualan/:id", handler.HapusTransaksi)
}

// 1. CREATE
func (h *PenjualanHandler) BuatTransaksi(c *gin.Context) {
	var penjualan entity.Penjualan
	if err := c.ShouldBindJSON(&penjualan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "Format data tidak valid",
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

// 6. IMPORT DATA FROM EXCEL
func (h *PenjualanHandler) ImportExcel(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File tidak ditemukan"})
		return
	}

	src, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuka file"})
		return
	}
	defer src.Close()

	f, err := excelize.OpenReader(src)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membaca format Excel"})
		return
	}

	rows, err := f.GetRows("Sheet1") // Pastikan nama sheet sesuai
	if err != nil || len(rows) <= 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data Excel kosong atau tidak valid"})
		return
	}

	// Map untuk mengelompokkan items berdasarkan OrderID
	transaksiMap := make(map[string]*entity.Penjualan)

	for i, row := range rows {
		if i == 0 {
			continue
		} // Lewati header

		orderID := row[0]
		ram, _ := strconv.Atoi(row[7])
		ssd, _ := strconv.Atoi(row[8])
		tahun, _ := strconv.Atoi(row[9])
		kondisi, _ := strconv.Atoi(row[10])
		qty, _ := strconv.Atoi(row[11])
		harga, _ := strconv.Atoi(row[12])
		tgl, _ := time.Parse("2006-01-02", row[2])

		item := entity.ItemPenjualan{
			Barcode: row[3], Merek: row[4], NamaUnit: row[5], Processor: row[6],
			RAM: ram, SSD: ssd, Tahun: tahun, Kondisi: kondisi,
			Qty: qty, HargaTerjual: harga, SubTotal: qty * harga,
		}

		if t, exists := transaksiMap[orderID]; exists {
			t.Items = append(t.Items, item)
			t.HargaTotal += item.SubTotal
		} else {
			transaksiMap[orderID] = &entity.Penjualan{
				OrderID: orderID, NamaPembeli: row[1], TanggalJual: tgl,
				Items: []entity.ItemPenjualan{item}, HargaTotal: item.SubTotal,
			}
		}
	}

	// Simpan semua transaksi ke database melalui usecase
	for _, tr := range transaksiMap {
		h.penjualanUsecase.BuatTransaksiBaru(tr)
	}

	c.JSON(http.StatusOK, gin.H{"pesan": "Import Excel Berhasil!"})
}

// 7. READ LAPTOP TERPOPULER
func (h *PenjualanHandler) AmbilLaptopTerpopuler(c *gin.Context) {
	bulan := c.Query("bulan")
	tahun := c.Query("tahun")

	data, err := h.penjualanUsecase.DapatkanLaptopTerpopuler(bulan, tahun)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": data})
}
