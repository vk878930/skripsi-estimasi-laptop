package usecase

import (
	"errors"
	"testing"

	"github.com/vk878930/skripsi-backend/entity"
	"golang.org/x/crypto/bcrypt"
)

type mockUserRepo struct {
	users map[string]entity.User
}

func (m *mockUserRepo) Create(user *entity.User) error { return nil }
func (m *mockUserRepo) Count() (int64, error)          { return 0, nil }
func (m *mockUserRepo) FindByUsername(username string) (*entity.User, error) {
	if u, ok := m.users[username]; ok {
		return &u, nil
	}
	return nil, errors.New("not found")
}

func TestLogin_Success(t *testing.T) {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	
	mockRepo := &mockUserRepo{
		users: map[string]entity.User{
			"testuser": {
				ID:       1,
				Username: "testuser",
				Password: string(hashedPassword),
				Role:     "admin",
			},
		},
	}

	uc := NewUserUsecase(mockRepo, "secret")

	req := entity.LoginRequest{
		Username: "testuser",
		Password: "password123",
	}

	resp, err := uc.Login(req)
	if err != nil {
		t.Errorf("Expected no error, got %v", err)
	}

	if resp.Username != "testuser" {
		t.Errorf("Expected username testuser, got %v", resp.Username)
	}

	if resp.Token == "" {
		t.Errorf("Expected a token, got empty string")
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	
	mockRepo := &mockUserRepo{
		users: map[string]entity.User{
			"testuser": {
				ID:       1,
				Username: "testuser",
				Password: string(hashedPassword),
				Role:     "admin",
			},
		},
	}

	uc := NewUserUsecase(mockRepo, "secret")

	req := entity.LoginRequest{
		Username: "testuser",
		Password: "wrongpassword",
	}

	_, err := uc.Login(req)
	if err == nil {
		t.Errorf("Expected error for wrong password, got nil")
	}
}
