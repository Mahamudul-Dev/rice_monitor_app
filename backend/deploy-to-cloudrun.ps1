# ==== CONFIGURATION ====
$PROJECT_ID = "aicoexist-446217"
$REGION = "us-central1"
$REPO_NAME = "aisense-repo"
$IMAGE_NAME = "rice_monitor_api"
$SERVICE_NAME = "rice-monitor-api"
$PORT = 8989

$ENV_FILE = ".env"
$ENV_VARS_FILE = "env.yaml"

# ==== FULL IMAGE PATH ====
$FULL_IMAGE_PATH = "$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME/$IMAGE_NAME"

# ==== STEP 1: Authenticate Docker to Artifact Registry ====
Write-Host "🟡 Authenticating Docker with Artifact Registry..."
gcloud auth configure-docker "$REGION-docker.pkg.dev" | Out-Null

# ==== STEP 2: Build Docker Image ====
Write-Host "🔨 Building Docker image..."
docker build -t $FULL_IMAGE_PATH .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed. Exiting."
    exit 1
}

# ==== STEP 3: Push Docker Image ====
Write-Host "🚀 Pushing image to Google Artifact Registry..."
docker push $FULL_IMAGE_PATH

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker push failed. Exiting."
    exit 1
}

# ==== STEP 4: Convert .env to env.yaml if needed ====
if ((Test-Path $ENV_FILE) -and !(Test-Path $ENV_VARS_FILE)) {
    Write-Host "🔁 Converting .env to env.yaml..."
    Get-Content $ENV_FILE |
        Where-Object { $_ -notmatch '^#' -and $_ -match '=' } |
        ForEach-Object {
            $parts = $_ -split '=', 2
            "$($parts[0].Trim()): $($parts[1].Trim())"
        } | Set-Content $ENV_VARS_FILE
    Write-Host "✅ Created env.yaml from .env"
}

# ==== STEP 5: Deploy to Cloud Run ====
Write-Host "🌐 Deploying to Cloud Run..."
if (Test-Path $ENV_VARS_FILE) {
    Write-Host "🌐 Deploying with environment variables from $ENV_VARS_FILE..."
    gcloud run deploy $SERVICE_NAME `
      --image=$FULL_IMAGE_PATH `
      --platform=managed `
      --service-account=rice-field-monitor@aicoexist-446217.iam.gserviceaccount.com `
      --region=$REGION `
      --project=$PROJECT_ID `
      --port=$PORT `
      --allow-unauthenticated `
      --env-vars-file=$ENV_VARS_FILE `
      --timeout=500s
} else {
    Write-Host "⚠️ env.yaml not found. Deploying without environment variables..."
    gcloud run deploy $SERVICE_NAME `
      --image=$FULL_IMAGE_PATH `
      --platform=managed `
      --service-account=rice-field-monitor@aicoexist-446217.iam.gserviceaccount.com `
      --region=$REGION `
      --project=$PROJECT_ID `
      --port=$PORT `
      --allow-unauthenticated `
      --timeout=500s
}

# ==== RESULT ====
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Successfully deployed $SERVICE_NAME to Cloud Run!"
} else {
    Write-Host "`n❌ Cloud Run deployment failed."
}
