package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/vk878930/skripsi-backend/entity"
	"github.com/vk878930/skripsi-backend/internal/usecase"
)

type AuthHandler struct {
	usecase usecase.UserUsecase
}

func NewAuthHandler(router *gin.Engine, uc usecase.UserUsecase) {
	handler := &AuthHandler{
		usecase: uc,
	}

	router.POST("/api/login", handler.Login)
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req entity.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	res, err := h.usecase.Login(req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login berhasil",
		"data":    res,
	})
}
