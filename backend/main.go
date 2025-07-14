package main

import (
	"context"
	"log"
	"net/http"
	"os"

	_ "rice-monitor-api/docs"
	"rice-monitor-api/handlers"
	"rice-monitor-api/middleware"
	"rice-monitor-api/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

func main() {
	if _, err := os.Stat(".env"); err == nil {
		// Only load if file exists (for local dev)
		err := godotenv.Load(".env")
		if err != nil {
			log.Fatalf("Error loading .env file")
		}
	} else {
		log.Println(".env file not found, assuming environment variables are set externally")
	}

	// Initialize services
	ctx := context.Background()

	firestoreService, err := services.NewFirestoreService(ctx)
	if err != nil {
		log.Fatal("Failed to initialize Firestore service:", err)
	}
	defer firestoreService.Close()

	storageService, err := services.NewStorageService(ctx)
	if err != nil {
		log.Fatal("Failed to initialize Storage service:", err)
	}
	defer storageService.Close()

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(firestoreService)
	userHandler := handlers.NewUserHandler(firestoreService)
	submissionHandler := handlers.NewSubmissionHandler(firestoreService)
	imageHandler := handlers.NewImageHandler(storageService, firestoreService)
	fieldHandler := handlers.NewFieldHandler(firestoreService)
	analyticsHandler := handlers.NewAnalyticsHandler(firestoreService)

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(firestoreService)

	// Setup router
	router := setupRouter(
		authHandler,
		userHandler,
		submissionHandler,
		imageHandler,
		fieldHandler,
		analyticsHandler,
		authMiddleware,
	)

	// Get port from environment or use 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}

func setupRouter(
	authHandler *handlers.AuthHandler,
	userHandler *handlers.UserHandler,
	submissionHandler *handlers.SubmissionHandler,
	imageHandler *handlers.ImageHandler,
	fieldHandler *handlers.FieldHandler,
	analyticsHandler *handlers.AnalyticsHandler,
	authMiddleware *middleware.AuthMiddleware,
) *gin.Engine {
	router := gin.Default()

	// Use CORS middleware
	router.Use(middleware.CORSMiddleware())
	
	// Handle preflight requests explicitly
	router.OPTIONS("/*path", func(c *gin.Context) {
		log.Printf("OPTIONS request for path: %s", c.Param("path"))
		c.AbortWithStatus(http.StatusOK)
	})

	// Health check
	router.GET("/health", func(c *gin.Context) {
		log.Println("Health check endpoint hit")
		c.JSON(200, gin.H{
			"status":    "healthy",
			"timestamp": "2024-01-01T00:00:00Z",
			"version":   "1.0.0",
		})
	})

	// API routes
	api := router.Group("/api/v1")
	{
		// Authentication routes
		auth := api.Group("/auth")
		{
			auth.POST("/google", func(c *gin.Context) {
				log.Println("=== GOOGLE LOGIN ENDPOINT HIT ===")
				authHandler.GoogleLogin(c)
			})
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/logout", authMiddleware.RequireAuth(), authHandler.Logout)
			auth.GET("/me", authMiddleware.RequireAuth(), authHandler.GetCurrentUser)
		}

		// Protected routes
		protected := api.Group("/")
		protected.Use(authMiddleware.RequireAuth())
		{
			// Users
			users := protected.Group("/users")
			{
				users.GET("/:id", userHandler.GetUser)
				users.PUT("/:id", userHandler.UpdateUser)
				users.DELETE("/:id", userHandler.DeleteUser)
			}

			// Monitoring submissions
			submissions := protected.Group("/submissions")
			{
				submissions.GET("", submissionHandler.GetSubmissions)
				submissions.POST("", submissionHandler.CreateSubmission)
				submissions.GET("/:id", submissionHandler.GetSubmission)
				submissions.PUT("/:id", submissionHandler.UpdateSubmission)
				submissions.DELETE("/:id", submissionHandler.DeleteSubmission)
				submissions.GET("/export", submissionHandler.ExportSubmissions)
			}

			// Image upload
			images := protected.Group("/images")
			{
				images.POST("/upload", imageHandler.UploadImage)
				images.GET("/:filename", imageHandler.GetImage)
				images.DELETE("/:filename", imageHandler.DeleteImage)
			}

			// Analytics
			analytics := protected.Group("/analytics")
			{
				analytics.GET("/dashboard", analyticsHandler.GetDashboardData)
				analytics.GET("/trends", analyticsHandler.GetTrends)
				analytics.GET("/reports", analyticsHandler.GetReports)
			}

			// Fields management
			fields := protected.Group("/fields")
			{
				fields.GET("", fieldHandler.GetFields)
				fields.POST("", fieldHandler.CreateField)
				fields.GET("/:id", fieldHandler.GetField)
				fields.PUT("/:id", fieldHandler.UpdateField)
				fields.DELETE("/:id", fieldHandler.DeleteField)
			}
		}
	}

	// Swagger endpoint
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	return router
}