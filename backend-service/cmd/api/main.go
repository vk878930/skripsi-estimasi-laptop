package main

import (
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv" // <-- Import godotenv
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	// Sesuaikan "skripsi-backend" dengan nama module di file go.mod kamu
	"github.com/vk878930/skripsi-backend/entity"
	"github.com/vk878930/skripsi-backend/internal/handler"
	"github.com/vk878930/skripsi-backend/internal/repository"
	"github.com/vk878930/skripsi-backend/internal/usecase"
	"golang.org/x/crypto/bcrypt"
)

func main() {

	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: File .env tidak ditemukan, menggunakan environment system bawaan.")
	}

	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		log.Fatal("Error: DB_DSN tidak ditemukan di file .env")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Gagal connect ke database:", err)
	}

	// 3. AUTO-MIGRATE
	err = db.AutoMigrate(
		&entity.User{},
		&entity.RiwayatPrediksi{},
		&entity.Penjualan{},
		&entity.ItemPenjualan{},
	)

	if err != nil {
		log.Fatal("Gagal membuat tabel:", err)
	}

	// 4. SEED DEFAULT USERS
	userRepo := repository.NewUserRepository(db)
	count, _ := userRepo.Count()
	if count == 0 {
		hashedAdmin, _ := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		hashedBoss, _ := bcrypt.GenerateFromPassword([]byte("boss123"), bcrypt.DefaultCost)
		
		userRepo.Create(&entity.User{Username: "admin", Password: string(hashedAdmin), Role: "admin"})
		userRepo.Create(&entity.User{Username: "boss", Password: string(hashedBoss), Role: "boss"})
		log.Println("Default users created: admin/admin123 & boss/boss123")
	}
	// 1. Inisialisasi Router Gin
	router := gin.Default()

	router.Use(cors.Default())

	// 2. Setup Dependency Injection
	// URL Python kita masukkan di sini agar suatu saat mudah diganti ke .env
	pythonMLUrl := os.Getenv("PYTHON_ML_URL") // Ambil URL Python dari .env juga
	if pythonMLUrl == "" {
		pythonMLUrl = "http://localhost:8000/predict" // Fallback jika kosong
	}
	laptopRepo := repository.NewLaptopRepository(db)
	laptopUsecase := usecase.NewLaptopUsecase(pythonMLUrl, laptopRepo)
	handler.NewLaptopHandler(router, laptopUsecase)

	penjualanRepo := repository.NewPenjualanRepository(db)
	penjualanUsecase := usecase.NewPenjualanUsecase(penjualanRepo)
	handler.NewPenjualanHandler(router, penjualanUsecase)

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "supersecretkey" // Fallback
	}
	userUsecase := usecase.NewUserUsecase(userRepo, jwtSecret)
	handler.NewAuthHandler(router, userUsecase)

	// 3. Jalankan Server

	log.Println("Backend Golang berjalan di port 8080...")
	router.Run(":8080")
}
