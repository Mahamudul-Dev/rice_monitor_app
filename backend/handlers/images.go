package handlers

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"time"

	"rice-monitor-api/models"
	"rice-monitor-api/services"
	"rice-monitor-api/utils"

	"cloud.google.com/go/firestore"
	"cloud.google.com/go/storage"
	"github.com/gin-gonic/gin"
)

type ImageHandler struct {
	storageService   *services.StorageService
	firestoreService *services.FirestoreService
}

func NewImageHandler(storageService *services.StorageService, firestoreService *services.FirestoreService) *ImageHandler {
	return &ImageHandler{
		storageService:   storageService,
		firestoreService: firestoreService,
	}
}

// @Summary Upload an image
// @Description Upload an image for a submission
// @Tags images
// @Accept  multipart/form-data
// @Produce  json
// @Security ApiKeyAuth
// @Param submission_id formData string true "Submission ID"
// @Param image formData file true "Image file"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /images/upload [post]
func (ih *ImageHandler) UploadImage(c *gin.Context) {
	submissionID := c.PostForm("submission_id")
	if submissionID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: "submission_id is required",
		})
		return
	}

	// Get uploaded file
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: "No file uploaded",
		})
		return
	}
	defer file.Close()

	// Validate file type
	ext := filepath.Ext(header.Filename)
	if !utils.ValidateFileType(header.Filename) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_file_type",
			Message: "Only JPG, JPEG, PNG, and WebP files are allowed",
		})
		return
	}

	// Generate unique filename
	filename := fmt.Sprintf("%s/%s_%s%s",
		submissionID,
		utils.GenerateID(),
		time.Now().Format("20060102_150405"),
		ext)

	// Upload to Google Cloud Storage
	ctx := ih.storageService.Context()
	obj := ih.storageService.Bucket().Object(filename)

	wc := obj.NewWriter(ctx)
	wc.ContentType = header.Header.Get("Content-Type")

	if _, err := io.Copy(wc, file); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "upload_failed",
			Message: "Failed to upload file",
		})
		return
	}

	if err := wc.Close(); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "upload_failed",
			Message: "Failed to finalize upload",
		})
		return
	}

	// Make the object publicly accessible
	if err := obj.ACL().Set(ctx, storage.AllUsers, storage.RoleReader); err != nil {
		// Log error but don't fail the request
		fmt.Printf("Failed to make object public: %v\n", err)
	}

	// Generate public URL
	imageURL := fmt.Sprintf("https://storage.googleapis.com/%s/%s",
		ih.storageService.BucketName, filename)

	// Update submission with image URL if it's a real submission
	if submissionID != "" && submissionID[:5] != "temp_" {
		err = ih.addImageToSubmission(submissionID, imageURL)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error:   "internal_error",
				Message: "Failed to update submission with image",
			})
			return
		}
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data: map[string]interface{}{
			"filename": filename,
			"url":      imageURL,
		},
		Message: "Image uploaded successfully",
	})
}

// @Summary Get an image
// @Description Get an image by its filename
// @Tags images
// @Param filename path string true "Image filename"
// @Success 308 {string} string "Redirects to the image URL"
// @Router /images/{filename} [get]
func (ih *ImageHandler) GetImage(c *gin.Context) {
	filename := c.Param("filename")

	// Redirect to Google Cloud Storage public URL
	imageURL := fmt.Sprintf("https://storage.googleapis.com/%s/%s",
		ih.storageService.BucketName, filename)

	c.Redirect(http.StatusPermanentRedirect, imageURL)
}

// @Summary Delete an image
// @Description Delete an image by its filename
// @Tags images
// @Produce  json
// @Security ApiKeyAuth
// @Param filename path string true "Image filename"
// @Success 200 {object} models.SuccessResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /images/{filename} [delete]
func (ih *ImageHandler) DeleteImage(c *gin.Context) {
	filename := c.Param("filename")
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	// Only admin or the owner can delete images
	if user.Role != "admin" {
		// TODO: Check if user owns the submission
		// Extract submission ID from filename (first part before first underscore)
		// This is a simplified check
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "Access denied",
		})
		return
	}

	ctx := ih.storageService.Context()
	obj := ih.storageService.Bucket().Object(filename)

	if err := obj.Delete(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "delete_failed",
			Message: "Failed to delete image",
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Image deleted successfully",
	})
}

func (ih *ImageHandler) addImageToSubmission(submissionID, imageURL string) error {
	ctx := ih.firestoreService.Context()
	docRef := ih.firestoreService.Submissions().Doc(submissionID)

	return ih.firestoreService.Client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(docRef)
		if err != nil {
			return err
		}

		var submission models.Submission
		doc.DataTo(&submission)

		submission.Images = append(submission.Images, imageURL)
		submission.UpdatedAt = time.Now()

		return tx.Set(docRef, submission)
	})
}
