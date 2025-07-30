package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"rice-monitor-api/models"
	"rice-monitor-api/services"
	"rice-monitor-api/utils"

	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/iterator"
)

type SubmissionHandler struct {
	firestoreService    *services.FirestoreService
	googleSheetsService *services.GoogleSheetsService
}

func NewSubmissionHandler(firestoreService *services.FirestoreService, googleSheetsService *services.GoogleSheetsService) *SubmissionHandler {
	return &SubmissionHandler{
		firestoreService:    firestoreService,
		googleSheetsService: googleSheetsService,
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

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")

	ctx := sh.firestoreService.Context()
	query := sh.firestoreService.Submissions().Query

	if user.Role != "admin" {
		query = query.Where("user_id", "==", user.ID)
	}

	if status != "" {
		query = query.Where("status", "==", status)
	}

	query = query.OrderBy("created_at", firestore.Desc)

	if page > 1 {
		query = query.Offset((page - 1) * limit)
	}
	query = query.Limit(limit)

	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve submissions",
		})
		return
	}

	var submissions []models.Submission
	fieldIDs := []string{}
	for _, doc := range docs {
		var submission models.Submission
		doc.DataTo(&submission)
		submissions = append(submissions, submission)
		if submission.FieldID != "" {
			fieldIDs = append(fieldIDs, submission.FieldID)
		}
	}

	fieldsMap := make(map[string]*models.Field)
	if len(fieldIDs) > 0 {
		fieldDocs, err := sh.firestoreService.Fields().Where("id", "in", fieldIDs).Documents(ctx).GetAll()
		if err == nil {
			for _, fieldDoc := range fieldDocs {
				var field models.Field
				fieldDoc.DataTo(&field)
				fieldsMap[field.ID] = &field
			}
		}
	}

	var submissionsResponse []models.SubmissionResponse
	for _, submission := range submissions {
		submissionsResponse = append(submissionsResponse, models.SubmissionResponse{
			ID:                submission.ID,
			UserID:            submission.UserID,
			FieldID:           submission.FieldID,
			Field:             fieldsMap[submission.FieldID],
			OtherFieldName:    submission.OtherFieldName,
			Date:              submission.Date,
			GrowthStage:       submission.GrowthStage,
			PlantConditions:   submission.PlantConditions,
			TraitMeasurements: submission.TraitMeasurements,
			Notes:             submission.Notes,
			ObserverName:      submission.ObserverName,
			Images:            submission.Images,
			Videos:            submission.Videos,
			Audio:             submission.Audio,
			Status:            submission.Status,
			Coordinates:       submission.Coordinates,
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

	fmt.Printf("Received PlantConditions: %+v\n", req.PlantConditions)

	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	// If OtherFieldName is provided, create a new field first
	// if req.OtherFieldName != "" {
	// 	newField := &models.Field{
	// 		ID:        utils.GenerateID(),
	// 		Name:      req.OtherFieldName,
	// 		OwnerID:   user.ID, // Or based on your logic
	// 		CreatedAt: time.Now(),
	// 		UpdatedAt: time.Now(),
	// 	}
	// 	// Save the new field to Firestore
	// 	ctx := sh.firestoreService.Context()
	// 	_, err := sh.firestoreService.Fields().Doc(newField.ID).Set(ctx, newField)
	// 	if err != nil {
	// 		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
	// 			Error:   "internal_error",
	// 			Message: "Failed to create new field",
	// 		})
	// 		return
	// 	}
	// 	// Update the request's FieldID to the new field's ID
	// 	req.FieldID = newField.ID
	// }

	submission := &models.Submission{
		ID:                utils.GenerateID(),
		UserID:            user.ID,
		FieldID:           req.FieldID,
		OtherFieldName:    req.OtherFieldName,
		Date:              req.Date,
		GrowthStage:       req.GrowthStage,
		PlantConditions:   req.PlantConditions,
		TraitMeasurements: req.TraitMeasurements,
		Coordinates:       req.Coordinates,
		Notes:             req.Notes,
		ObserverName:      req.ObserverName,
		Images:            req.Images,
		Videos:            req.Videos,
		Audio:             req.Audio,
		Status:            "submitted",
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	fmt.Printf("Creating submission: %+v\n", submission)

	ctx := sh.firestoreService.Context()
	_, err := sh.firestoreService.Submissions().Doc(submission.ID).Set(ctx, submission)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create submission",
		})
		return
	}

	fmt.Printf("Field id: %+v\n", req.FieldID)
	fmt.Printf("Other field name: %+v\n", req.OtherFieldName)

	// Get field name for Google Sheet
	var fieldName string
	if submission.FieldID != "" && submission.FieldID != "others" {
		fieldDoc, err := sh.firestoreService.Fields().Doc(submission.FieldID).Get(ctx)
		if err == nil {
			var field models.Field
			fieldDoc.DataTo(&field)
			fieldName = field.Name
		}
	} else {
		fieldName = submission.OtherFieldName
	}

	// Append to Google Sheet
	go func() {
		if err_gs := sh.googleSheetsService.AppendSubmission(submission, fieldName); err_gs != nil {
			fmt.Printf("Failed to append submission to Google Sheet: %v\n", err_gs)
		}
	}()

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

	var field *models.Field

	if submission.FieldID != "others" && submission.FieldID != "" {
		field_doc, err := sh.firestoreService.Fields().Doc(submission.FieldID).Get(ctx)
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
	} else if submission.OtherFieldName != "" {
		field = &models.Field{
			ID:   "others",
			Name: submission.OtherFieldName,
		}
	}

	submissionResponse := models.SubmissionResponse{
		ID:                submission.ID,
		UserID:            submission.UserID,
		FieldID:           submission.FieldID,
		OtherFieldName:    submission.OtherFieldName,
		Field:             field,
		Date:              submission.Date,
		GrowthStage:       submission.GrowthStage,
		PlantConditions:   submission.PlantConditions,
		TraitMeasurements: submission.TraitMeasurements,
		Notes:             submission.Notes,
		ObserverName:      submission.ObserverName,
		Images:            submission.Images,
		Videos:            submission.Videos,
		Audio:             submission.Audio,
		Status:            submission.Status,
		Coordinates:       submission.Coordinates,
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

	var req models.UpdateSubmissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
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

	updates := []firestore.Update{}

	if req.Date != nil {
		updates = append(updates, firestore.Update{Path: "date", Value: *req.Date})
	}
	if req.GrowthStage != nil {
		updates = append(updates, firestore.Update{Path: "growth_stage", Value: *req.GrowthStage})
	}
	if req.PlantConditions != nil {
		updates = append(updates, firestore.Update{Path: "plant_conditions", Value: *req.PlantConditions})
	}
	if req.TraitMeasurements != nil {
		updates = append(updates, firestore.Update{Path: "trait_measurements", Value: *req.TraitMeasurements})
	}
	if req.Coordinates != nil {
		updates = append(updates, firestore.Update{Path: "coordinates", Value: *req.Coordinates})
	}
	if req.Notes != nil {
		updates = append(updates, firestore.Update{Path: "notes", Value: *req.Notes})
	}
	if req.Images != nil {
		updates = append(updates, firestore.Update{Path: "images", Value: req.Images})
	}
	if req.Videos != nil {
		updates = append(updates, firestore.Update{Path: "videos", Value: req.Videos})
	}
	if req.Audio != nil {
		updates = append(updates, firestore.Update{Path: "audio", Value: req.Audio})
	}
	if req.Status != nil {
		updates = append(updates, firestore.Update{Path: "status", Value: *req.Status})
	}
	if req.OtherFieldName != nil {
		updates = append(updates, firestore.Update{Path: "other_field_name", Value: *req.OtherFieldName})
		updates = append(updates, firestore.Update{Path: "field_id", Value: "others"})
	} else if req.FieldID != nil {
		updates = append(updates, firestore.Update{Path: "field_id", Value: *req.FieldID})
	}

	updates = append(updates, firestore.Update{Path: "updated_at", Value: time.Now()})

	fmt.Printf("Updating submission %s with data: %+v\n", submissionID, updates)

	_, err = sh.firestoreService.Submissions().Doc(submissionID).Update(ctx, updates)
	if err != nil {
		fmt.Printf("Failed to update submission %s: %v\n", submissionID, err)
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

	// Get field name for Google Sheet
	var fieldName string
	if submission.FieldID != "" && submission.FieldID != "others" {
		fieldDoc, err := sh.firestoreService.Fields().Doc(submission.FieldID).Get(ctx)
		if err == nil {
			var field models.Field
			fieldDoc.DataTo(&field)
			fieldName = field.Name
		}
	} else {
		fieldName = submission.OtherFieldName
	}

	// Update Google Sheet in a goroutine
	go func() {
		if err_gs := sh.googleSheetsService.UpdateSubmission(&submission, fieldName); err_gs != nil {
			fmt.Printf("Failed to update submission in Google Sheet: %v\n", err_gs)
		}
	}()

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

	if user.Role != "admin" {
		query = query.Where("user_id", "==", user.ID)
	}

	iter := query.Documents(ctx)

	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=submissions.csv")

	writer := csv.NewWriter(c.Writer)

	header := []string{
		"ID", "UserID", "FieldID", "FieldName", "Date", "GrowthStage",
		"Notes", "ObserverName", "Status", "CreatedAt", "UpdatedAt",
		"Latitude", "Longitude",
		"CulmLength", "PanicleLength", "PaniclesPerHill", "HillsObserved",
		"Healthy", "Unhealthy", "SignsOfPestInfestation", "PestDetails", "OtherPest",
		"SignsOfNutrientDeficiency", "NutrientDeficiencyDetails", "OtherNutrient",
		"WaterStress", "WaterStressLevel", "Lodging", "LodgingLevel",
		"WeedInfestation", "WeedInfestationLevel", "DiseaseSymptoms", "DiseaseDetails", "OtherDisease",
		"Other", "OtherConditionText",
		"Images", "Videos", "Audio",
	}
	writer.Write(header)

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

		// Get Field Name
		var fieldName string
		if submission.FieldID != "" {
			fieldDoc, err := sh.firestoreService.Fields().Doc(submission.FieldID).Get(ctx)
			if err == nil {
				var field models.Field
				fieldDoc.DataTo(&field)
				fieldName = field.Name
			}
		}

		record := []string{
			submission.ID,
			submission.UserID,
			submission.FieldID,
			fieldName,
			submission.Date.Format(time.RFC3339),
			submission.GrowthStage,
			submission.Notes,
			submission.ObserverName,
			submission.Status,
			submission.CreatedAt.Format(time.RFC3339),
			submission.UpdatedAt.Format(time.RFC3339),
			fmt.Sprintf("%f", submission.Coordinates.Latitude),
			fmt.Sprintf("%f", submission.Coordinates.Longitude),
			fmt.Sprintf("%f", submission.TraitMeasurements.CulmLength),
			fmt.Sprintf("%f", submission.TraitMeasurements.PanicleLength),
			strconv.Itoa(submission.TraitMeasurements.PaniclesPerHill),
			strconv.Itoa(submission.TraitMeasurements.HillsObserved),
			strconv.FormatBool(submission.PlantConditions.Healthy),
			strconv.FormatBool(submission.PlantConditions.Unhealthy),
			strconv.FormatBool(submission.PlantConditions.SignsOfPestInfestation),
			mapToString(submission.PlantConditions.PestDetails),
			submission.PlantConditions.OtherPest,
			strconv.FormatBool(submission.PlantConditions.SignsOfNutrientDeficiency),
			mapToString(submission.PlantConditions.NutrientDeficiencyDetails),
			submission.PlantConditions.OtherNutrient,
			strconv.FormatBool(submission.PlantConditions.WaterStress),
			submission.PlantConditions.WaterStressLevel,
			strconv.FormatBool(submission.PlantConditions.Lodging),
			submission.PlantConditions.LodgingLevel,
			strconv.FormatBool(submission.PlantConditions.WeedInfestation),
			submission.PlantConditions.WeedInfestationLevel,
			strconv.FormatBool(submission.PlantConditions.DiseaseSymptoms),
			mapToString(submission.PlantConditions.DiseaseDetails),
			submission.PlantConditions.OtherDisease,
			strconv.FormatBool(submission.PlantConditions.Other),
			submission.PlantConditions.OtherConditionText,
			strings.Join(submission.Images, ","),
			strings.Join(submission.Videos, ","),
			strings.Join(submission.Audio, ","),
		}
		writer.Write(record)
	}

	writer.Flush()
}

func mapToString(m map[string]bool) string {
	var parts []string
	for key, value := range m {
		if value {
			parts = append(parts, key)
		}
	}
	return strings.Join(parts, ", ")
}
