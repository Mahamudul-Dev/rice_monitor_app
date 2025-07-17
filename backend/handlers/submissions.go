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

// @Summary Get all submissions
// @Description Get a list of all submissions
// @Tags submissions
// @Produce  json
// @Security ApiKeyAuth
// @Param page query int false "Page number"
// @Param limit query int false "Number of items per page"
// @Param status query string false "Filter by submission status"
// @Param field_id query string false "Filter by field ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /submissions [get]
func (sh *SubmissionHandler) GetSubmissions(c *gin.Context) {
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	fmt.Println(user)

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")

	ctx := sh.firestoreService.Context()
	query := sh.firestoreService.Submissions().Query

	fmt.Printf("Retrieving submissions (page %d, limit %d, status %s)\n", page, limit, status)

	fmt.Println(query)

	// // Filter by user (non-admin users can only see their submissions)
	if user.Role != "admin" {
		query = query.Where("user_id", "==", user.ID)
	}

	// // Order by creation date (newest first)
	// query = query.OrderBy("created_at", firestore.Desc)

	// Apply pagination
	if page > 1 {
		query = query.Offset((page - 1) * limit)
	}
	query = query.Limit(limit)

	// Execute query
	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		fmt.Println(err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve submissions",
		})
		return
	}

	fmt.Printf("Retrieved %d submissions\n", len(docs))

	var submissionsResponse []models.SubmissionResponse
	for _, doc := range docs {
		var submission models.Submission
		doc.DataTo(&submission)

		fieldDoc, err := sh.firestoreService.Fields().Doc(submission.FieldID).Get(ctx)

		fmt.Println(fieldDoc)

		var field *models.Field
		if err == nil {
			field = &models.Field{}
			fieldDoc.DataTo(field)
		}

		if err != nil {
			fmt.Printf("Failed to get field for submission %s: %v\n", submission.ID, err)
			// Optionally, you can skip this submission or return an error
			continue
		}

		submissionsResponse = append(submissionsResponse, models.SubmissionResponse{
			ID:                submission.ID,
			UserID:            submission.UserID,
			FieldID:           submission.FieldID,
			Field:             *field, // Dereference the field pointer
			Date:              submission.Date,
			GrowthStage:       submission.GrowthStage,
			PlantConditions:   submission.PlantConditions,
			TraitMeasurements: submission.TraitMeasurements,
			Notes:             submission.Notes,
			ObserverName:      submission.ObserverName,
			Images:            submission.Images,
			Status:            submission.Status,
			CreatedAt:         submission.CreatedAt,
			UpdatedAt:         submission.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data: map[string]interface{}{
			"submissions": submissionsResponse,
			"page":        page,
			"limit":       limit,
			"total":       len(submissionsResponse),
		},
	})
}

// @Summary Create a new submission
// @Description Create a new submission
// @Tags submissions
// @Accept  json
// @Produce  json
// @Security ApiKeyAuth
// @Param submission body models.CreateSubmissionRequest true "Submission object that needs to be added"
// @Success 201 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /submissions [post]
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
		GrowthStage:       req.GrowthStage,
		PlantConditions:   req.PlantConditions,
		TraitMeasurements: req.TraitMeasurements,
		Notes:             req.Notes,
		ObserverName:      req.ObserverName,
		Images:            req.Images, // Will be populated when images are uploaded
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

// @Summary Get a submission by ID
// @Description Get a single submission by its ID
// @Tags submissions
// @Produce  json
// @Security ApiKeyAuth
// @Param id path string true "Submission ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Router /submissions/{id} [get]
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

	field_doc, err := sh.firestoreService.Fields().Doc(submission.FieldID).Get(ctx)

	var field *models.Field
	if err == nil {
		field = &models.Field{}
		field_doc.DataTo(field)
	}

	if err != nil {
		fmt.Printf("Failed to get field for submission %s: %v\n", submission.ID, err)
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve associated field data",
		})
		return
	}

	submissionResponse := models.SubmissionResponse{
		ID:                submission.ID,
		UserID:            submission.UserID,
		FieldID:           submission.FieldID,
		Field:             *field,
		Date:              submission.Date,
		GrowthStage:       submission.GrowthStage,
		PlantConditions:   submission.PlantConditions,
		TraitMeasurements: submission.TraitMeasurements,
		Notes:             submission.Notes,
		ObserverName:      submission.ObserverName,
		Images:            submission.Images,
		Status:            submission.Status,
		CreatedAt:         submission.CreatedAt,
		UpdatedAt:         submission.UpdatedAt,
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data:    submissionResponse,
	})
}

// @Summary Update a submission
// @Description Update an existing submission
// @Tags submissions
// @Accept  json
// @Produce  json
// @Security ApiKeyAuth
// @Param id path string true "Submission ID"
// @Param submission body object true "Submission object that needs to be updated"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /submissions/{id} [put]
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

	_, err = sh.firestoreService.Submissions().Doc(submissionID).Update(ctx, updates)
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

// @Summary Delete a submission
// @Description Delete a submission by its ID
// @Tags submissions
// @Produce  json
// @Security ApiKeyAuth
// @Param id path string true "Submission ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /submissions/{id} [delete]
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

// @Summary Export submissions to CSV
// @Description Export submissions to a CSV file
// @Tags submissions
// @Produce  text/csv
// @Security ApiKeyAuth
// @Success 200 {string} string "CSV content"
// @Failure 500 {object} models.ErrorResponse
// @Router /submissions/export [get]
func (sh *SubmissionHandler) ExportSubmissions(c *gin.Context) {
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	ctx := sh.firestoreService.Context()
	query := sh.firestoreService.Submissions().Query

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
		csvContent += fmt.Sprintf("%s,%s,%s,%s,%s\n",
			s.ID, s.Date.Format("2006-01-02"), s.GrowthStage, s.ObserverName, s.Status)
	}

	c.String(http.StatusOK, csvContent)
}