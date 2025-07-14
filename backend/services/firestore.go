package services

import (
	"context"
	"os"

	"cloud.google.com/go/firestore"
)

type FirestoreService struct {
	Client *firestore.Client
	ctx    context.Context
}

func NewFirestoreService(ctx context.Context) (*FirestoreService, error) {
	projectID := os.Getenv("GOOGLE_CLOUD_PROJECT")
	if projectID == "" {
		projectID = "rice-monitor-dev" // fallback for development
	}

	client, err := firestore.NewClient(ctx, projectID)
	if err != nil {
		return nil, err
	}

	return &FirestoreService{
		Client: client,
		ctx:    ctx,
	}, nil
}

func (fs *FirestoreService) Close() error {
	return fs.Client.Close()
}

// Collection helpers
func (fs *FirestoreService) Users() *firestore.CollectionRef {
	return fs.Client.Collection("users")
}

func (fs *FirestoreService) Submissions() *firestore.CollectionRef {
	return fs.Client.Collection("submissions")
}

func (fs *FirestoreService) Fields() *firestore.CollectionRef {
	return fs.Client.Collection("fields")
}

// Context getter
func (fs *FirestoreService) Context() context.Context {
	return fs.ctx
}
