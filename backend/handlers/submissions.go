package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"rice-monitor-api/models"
	"rice-monitor-api/services"
	"rice-monitor-api/utils"

	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/iterator"
)

type SubmissionHandler struct {
	firestoreService *services.FirestoreService
}

func NewSubmissionHandler(firestoreService *services.FirestoreService) *SubmissionHandler {
	return &SubmissionHandler{
		firestoreService: firestoreService,
	}
}

func (sh *SubmissionHandler) GetSubmissions(c *gin.Context) {
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")
	fieldID := c.Query("field_id")

	ctx := sh.firestoreService.Context()
	query := sh.firestoreService.Submissions()

	// Filter by user (non-admin users can only see their submissions)
	if user.Role != "admin" {
		query = query.Where("user_id", "==", user.ID)
	}

	// Apply filters
	if status != "" {
		query = query.Where("status", "==", status)
	}
	if fieldID != "" {
		query = query.Where("field_id", "==", fieldID)
	}

	// Order by creation date (newest first)
	query = query.OrderBy("created_at", firestore.Desc)

	// Apply pagination
	if page > 1 {
		query = query.Offset((page - 1) * limit)
	}
	query = query.Limit(limit)

	// Execute query
	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve submissions",
		})
		return
	}

	var submissions []models.Submission
	for _, doc := range docs {
		var submission models.Submission
		doc.DataTo(&submission)
		submissions = append(submissions, submission)
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data: map[string]interface{}{
			"submissions": submissions,
			"page":        page,
			"limit":       limit,
			"total":       len(submissions),
		},
	})
}

func (sh *SubmissionHandler) CreateSubmission(c *gin.Context) {
	var req models.CreateSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	submission := &models.Submission{
		ID:                utils.GenerateID(),
		UserID:            user.ID,
		FieldID:           req.FieldID,
		Date:              req.Date,
		Location:          req.Location,
		GrowthStage:       req.GrowthStage,
		PlantConditions:   req.PlantConditions,
		TraitMeasurements: req.TraitMeasurements,
		Notes:             req.Notes,
		ObserverName:      req.ObserverName,
		Images:            []string{}, // Will be populated when images are uploaded
		Status:            "submitted",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	ctx := sh.firestoreService.Context()
	_, err := sh.firestoreService.Submissions().Doc(submission.ID).Set(ctx, submission)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create submission",
		})
		return
	}

	c.JSON(http.StatusCreated, models.SuccessResponse{
		Success: true,
		Data:    submission,
		Message: "Submission created successfully",
	})
}

func (sh *SubmissionHandler) GetSubmission(c *gin.Context) {
	submissionID := c.Param("id")
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	ctx := sh.firestoreService.Context()
	doc, err := sh.firestoreService.Submissions().Doc(submissionID).Get(ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Submission not found",
		})
		return
	}

	var submission models.Submission
	doc.DataTo(&submission)

	// Check if user can access this submission
	if user.Role != "admin" && submission.UserID != user.ID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "Access denied",
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data:    submission,
	})
}

func (sh *SubmissionHandler) UpdateSubmission(c *gin.Context) {
	submissionID := c.Param("id")
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	ctx := sh.firestoreService.Context()

	// Get existing submission
	doc, err := sh.firestoreService.Submissions().Doc(submissionID).Get(ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Submission not found",
		})
		return
	}

	var submission models.Submission
	doc.DataTo(&submission)

	// Check permissions
	if user.Role != "admin" && submission.UserID != user.ID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "Access denied",
		})
		return
	}

	// Remove sensitive fields
	delete(updateData, "id")
	delete(updateData, "user_id")
	delete(updateData, "created_at")
	updateData["updated_at"] = time.Now()

	// Update document
	updates := []firestore.Update{{Path: "updated_at", Value: time.Now()}}
	for key, value := range updateData {
		updates = append(updates, firestore.Update{Path: key, Value: value})
	}

	_, err = sh.firestoreService.Submissions().Doc(submissionID).Update(ctx, updates...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update submission",
		})
		return
	}

	// Get updated submission
	doc, err = sh.firestoreService.Submissions().Doc(submissionID).Get(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve updated submission",
		})
		return
	}

	doc.DataTo(&submission)

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data:    submission,
		Message: "Submission updated successfully",
	})
}

func (sh *SubmissionHandler) DeleteSubmission(c *gin.Context) {
	submissionID := c.Param("id")
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	ctx := sh.firestoreService.Context()

	// Get existing submission
	doc, err := sh.firestoreService.Submissions().Doc(submissionID).Get(ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Submission not found",
		})
		return
	}

	var submission models.Submission
	doc.DataTo(&submission)

	// Check permissions
	if user.Role != "admin" && submission.UserID != user.ID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "Access denied",
		})
		return
	}

	// Delete submission
	_, err = sh.firestoreService.Submissions().Doc(submissionID).Delete(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to delete submission",
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Submission deleted successfully",
	})
}

func (sh *SubmissionHandler) ExportSubmissions(c *gin.Context) {
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	ctx := sh.firestoreService.Context()
	query := sh.firestoreService.Submissions()

	// Filter by user (non-admin users can only export their submissions)
	if user.Role != "admin" {
		query = query.Where("user_id", "==", user.ID)
	}

	// Execute query
	iter := query.Documents(ctx)
	var submissions []models.Submission

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error:   "internal_error",
				Message: "Failed to retrieve submissions",
			})
			return
		}

		var submission models.Submission
		doc.DataTo(&submission)
		submissions = append(submissions, submission)
	}

	// Set CSV headers
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=submissions.csv")

	// Write CSV content
	csvContent := "ID,Date,Location,Growth Stage,Observer,Status\n"
	for _, s := range submissions {
		csvContent += fmt.Sprintf("%s,%s,%s,%s,%s,%s\n",
			s.ID, s.Date.Format("2006-01-02"), s.Location, s.GrowthStage, s.ObserverName, s.Status)
	}

	c.String(http.StatusOK, csvContent)
}