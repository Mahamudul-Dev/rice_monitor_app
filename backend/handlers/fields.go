package handlers

import (
	"net/http"
	"time"

	"rice-monitor-api/models"
	"rice-monitor-api/services"
	"rice-monitor-api/utils"

	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
)

type FieldHandler struct {
	firestoreService *services.FirestoreService
}

func NewFieldHandler(firestoreService *services.FirestoreService) *FieldHandler {
	return &FieldHandler{
		firestoreService: firestoreService,
	}
}

// @Summary Get all fields
// @Description Get a list of all fields for the user
// @Tags fields
// @Produce  json
// @Security ApiKeyAuth
// @Success 200 {object} models.SuccessResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /fields [get]
func (fh *FieldHandler) GetFields(c *gin.Context) {
	ctx := fh.firestoreService.Context()
	query := fh.firestoreService.Fields().Query

	docs, err := query.Documents(ctx).GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve fields",
		})
		return
	}

	var fields []models.Field
	for _, doc := range docs {
		var field models.Field
		doc.DataTo(&field)
		fields = append(fields, field)
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data:    fields,
	})
}

// @Summary Create a new field
// @Description Create a new field for the user
// @Tags fields
// @Accept  json
// @Produce  json
// @Security ApiKeyAuth
// @Param field body models.CreateFieldRequest true "Field object that needs to be added"
// @Success 201 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /fields [post]
func (fh *FieldHandler) CreateField(c *gin.Context) {
	var req models.CreateFieldRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	field := models.Field{
		ID:          utils.GenerateID(),
		Name:        req.Name,
		RiceVariety:   req.RiceVariety,
		TentativeDate: req.TentativeDate,
		Location:    req.Location,
		Coordinates: req.Coordinates,
		Area:        req.Area,
		OwnerID:     user.ID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	ctx := fh.firestoreService.Context()
	_, err := fh.firestoreService.Fields().Doc(field.ID).Set(ctx, field)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to create field",
		})
		return
	}

	c.JSON(http.StatusCreated, models.SuccessResponse{
		Success: true,
		Data:    field,
		Message: "Field created successfully",
	})
}

// @Summary Get a field by ID
// @Description Get a single field by its ID
// @Tags fields
// @Produce  json
// @Security ApiKeyAuth
// @Param id path string true "Field ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Router /fields/{id} [get]
func (fh *FieldHandler) GetField(c *gin.Context) {
	fieldID := c.Param("id")
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	field, err := fh.getFieldByID(fieldID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Field not found",
		})
		return
	}

	// Check if user can access this field
	if user.Role != "admin" && field.OwnerID != user.ID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "Access denied",
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data:    field,
	})
}

// @Summary Update a field
// @Description Update an existing field
// @Tags fields
// @Accept  json
// @Produce  json
// @Security ApiKeyAuth
// @Param id path string true "Field ID"
// @Param field body object true "Field object that needs to be updated"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /fields/{id} [put]
func (fh *FieldHandler) UpdateField(c *gin.Context) {
	fieldID := c.Param("id")
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

	// Get existing field
	field, err := fh.getFieldByID(fieldID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Field not found",
		})
		return
	}

	// Check permissions
	if user.Role != "admin" && field.OwnerID != user.ID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "Access denied",
		})
		return
	}

	// Remove sensitive fields
	delete(updateData, "id")
	delete(updateData, "owner_id")
	delete(updateData, "created_at")
	updateData["updated_at"] = time.Now()

	ctx := fh.firestoreService.Context()

	// Update document
	updates := []firestore.Update{{Path: "updated_at", Value: time.Now()}}
	for key, value := range updateData {
		updates = append(updates, firestore.Update{Path: key, Value: value})
	}

	_, err = fh.firestoreService.Fields().Doc(fieldID).Update(ctx, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update field",
		})
		return
	}

	// Get updated field
	updatedField, err := fh.getFieldByID(fieldID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve updated field",
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data:    updatedField,
		Message: "Field updated successfully",
	})
}

// @Summary Delete a field
// @Description Delete a field by its ID
// @Tags fields
// @Produce  json
// @Security ApiKeyAuth
// @Param id path string true "Field ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /fields/{id} [delete]
func (fh *FieldHandler) DeleteField(c *gin.Context) {
	fieldID := c.Param("id")
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	// Get existing field
	field, err := fh.getFieldByID(fieldID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "Field not found",
		})
		return
	}

	// Check permissions
	if user.Role != "admin" && field.OwnerID != user.ID {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "Access denied",
		})
		return
	}

	ctx := fh.firestoreService.Context()

	// Delete field
	_, err = fh.firestoreService.Fields().Doc(fieldID).Delete(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to delete field",
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Field deleted successfully",
	})
}

// Helper function
func (fh *FieldHandler) getFieldByID(fieldID string) (*models.Field, error) {
	ctx := fh.firestoreService.Context()
	doc, err := fh.firestoreService.Fields().Doc(fieldID).Get(ctx)
	if err != nil {
		return nil, err
	}

	var field models.Field
	err = doc.DataTo(&field)
	if err != nil {
		return nil, err
	}

	return &field, nil
}
