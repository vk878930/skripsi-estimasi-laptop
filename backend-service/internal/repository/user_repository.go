package repository

import (
	"github.com/vk878930/skripsi-backend/entity"
	"gorm.io/gorm"
)

type UserRepository interface {
	FindByUsername(username string) (*entity.User, error)
	Create(user *entity.User) error
	Count() (int64, error)
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db}
}

func (r *userRepository) FindByUsername(username string) (*entity.User, error) {
	var user entity.User
	err := r.db.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Create(user *entity.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&entity.User{}).Count(&count).Error
	return count, err
}
