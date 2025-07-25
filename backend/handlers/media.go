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

type MediaHandler struct {
	storageService   *services.StorageService
	firestoreService *services.FirestoreService
}

func NewMediaHandler(storageService *services.StorageService, firestoreService *services.FirestoreService) *MediaHandler {
	return &MediaHandler{
		storageService:   storageService,
		firestoreService: firestoreService,
	}
}

// @Summary Upload a media file (image, video, or audio)
// @Description Upload a media file for a submission
// @Tags media
// @Accept  multipart/form-data
// @Produce  json
// @Security ApiKeyAuth
// @Param submission_id formData string true "Submission ID"
// @Param file_type formData string true "Type of file (image, video, audio)"
// @Param file formData file true "Media file"
// @Success 200 {object} models.SuccessResponse
// @Failure 400 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /media/upload [post]
func (mh *MediaHandler) UploadMedia(c *gin.Context) {
	submissionID := c.PostForm("submission_id")
	fileType := c.PostForm("file_type")

	if submissionID == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: "submission_id is required",
		})
		return
	}
	if fileType == "" {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_request",
			Message: "file_type is required",
		})
		return
	}

	// Get uploaded file
	file, header, err := c.Request.FormFile("file")
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
	if !utils.ValidateMediaType(header.Filename, fileType) {
		c.JSON(http.StatusBadRequest, models.ErrorResponse{
			Error:   "invalid_file_type",
			Message: fmt.Sprintf("Unsupported file type for %s", fileType),
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
	ctx := mh.storageService.Context()
	obj := mh.storageService.Bucket().Object(filename)

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
		fmt.Printf("Failed to make object public: %v", err)
	}

	// Generate public URL
	mediaURL := fmt.Sprintf("https://storage.googleapis.com/%s/%s",
		mh.storageService.BucketName, filename)

	// Update submission with media URL if it's a real submission
	if submissionID != "" && submissionID[:5] != "temp_" {
		err = mh.addMediaToSubmission(submissionID, mediaURL, fileType)
		if err != nil {
			c.JSON(http.StatusInternalServerError, models.ErrorResponse{
				Error:   "internal_error",
				Message: "Failed to update submission with media",
			})
			return
		}
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Data: map[string]interface{}{
			"filename":  filename,
			"url":       mediaURL,
			"file_type": fileType,
		},
		Message: "Media uploaded successfully",
	})
}

// @Summary Get a media file
// @Description Get a media file by its filename
// @Tags media
// @Param filename path string true "Media filename"
// @Success 308 {string} string "Redirects to the media URL"
// @Router /media/{filename} [get]
func (mh *MediaHandler) GetMedia(c *gin.Context) {
	filename := c.Param("filename")

	// Redirect to Google Cloud Storage public URL
	mediaURL := fmt.Sprintf("https://storage.googleapis.com/%s/%s",
		mh.storageService.BucketName, filename)

	c.Redirect(http.StatusPermanentRedirect, mediaURL)
}

// @Summary Delete a media file
// @Description Delete a media file by its filename
// @Tags media
// @Produce  json
// @Security ApiKeyAuth
// @Param filename path string true "Media filename"
// @Success 200 {object} models.SuccessResponse
// @Failure 403 {object} models.ErrorResponse
// @Failure 500 {object} models.ErrorResponse
// @Router /media/{filename} [delete]
func (mh *MediaHandler) DeleteMedia(c *gin.Context) {
	filename := c.Param("filename")
	currentUser, _ := c.Get("user")
	user := currentUser.(*models.User)

	// Only admin or the owner can delete media
	if user.Role != "admin" {
		// TODO: Implement proper ownership check based on submission ID
		c.JSON(http.StatusForbidden, models.ErrorResponse{
			Error:   "forbidden",
			Message: "Access denied",
		})
		return
	}

	ctx := mh.storageService.Context()
	obj := mh.storageService.Bucket().Object(filename)

	if err := obj.Delete(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "delete_failed",
			Message: "Failed to delete media",
		})
		return
	}

	c.JSON(http.StatusOK, models.SuccessResponse{
		Success: true,
		Message: "Media deleted successfully",
	})
}

func (mh *MediaHandler) addMediaToSubmission(submissionID, mediaURL, fileType string) error {
	ctx := mh.firestoreService.Context()
	docRef := mh.firestoreService.Submissions().Doc(submissionID)

	return mh.firestoreService.Client.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(docRef)
		if err != nil {
			return err
		}

		var submission models.Submission
		doc.DataTo(&submission)

		switch fileType {
		case "image":
			submission.Images = append(submission.Images, mediaURL)
		case "video":
			submission.Videos = append(submission.Videos, mediaURL)
		case "audio":
			submission.Audio = append(submission.Audio, mediaURL)
		}
		submission.UpdatedAt = time.Now()

		return tx.Set(docRef, submission)
	})
}
