package repository

import (
	"github.com/vk878930/skripsi-backend/entity"
	"gorm.io/gorm"
)

type PenjualanRepository interface {
	SimpanTransaksi(penjualan *entity.Penjualan) error
	AmbilSemuaTransaksi() ([]entity.Penjualan, error)
	AmbilTransaksiBerdasarkanID(id uint) (*entity.Penjualan, error)
	UpdateTransaksi(penjualan *entity.Penjualan) error
	HapusTransaksi(id uint) error
	AmbilLaptopTerpopuler(bulan, tahun string) ([]entity.TrendingLaptop, error)
}

type penjualanRepositoryImpl struct {
	db *gorm.DB
}

func NewPenjualanRepository(db *gorm.DB) PenjualanRepository {
	return &penjualanRepositoryImpl{
		db: db,
	}
}

// 1. CREATE (Simpan Transaksi Baru)
func (r *penjualanRepositoryImpl) SimpanTransaksi(penjualan *entity.Penjualan) error {
	return r.db.Create(penjualan).Error
}

// 2. READ ALL (Ambil Semua Data)
func (r *penjualanRepositoryImpl) AmbilSemuaTransaksi() ([]entity.Penjualan, error) {
	var daftarPenjualan []entity.Penjualan
	err := r.db.Preload("Items").Order("created_at desc").Find(&daftarPenjualan).Error
	return daftarPenjualan, err
}

// 3. READ ONE (Ambil 1 Transaksi berdasarkan OrderID / ID)
func (r *penjualanRepositoryImpl) AmbilTransaksiBerdasarkanID(id uint) (*entity.Penjualan, error) {
	var penjualan entity.Penjualan
	
	// Gunakan First(&penjualan, id) untuk mencari berdasarkan Primary Key
	// Tetap gunakan Preload("Items") agar detail laptopnya ikut terbawa
	err := r.db.Preload("Items").First(&penjualan, id).Error
	if err != nil {
		return nil, err
	}
	
	return &penjualan, nil
}

// 4. UPDATE (Edit Transaksi)
func (r *penjualanRepositoryImpl) UpdateTransaksi(penjualan *entity.Penjualan) error {
	// Sihir GORM: Session FullSaveAssociations memastikan bahwa 
	// jika ada perubahan pada list laptop di dalam nota ini (misal ada yang dihapus atau ditambah user),
	// GORM akan otomatis menyesuaikan tabel ItemPenjualan-nya juga.
	return r.db.Session(&gorm.Session{FullSaveAssociations: true}).Save(penjualan).Error
}

// 5. DELETE (Hapus Transaksi)
func (r *penjualanRepositoryImpl) HapusTransaksi(id uint) error {
	// Sihir GORM: Select("Items") memberitahu GORM untuk melakukan Cascade Delete.
	// Artinya, saat Nota dihapus, semua Laptop yang tercatat di nota tersebut juga ikut terhapus otomatis!
	return r.db.Select("Items").Delete(&entity.Penjualan{ID: id}).Error
}

// 6. READ TERPOPULER (Laporan Laptop Trending)
func (r *penjualanRepositoryImpl) AmbilLaptopTerpopuler(bulan, tahun string) ([]entity.TrendingLaptop, error) {
	var hasil []entity.TrendingLaptop
	
	query := r.db.Table("item_penjualans").
		Select("item_penjualans.merek, item_penjualans.nama_unit, SUM(item_penjualans.qty) as total_terjual").
		Joins("JOIN penjualans ON penjualans.id = item_penjualans.penjualan_id")
		
	if bulan != "" {
		query = query.Where("EXTRACT(MONTH FROM penjualans.tanggal_jual) = ?", bulan)
	}
	if tahun != "" {
		query = query.Where("EXTRACT(YEAR FROM penjualans.tanggal_jual) = ?", tahun)
	}
	
	err := query.Group("item_penjualans.merek, item_penjualans.nama_unit").
		Order("total_terjual DESC").
		Limit(10).
		Scan(&hasil).Error
		
	return hasil, err
}