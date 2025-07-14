package handlers

import (
	"net/http"
	"time"

	"rice-monitor-api/models"
	"rice-monitor-api/services"

	"cloud.google.com/go/firestore"
	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	firestoreService *services.FirestoreService
}

func NewUserHandler(firestoreService *services.FirestoreService) *UserHandler {
	return &UserHandler{
		firestoreService: firestoreService,
	}
}

// @Summary Get user by ID
// @Description Get a single user by their ID
// @Tags users
// @Produce  json
// @Security ApiKeyAuth
// @Param id path string true "User ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 404 {object} models.ErrorResponse
// @Router /users/{id} [get]
func (uh *UserHandler) GetUser(c *gin.Context) {
	userID := c.Param("id")
	currentUser, _ := c.Get("user")
	currentUserObj := currentUser.(*models.User)

	// Check if user can access this user's data
	if currentUserObj.ID != userID && currentUserObj.Role != "admin" {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "Access denied",
		})
		return
	}

	user, err := uh.getUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "not_found",
			Message: "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data:    user,
	})
}

// @Summary Update user
// @Description Update an existing user
// @Tags users
// @Accept  json
// @Produce  json
// @Security ApiKeyAuth
// @Param id path string true "User ID"
// @Param user body object true "User object that needs to be updated"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /users/{id} [put]
func (uh *UserHandler) UpdateUser(c *gin.Context) {
	userID := c.Param("id")
	currentUser, _ := c.Get("user")
	currentUserObj := currentUser.(*models.User)

	// Check if user can update this user's data
	if currentUserObj.ID != userID && currentUserObj.Role != "admin" {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "Access denied",
		})
		return
	}

	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: err.Error(),
		})
		return
	}

	// Remove sensitive fields
	delete(updateData, "id")
	delete(updateData, "email")
	delete(updateData, "created_at")
	updateData["updated_at"] = time.Now()

	// Only admin can change role
	if currentUserObj.Role != "admin" {
		delete(updateData, "role")
	}

	ctx := uh.firestoreService.Context()

	// Update document
	updates := []firestore.Update{{Path: "updated_at", Value: time.Now()}}
	for key, value := range updateData {
		updates = append(updates, firestore.Update{Path: key, Value: value})
	}

	_, err := uh.firestoreService.Users().Doc(userID).Update(ctx, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to update user",
		})
		return
	}

	// Get updated user
	user, err := uh.getUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to retrieve updated user",
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data:    user,
		Message: "User updated successfully",
	})
}

// @Summary Delete user
// @Description Delete a user by their ID
// @Tags users
// @Produce  json
// @Security ApiKeyAuth
// @Param id path string true "User ID"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /users/{id} [delete]
func (uh *UserHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("id")
	currentUser, _ := c.Get("user")
	currentUserObj := currentUser.(*models.User)

	// Only admin can delete users
	if currentUserObj.Role != "admin" {
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "Only administrators can delete users",
		})
		return
	}

	// Prevent admin from deleting themselves
	if currentUserObj.ID == userID {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: "Cannot delete your own account",
		})
		return
	}

	ctx := uh.firestoreService.Context()
	_, err := uh.firestoreService.Users().Doc(userID).Delete(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "internal_error",
			Message: "Failed to delete user",
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "User deleted successfully",
	})
}

// Helper function
func (uh *UserHandler) getUserByID(userID string) (*models.User, error) {
	ctx := uh.firestoreService.Context()
	doc, err := uh.firestoreService.Users().Doc(userID).Get(ctx)
	if err != nil {
		return nil, err
	}

	var user models.User
	err = doc.DataTo(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}
