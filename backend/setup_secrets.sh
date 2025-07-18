#!/bin/bash

# This script automates the creation of secrets in Google Secret Manager and
# grants the necessary permissions to a service account for Cloud Run.

# --- PLEASE CONFIGURE THE FOLLOWING VARIABLES ---

# 1. The email address of the service account used by your Cloud Run service.
SERVICE_ACCOUNT_EMAIL="rice-field-monitor@aicoexist-446217.iam.gserviceaccount.com"

# 2. The path to your Firebase Admin SDK service account JSON file.
FIREBASE_ADMIN_JSON_PATH="./firebase-admin-service-account.json"

# 3. The values for your application secrets.
GOOGLE_CLIENT_ID="REPLACE_WITH_YOUR_GOOGLE_CLIENT_ID"
JWT_SECRET="REPLACE_WITH_YOUR_JWT_SECRET"
GOOGLE_API_KEY="REPLACE_WITH_YOUR_GOOGLE_API_KEY"

# --- END OF CONFIGURATION ---

# Enable the Secret Manager API if it's not already enabled.
echo "🔑 Enabling Secret Manager API..."
gcloud services enable secretmanager.googleapis.com

# --- Create Secrets and Add Versions ---

echo "
🔐 Creating and setting secret: firebase-admin-credentials..."
gcloud secrets create firebase-admin-credentials --replication-policy="automatic" --quiet
gcloud secrets versions add firebase-admin-credentials --data-file="$FIREBASE_ADMIN_JSON_PATH" --quiet

echo "
🔐 Creating and setting secret: google-client-id..."
gcloud secrets create google-client-id --replication-policy="automatic" --quiet
echo -n "$GOOGLE_CLIENT_ID" | gcloud secrets versions add google-client-id --data-file=- --quiet

echo "
🔐 Creating and setting secret: jwt-secret..."
gcloud secrets create jwt-secret --replication-policy="automatic" --quiet
echo -n "$JWT_SECRET" | gcloud secrets versions add jwt-secret --data-file=- --quiet

echo "
🔐 Creating and setting secret: google-api-key..."
gcloud secrets create google-api-key --replication-policy="automatic" --quiet
echo -n "$GOOGLE_API_KEY" | gcloud secrets versions add google-api-key --data-file=- --quiet

# --- Grant Service Account Access ---

echo "
 granting access to firebase-admin-credentials..."
gcloud secrets add-iam-policy-binding firebase-admin-credentials \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/secretmanager.secretAccessor" --quiet

echo "
 granting access to google-client-id..."
gcloud secrets add-iam-policy-binding google-client-id \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/secretmanager.secretAccessor" --quiet

echo "
 granting access to jwt-secret..."
gcloud secrets add-iam-policy-binding jwt-secret \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/secretmanager.secretAccessor" --quiet

echo "
 granting access to google-api-key..."
gcloud secrets add-iam-policy-binding google-api-key \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/secretmanager.secretAccessor" --quiet

echo "
✅ All secrets created and permissions granted successfully."
