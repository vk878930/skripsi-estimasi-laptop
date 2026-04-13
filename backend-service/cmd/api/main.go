package main

import (
	"github.com/gin-gonic/gin"

    // Sesuaikan "skripsi-backend" dengan nama module di file go.mod kamu
	"github.com/vk878930/skripsi-backend/internal/handler"
	"github.com/vk878930/skripsi-backend/internal/usecase"
)

func main() {
	// 1. Inisialisasi Router Gin
	router := gin.Default()

	// 2. Setup Dependency Injection
	// URL Python kita masukkan di sini agar suatu saat mudah diganti ke .env
	pythonMLUrl := "http://localhost:8000/predict"
	
	// Rakit Usecase
	laptopUsecase := usecase.NewLaptopUsecase(pythonMLUrl)
	
	// Rakit Handler dengan memasukkan Usecase ke dalamnya
	handler.NewLaptopHandler(router, laptopUsecase)

	// 3. Jalankan Server
	router.Run(":8080")
}