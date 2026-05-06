package usecase

import (
	"errors"
	"testing"
	"time"

	"github.com/vk878930/skripsi-backend/entity"
)

type mockPenjualanRepo struct {
	transaksiMap map[uint]*entity.Penjualan
}

func (m *mockPenjualanRepo) SimpanTransaksi(penjualan *entity.Penjualan) error {
	if penjualan.OrderID == "ERROR" {
		return errors.New("simulated error")
	}
	penjualan.ID = 1
	m.transaksiMap[1] = penjualan
	return nil
}

func (m *mockPenjualanRepo) AmbilSemuaTransaksi() ([]entity.Penjualan, error) {
	var result []entity.Penjualan
	for _, t := range m.transaksiMap {
		result = append(result, *t)
	}
	return result, nil
}

func (m *mockPenjualanRepo) AmbilTransaksiBerdasarkanID(id uint) (*entity.Penjualan, error) {
	if t, ok := m.transaksiMap[id]; ok {
		return t, nil
	}
	return nil, errors.New("not found")
}

func (m *mockPenjualanRepo) UpdateTransaksi(penjualan *entity.Penjualan) error {
	if _, ok := m.transaksiMap[penjualan.ID]; ok {
		m.transaksiMap[penjualan.ID] = penjualan
		return nil
	}
	return errors.New("not found")
}

func (m *mockPenjualanRepo) HapusTransaksi(id uint) error {
	if _, ok := m.transaksiMap[id]; ok {
		delete(m.transaksiMap, id)
		return nil
	}
	return errors.New("not found")
}

func (m *mockPenjualanRepo) AmbilLaptopTerpopuler(bulan, tahun string) ([]entity.TrendingLaptop, error) {
	return []entity.TrendingLaptop{
		{Merek: "Lenovo", NamaUnit: "Thinkpad", TotalTerjual: 10},
	}, nil
}

func TestBuatTransaksiBaru(t *testing.T) {
	repo := &mockPenjualanRepo{transaksiMap: make(map[uint]*entity.Penjualan)}
	uc := NewPenjualanUsecase(repo)

	penjualan := &entity.Penjualan{
		OrderID:     "ORD-001",
		NamaPembeli: "John Doe",
		TanggalJual: time.Now(),
		HargaTotal:  10000,
	}

	err := uc.BuatTransaksiBaru(penjualan)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if penjualan.ID != 1 {
		t.Errorf("Expected ID to be populated, got %v", penjualan.ID)
	}
}

func TestDapatkanSemuaTransaksi(t *testing.T) {
	repo := &mockPenjualanRepo{transaksiMap: make(map[uint]*entity.Penjualan)}
	uc := NewPenjualanUsecase(repo)

	repo.transaksiMap[1] = &entity.Penjualan{ID: 1, OrderID: "ORD-001"}

	data, err := uc.DapatkanSemuaTransaksi()
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if len(data) != 1 {
		t.Errorf("Expected 1 record, got %v", len(data))
	}
}

func TestHapusTransaksi(t *testing.T) {
	repo := &mockPenjualanRepo{transaksiMap: make(map[uint]*entity.Penjualan)}
	uc := NewPenjualanUsecase(repo)

	repo.transaksiMap[1] = &entity.Penjualan{ID: 1, OrderID: "ORD-001"}

	err := uc.HapusTransaksi(1)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	
	if len(repo.transaksiMap) != 0 {
		t.Errorf("Expected record to be deleted")
	}
}

func TestAmbilLaptopTerpopuler(t *testing.T) {
	repo := &mockPenjualanRepo{transaksiMap: make(map[uint]*entity.Penjualan)}
	uc := NewPenjualanUsecase(repo)

	data, err := uc.DapatkanLaptopTerpopuler("05", "2026")
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}
	if len(data) != 1 || data[0].Merek != "Lenovo" {
		t.Errorf("Expected Lenovo data, got %v", data)
	}
}
