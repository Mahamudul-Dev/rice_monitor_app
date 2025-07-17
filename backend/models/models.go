package models

import (
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// User represents a user in the system
type User struct {
	ID          string    `json:"id" firestore:"id"`
	Email       string    `json:"email" firestore:"email"`
	Name        string    `json:"name" firestore:"name"`
	Picture     string    `json:"picture" firestore:"picture"`
	Role        string    `json:"role" firestore:"role"` // admin, researcher, observer
	CreatedAt   time.Time `json:"created_at" firestore:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" firestore:"updated_at"`
	LastLoginAt time.Time `json:"last_login_at" firestore:"last_login_at"`
}

// Field represents a rice field
type Field struct {
	ID          string    `json:"id" firestore:"id"`
	Name        string    `json:"name" firestore:"name"`
	Location    string    `json:"location" firestore:"location"`
	RiceVariety    string    `json:"rice_variety" firestore:"rice_variety"`
	TentativeDate    string    `json:"tentative_date" firestore:"tentative_date"`
	Coordinates Location  `json:"coordinates" firestore:"coordinates"`
	Area        float64   `json:"area" firestore:"area"` // in hectares
	OwnerID     string    `json:"owner_id" firestore:"owner_id"`
	CreatedAt   time.Time `json:"created_at" firestore:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" firestore:"updated_at"`
}

// Location represents GPS coordinates
type Location struct {
	Latitude  float64 `json:"latitude" firestore:"latitude"`
	Longitude float64 `json:"longitude" firestore:"longitude"`
}

// Submission represents a monitoring submission
type Submission struct {
	ID                string            `json:"id" firestore:"id"`
	UserID            string            `json:"user_id" firestore:"user_id"`
	FieldID           string            `json:"field_id" firestore:"field_id"`
	Date              time.Time         `json:"date" firestore:"date"`
	GrowthStage       string            `json:"growth_stage" firestore:"growth_stage"`
	PlantConditions   []string          `json:"plant_conditions" firestore:"plant_conditions"`
	TraitMeasurements TraitMeasurements `json:"trait_measurements" firestore:"trait_measurements"`
	Notes             string            `json:"notes" firestore:"notes"`
	ObserverName      string            `json:"observer_name" firestore:"observer_name"`
	Images            []string          `json:"images" firestore:"images"` // URLs to uploaded images
	Status            string            `json:"status" firestore:"status"` // submitted, under_review, approved, rejected
	CreatedAt         time.Time         `json:"created_at" firestore:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at" firestore:"updated_at"`
}

// TraitMeasurements represents the measurement data
type TraitMeasurements struct {
	CulmLength      float64 `json:"culm_length" firestore:"culm_length"`
	PanicleLength   float64 `json:"panicle_length" firestore:"panicle_length"`
	PaniclesPerHill int     `json:"panicles_per_hill" firestore:"panicles_per_hill"`
	HillsObserved   int     `json:"hills_observed" firestore:"hills_observed"`
}

// Request/Response DTOs

// CreateSubmissionRequest represents the request payload for creating submissions
type CreateSubmissionRequest struct {
	FieldID           string            `json:"field_id" binding:"required"`
	Date              time.Time         `json:"date" binding:"required"`
	GrowthStage       string            `json:"growth_stage" binding:"required"`
	PlantConditions   []string          `json:"plant_conditions"`
	TraitMeasurements TraitMeasurements `json:"trait_measurements"`
	Notes             string            `json:"notes"`
	ObserverName      string            `json:"observer_name" binding:"required"`
	Images            []string          `json:"images"`
}

// UpdateSubmissionRequest represents the request payload for updating submissions
type UpdateSubmissionRequest struct {
	Location          *string            `json:"location,omitempty"`
	GrowthStage       *string            `json:"growth_stage,omitempty"`
	PlantConditions   []string           `json:"plant_conditions,omitempty"`
	TraitMeasurements *TraitMeasurements `json:"trait_measurements,omitempty"`
	Notes             *string            `json:"notes,omitempty"`
	Status            *string            `json:"status,omitempty"`
}
type SubmissionResponse struct {
	ID                string            `json:"id"`
	UserID            string            `json:"user_id"`
	FieldID           string            `json:"field_id"`
	Field             Field             `json:"field" `
	Date              time.Time         `json:"date"`
	GrowthStage       string            `json:"growth_stage"`
	PlantConditions   []string          `json:"plant_conditions"`
	TraitMeasurements TraitMeasurements `json:"trait_measurements"`
	Notes             string            `json:"notes"`
	ObserverName      string            `json:"observer_name"`
	Images            []string          `json:"images"` // URLs to uploaded images
	Status            string            `json:"status"` // submitted, under_review, approved, rejected
	CreatedAt         time.Time         `json:"created_at"`
	UpdatedAt         time.Time         `json:"updated_at"`
}
// CreateFieldRequest represents the request payload for creating fields
type CreateFieldRequest struct {
	Name        string   `json:"name" binding:"required"`
	Location    string   `json:"location" binding:"required"`
	RiceVariety    string   `json:"rice_variety" `
	TentativeDate    string   `json:"tentative_date"`
	Coordinates Location `json:"coordinates"`
	Area        float64  `json:"area"`
}

// GoogleTokenRequest represents Google OAuth token request
type GoogleTokenRequest struct {
	Token string `json:"token" binding:"required"`
}

// RefreshTokenRequest represents refresh token request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// AuthResponse represents authentication response
type AuthResponse struct {
	User         User   `json:"user"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

// ErrorResponse represents error response
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// SuccessResponse represents success response
type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
}

// JWT Claims
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// PaginationParams represents pagination parameters
type PaginationParams struct {
	Page    int    `form:"page,default=1"`
	Limit   int    `form:"limit,default=20"`
	Status  string `form:"status"`
	FieldID string `form:"field_id"`
}

// DashboardData represents dashboard analytics data
type DashboardData struct {
	TotalSubmissions    int            `json:"total_submissions"`
	SubmissionsByStatus map[string]int `json:"submissions_by_status"`
	SubmissionsByStage  map[string]int `json:"submissions_by_stage"`
	RecentSubmissions   []Submission   `json:"recent_submissions"`
	LastUpdated         time.Time      `json:"last_updated"`
}

// TrendsData represents trends analytics data
type TrendsData struct {
	DailySubmissions map[string]int         `json:"daily_submissions"`
	StageProgression map[string][]string    `json:"stage_progression"`
	Period           map[string]interface{} `json:"period"`
}

// ReportData represents report data
type ReportData struct {
	Type        string      `json:"type"`
	Data        interface{} `json:"data"`
	GeneratedAt time.Time   `json:"generated_at"`
}

type GoogleUserInfo struct {
	Email   string
	Name    string
	Picture string
}
