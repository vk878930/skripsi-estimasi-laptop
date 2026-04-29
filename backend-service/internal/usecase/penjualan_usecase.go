package usecase

import (
	"github.com/vk878930/skripsi-backend/entity"
	"github.com/vk878930/skripsi-backend/internal/repository"
)

type PenjualanUsecase interface {
	BuatTransaksiBaru(penjualan *entity.Penjualan) error
	DapatkanSemuaTransaksi() ([]entity.Penjualan, error)
	DapatkanTransaksiBerdasarkanID(id uint) (*entity.Penjualan, error)
	PerbaruiTransaksi(penjualan *entity.Penjualan) error
	HapusTransaksi(id uint) error
	DapatkanLaptopTerpopuler(bulan, tahun string) ([]entity.TrendingLaptop, error)
}

type penjualanUsecaseImpl struct {
	penjualanRepo repository.PenjualanRepository
}

func NewPenjualanUsecase(repo repository.PenjualanRepository) PenjualanUsecase {
	return &penjualanUsecaseImpl{
		penjualanRepo: repo,
	}
}

func (u *penjualanUsecaseImpl) BuatTransaksiBaru(penjualan *entity.Penjualan) error {
	// Di sini nanti kamu bisa menambahkan logika bisnis lain, 
	// misalnya validasi Qty tidak boleh 0, atau kalkulasi ulang HargaTotal
	return u.penjualanRepo.SimpanTransaksi(penjualan)
}

func (u *penjualanUsecaseImpl) DapatkanSemuaTransaksi() ([]entity.Penjualan, error) {
	return u.penjualanRepo.AmbilSemuaTransaksi()
}

func (u *penjualanUsecaseImpl) DapatkanTransaksiBerdasarkanID(id uint) (*entity.Penjualan, error) {
	return u.penjualanRepo.AmbilTransaksiBerdasarkanID(id)
}

func (u *penjualanUsecaseImpl) PerbaruiTransaksi(penjualan *entity.Penjualan) error {
	return u.penjualanRepo.UpdateTransaksi(penjualan)
}

func (u *penjualanUsecaseImpl) HapusTransaksi(id uint) error {
	return u.penjualanRepo.HapusTransaksi(id)
}

func (u *penjualanUsecaseImpl) DapatkanLaptopTerpopuler(bulan, tahun string) ([]entity.TrendingLaptop, error) {
	return u.penjualanRepo.AmbilLaptopTerpopuler(bulan, tahun)
}