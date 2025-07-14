package services

import (
	"context"
	"os"

	"cloud.google.com/go/storage"
)

type StorageService struct {
	Client     *storage.Client
	BucketName string
	ctx        context.Context
}

func NewStorageService(ctx context.Context) (*StorageService, error) {
	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, err
	}

	bucketName := os.Getenv("STORAGE_BUCKET")
	if bucketName == "" {
		bucketName = "rice-monitor-images-dev" // fallback for development
	}

	return &StorageService{
		Client:     client,
		BucketName: bucketName,
		ctx:        ctx,
	}, nil
}

func (ss *StorageService) Close() error {
	return ss.Client.Close()
}

func (ss *StorageService) Bucket() *storage.BucketHandle {
	return ss.Client.Bucket(ss.BucketName)
}

func (ss *StorageService) Context() context.Context {
	return ss.ctx
}
