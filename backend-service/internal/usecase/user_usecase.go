package usecase

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/vk878930/skripsi-backend/entity"
	"github.com/vk878930/skripsi-backend/internal/repository"
	"golang.org/x/crypto/bcrypt"
)

type UserUsecase interface {
	Login(req entity.LoginRequest) (entity.LoginResponse, error)
}

type userUsecase struct {
	repo      repository.UserRepository
	jwtSecret []byte
}

func NewUserUsecase(repo repository.UserRepository, secret string) UserUsecase {
	return &userUsecase{
		repo:      repo,
		jwtSecret: []byte(secret),
	}
}

func (u *userUsecase) Login(req entity.LoginRequest) (entity.LoginResponse, error) {
	user, err := u.repo.FindByUsername(req.Username)
	if err != nil {
		return entity.LoginResponse{}, errors.New("username atau password salah")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return entity.LoginResponse{}, errors.New("username atau password salah")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":      user.ID,
		"username": user.Username,
		"role":     user.Role,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString(u.jwtSecret)
	if err != nil {
		return entity.LoginResponse{}, err
	}

	return entity.LoginResponse{
		Token:    tokenString,
		Role:     user.Role,
		Username: user.Username,
	}, nil
}
