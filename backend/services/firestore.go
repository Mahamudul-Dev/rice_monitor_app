package services

import (
	"context"
	"os"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"google.golang.org/api/option"
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

	var sa option.ClientOption
	if _, err := os.Stat("/etc/secrets/firebase-admin-service-account.json"); err == nil {
		sa = option.WithCredentialsFile("/etc/secrets/firebase-admin-service-account.json")
	} else {
		sa = option.WithCredentialsFile("firebase-admin-service-account.json")
	}

	app, err := firebase.NewApp(ctx, &firebase.Config{
		ProjectID: projectID,
	}, sa)
	if err != nil {
		return nil, err
	}

	client, err := app.Firestore(ctx)
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

func (fs *FirestoreService) Sheets() *firestore.CollectionRef {
	return fs.Client.Collection("sheets")
}

// Context getter
func (fs *FirestoreService) Context() context.Context {
	return fs.ctx
}
