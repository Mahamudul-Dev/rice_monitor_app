package utils

import (
	"fmt"
	"os"
	"time"
	"path/filepath"
	"strings"

	"rice-monitor-api/models"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

var jwtSecret = []byte(getEnvOrDefault("JWT_SECRET", "your-secret-key"))

// GenerateID generates a new UUID
func GenerateID() string {
	return uuid.New().String()
}

// GetEnvOrDefault gets environment variable or returns default value
func GetEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvOrDefault(key, defaultValue string) string {
	return GetEnvOrDefault(key, defaultValue)
}

// GenerateTokens generates JWT access and refresh tokens
func GenerateTokens(user *models.User) (string, string, error) {
	// Access token (1 hour)
	accessClaims := &models.Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	accessToken := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessTokenString, err := accessToken.SignedString(jwtSecret)
	if err != nil {
		return "", "", err
	}

	// Refresh token (7 days)
	refreshClaims := &models.Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 24 * 7)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshTokenString, err := refreshToken.SignedString(jwtSecret)
	if err != nil {
		return "", "", err
	}

	return accessTokenString, refreshTokenString, nil
}

// ValidateToken validates a JWT token and returns claims
func ValidateToken(tokenString string) (*models.Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &models.Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*models.Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token")
}

// FormatDate formats time to date string
func FormatDate(t time.Time) string {
	return t.Format("2006-01-02")
}

// ParseDate parses date string to time
func ParseDate(dateStr string) (time.Time, error) {
	return time.Parse("2006-01-02", dateStr)
}

// Contains checks if slice contains string
func Contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

// ValidateMediaType checks if file extension is allowed for a given media type
func ValidateMediaType(filename, fileType string) bool {
	switch fileType {
	case "image":
		return IsImageFile(filename)
	case "video":
		return IsVideoFile(filename)
	case "audio":
		return IsAudioFile(filename)
	default:
		return false
	}
}

// IsImageFile checks if the file has an allowed image extension
func IsImageFile(filename string) bool {
	allowedExtensions := map[string]bool{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".webp": true,
	}
	return checkExtension(filename, allowedExtensions)
}

// IsVideoFile checks if the file has an allowed video extension
func IsVideoFile(filename string) bool {
	allowedExtensions := map[string]bool{
		".mp4":  true,
		".mov": true,
		".webm": true,
	}
	return checkExtension(filename, allowedExtensions)
}

// IsAudioFile checks if the file has an allowed audio extension
func IsAudioFile(filename string) bool {
	allowedExtensions := map[string]bool{
		".mp3":  true,
		".wav": true,
		".ogg": true,
		".webm": true,
	}
	return checkExtension(filename, allowedExtensions)
}

// checkExtension is a helper to validate file extensions
func checkExtension(filename string, allowedExtensions map[string]bool) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	return allowedExtensions[ext]
}
