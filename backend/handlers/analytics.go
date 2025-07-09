package handlers

import (
	"net/http"
	"strconv"
	"time"

	"rice-monitor-api/models"
	"rice-monitor-api/services"

	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/iterator"
)

type AnalyticsHandler struct {
	firestoreService *services.FirestoreService
}

func NewAnalyticsHandler(firestoreService *services.FirestoreService) *AnalyticsHandler {
	return &AnalyticsHandler{
		firestoreService: firestoreService,
	}
}

// @Summary Get Dashboard Data
// @Description Get dashboard analytics data
// @Tags analytics
// @Produce  json
// @Security ApiKeyAuth
// @Success 200 {object} models.SuccessResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /analytics/dashboard [get]
func (ah *AnalyticsHandler) GetDashboardData(c *gin.Context) {
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	ctx := ah.firestoreService.Context()

	// Get submissions count
	submissionsQuery := ah.firestoreService.Submissions().Query
	if user.Role != "admin" {
		submissionsQuery = submissionsQuery.Where("user_id", "==", user.ID)
	}

	totalSubmissions := 0
	submissionsByStatus := make(map[string]int)
	submissionsByStage := make(map[string]int)

	iter := submissionsQuery.Documents(ctx)
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error:   "internal_error",
				Message: "Failed to retrieve dashboard data",
			})
			return
		}

		var submission models.Submission
		doc.DataTo(&submission)

		totalSubmissions++
		submissionsByStatus[submission.Status]++
		submissionsByStage[submission.GrowthStage]++
	}

	// Get recent submissions (last 5)
	recentQuery := submissionsQuery.OrderBy("created_at", firestore.Desc).Limit(5)
	recentDocs, err := recentQuery.Documents(ctx).GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve recent submissions",
		})
		return
	}

	var recentSubmissions []models.Submission
	for _, doc := range recentDocs {
		var submission models.Submission
		doc.DataTo(&submission)
		recentSubmissions = append(recentSubmissions, submission)
	}

	dashboardData := models.DashboardData{
		TotalSubmissions:    totalSubmissions,
		SubmissionsByStatus: submissionsByStatus,
		SubmissionsByStage:  submissionsByStage,
		RecentSubmissions:   recentSubmissions,
		LastUpdated:         time.Now(),
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data:    dashboardData,
	})
}

// @Summary Get Trends Data
// @Description Get trends analytics data
// @Tags analytics
// @Produce  json
// @Security ApiKeyAuth
// @Param days query int false "Number of days to look back"
// @Success 200 {object} models.SuccessResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /analytics/trends [get]
func (ah *AnalyticsHandler) GetTrends(c *gin.Context) {
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	// Parse query parameters
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))

	ctx := ah.firestoreService.Context()

	// Calculate date range
	endDate := time.Now()
	startDate := endDate.AddDate(0, 0, -days)

	submissionsQuery := ah.firestoreService.Submissions().
		Where("created_at", ">=", startDate).
		Where("created_at", "<=", endDate)

	if user.Role != "admin" {
		submissionsQuery = submissionsQuery.Where("user_id", "==", user.ID)
	}

	iter := submissionsQuery.Documents(ctx)
	dailySubmissions := make(map[string]int)
	stageProgression := make(map[string][]string)

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error:   "internal_error",
				Message: "Failed to retrieve trends data",
			})
			return
		}

		var submission models.Submission
		doc.DataTo(&submission)

		// Group by date
		dateKey := submission.CreatedAt.Format("2006-01-02")
		dailySubmissions[dateKey]++

		// Track stage progression by field
		if submission.FieldID != "" {
			stageProgression[submission.FieldID] = append(
				stageProgression[submission.FieldID],
				submission.GrowthStage)
		}
	}

	trendsData := models.TrendsData{
		DailySubmissions: dailySubmissions,
		StageProgression: stageProgression,
		Period: map[string]interface{}{
			"start_date": startDate.Format("2006-01-02"),
			"end_date":   endDate.Format("2006-01-02"),
			"days":       days,
		},
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data:    trendsData,
	})
}

// @Summary Get Reports
// @Description Generate and retrieve reports
// @Tags analytics
// @Produce  json
// @Security ApiKeyAuth
// @Param type query string false "Report type (summary, detailed, field_analysis)"
// @Param start_date query string false "Start date for the report (YYYY-MM-DD)"
// @Param end_date query string false "End date for the report (YYYY-MM-DD)"
// @Success 200 {object} models.SuccessResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /analytics/reports [get]
func (ah *AnalyticsHandler) GetReports(c *gin.Context) {
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	// Parse query parameters
	reportType := c.DefaultQuery("type", "summary")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	ctx := ah.firestoreService.Context()
	query := ah.firestoreService.Submissions().Query

	if user.Role != "admin" {
		query = query.Where("user_id", "==", user.ID)
	}

	// Apply date filters if provided
	if startDate != "" {
		if start, err := time.Parse("2006-01-02", startDate); err == nil {
			query = query.Where("created_at", ">=", start)
		}
	}
	if endDate != "" {
		if end, err := time.Parse("2006-01-02", endDate); err == nil {
			query = query.Where("created_at", "<=", end)
		}
	}

	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to generate report",
		})
		return
	}

	var reportData interface{}

	switch reportType {
	case "summary":
		reportData = ah.generateSummaryReport(docs)
	case "detailed":
		reportData = ah.generateDetailedReport(docs)
	case "field_analysis":
		reportData = ah.generateFieldAnalysisReport(docs)
	default:
		reportData = ah.generateSummaryReport(docs)
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data:    reportData,
	})
}

// Report generation functions
func (ah *AnalyticsHandler) generateSummaryReport(docs []*firestore.DocumentSnapshot) map[string]interface{} {
	totalSubmissions := len(docs)
	statusCounts := make(map[string]int)
	stageCounts := make(map[string]int)
	conditionCounts := make(map[string]int)

	for _, doc := range docs {
		var submission models.Submission
		doc.DataTo(&submission)

		statusCounts[submission.Status]++
		stageCounts[submission.GrowthStage]++

		for _, condition := range submission.PlantConditions {
			conditionCounts[condition]++
		}
	}

	return map[string]interface{}{
		"total_submissions":   totalSubmissions,
		"status_distribution": statusCounts,
		"stage_distribution":  stageCounts,
		"condition_frequency": conditionCounts,
		"generated_at":        time.Now(),
	}
}

func (ah *AnalyticsHandler) generateDetailedReport(docs []*firestore.DocumentSnapshot) map[string]interface{} {
	var submissions []models.Submission
	for _, doc := range docs {
		var submission models.Submission
		doc.DataTo(&submission)
		submissions = append(submissions, submission)
	}

	return map[string]interface{}{
		"submissions":  submissions,
		"total_count":  len(submissions),
		"generated_at": time.Now(),
	}
}

func (ah *AnalyticsHandler) generateFieldAnalysisReport(docs []*firestore.DocumentSnapshot) map[string]interface{} {
	fieldData := make(map[string]map[string]interface{})

	for _, doc := range docs {
		var submission models.Submission
		doc.DataTo(&submission)

		if fieldData[submission.FieldID] == nil {
			fieldData[submission.FieldID] = map[string]interface{}{
				"submission_count": 0,
				"stages":           make(map[string]int),
				"conditions":       make(map[string]int),
				"latest_date":      submission.Date,
			}
		}

		data := fieldData[submission.FieldID]
		data["submission_count"] = data["submission_count"].(int) + 1

		stages := data["stages"].(map[string]int)
		stages[submission.GrowthStage]++

		conditions := data["conditions"].(map[string]int)
		for _, condition := range submission.PlantConditions {
			conditions[condition]++
		}

		if submission.Date.After(data["latest_date"].(time.Time)) {
			data["latest_date"] = submission.Date
		}
	}

	return map[string]interface{}{
		"field_analysis": fieldData,
		"total_fields":   len(fieldData),
		"generated_at":   time.Now(),
	}
}
