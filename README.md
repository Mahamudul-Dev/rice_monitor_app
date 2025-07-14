# 🌾 Rice Monitor - Complete Project

A comprehensive rice field monitoring application with React frontend and Go backend, designed for agricultural data collection and analysis.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Backend Setup](#backend-setup)
- [Frontend Setup](#frontend-setup)
- [Google Cloud Setup](#google-cloud-setup)
- [Environment Configuration](#environment-configuration)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

Rice Monitor is a modern web application that enables agricultural researchers, farmers, and field workers to efficiently collect, store, and analyze rice field monitoring data. The application supports real-time data entry, image upload, and comprehensive reporting.

### Key Benefits
- **Mobile-First Design**: Optimized for field use on mobile devices
- **Offline Capabilities**: Continue working without internet connection
- **Real-time Sync**: Automatic data synchronization when online
- **Professional Analytics**: Comprehensive data analysis and reporting
- **Secure Authentication**: Google OAuth integration
- **Scalable Architecture**: Built for enterprise-level usage

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Go API        │    │  Google Cloud   │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Services)    │
│                 │    │                 │    │                 │
│ • Authentication│    │ • REST API      │    │ • Firestore DB  │
│ • Form UI       │    │ • JWT Auth      │    │ • Cloud Storage │
│ • Data Display  │    │ • File Upload   │    │ • OAuth Service │
│ • PWA Features  │    │ • Analytics     │    │ • Hosting       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ✨ Features

### 🔐 Authentication
- Google OAuth 2.0 integration
- JWT token-based authentication
- Role-based access control (Admin, Researcher, Observer)
- Secure session management

### 📝 Data Collection
- Comprehensive rice monitoring forms
- Growth stage tracking (8 stages supported)
- Plant condition assessment
- Trait measurements (culm length, panicle length, etc.)
- Visual observation notes
- GPS location tracking

### 📸 Image Management
- Multiple image upload support
- Cloud storage integration
- Image compression and optimization
- Drag-and-drop interface

### 📊 Analytics & Reporting
- Dashboard with key metrics
- Trend analysis
- Custom report generation
- Data export (CSV format)
- Field performance tracking

### 📱 Mobile Experience
- Progressive Web App (PWA)
- Responsive design
- Touch-optimized interface
- Offline data collection
- App-like experience

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.0.0 or higher)
- **Go** (v1.21.0 or higher)
- **Git**
- **Google Cloud Account** with billing enabled

### System Requirements
- **Operating System**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Internet connection for Google Cloud services

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/rice-monitor.git
cd rice-monitor
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your configurations
go mod tidy
go run .
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
# Edit .env with your configurations
npm install
npm start
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/health

## 📁 Project Structure

```
rice-monitor/
├── backend/                    # Go API Backend
│   ├── handlers/              # HTTP request handlers
│   │   ├── auth.go           # Authentication handlers
│   │   ├── submissions.go    # Submission CRUD operations
│   │   ├── users.go          # User management
│   │   ├── images.go         # Image upload handling
│   │   ├── fields.go         # Field management
│   │   └── analytics.go      # Analytics and reporting
│   ├── middleware/           # HTTP middleware
│   │   └── auth.go          # Authentication middleware
│   ├── models/              # Data models and structs
│   │   └── models.go        # All data structures
│   ├── services/            # Business logic services
│   │   ├── firestore.go     # Firestore database service
│   │   └── storage.go       # Cloud Storage service
│   ├── utils/               # Utility functions
│   │   └── utils.go         # Helper functions
│   ├── main.go              # Application entry point
│   ├── go.mod               # Go module definition
│   ├── .env                 # Environment variables
│   └── Dockerfile           # Docker configuration
├── frontend/                   # React Frontend
│   ├── public/               # Static assets
│   │   ├── index.html       # HTML template
│   │   └── manifest.json    # PWA manifest
│   ├── src/
│   │   ├── components/      # React components
│   │   │   ├── common/      # Reusable components
│   │   │   │   ├── Button.js
│   │   │   │   ├── Card.js
│   │   │   │   ├── InputField.js
│   │   │   │   └── Toast.js
│   │   │   ├── LoginScreen.js
│   │   │   ├── MonitoringForm.js
│   │   │   └── SubmissionsScreen.js
│   │   ├── services/        # API services
│   │   │   └── apiService.js
│   │   ├── utils/           # Utility functions
│   │   │   └── auth.js      # Authentication utilities
│   │   ├── App.js           # Main app component
│   │   ├── index.js         # Application entry point
│   │   └── index.css        # Global styles
│   ├── package.json         # Dependencies and scripts
│   ├── .env                 # Environment variables
│   └── tailwind.config.js   # Tailwind CSS configuration
├── docs/                      # Documentation
├── scripts/                   # Setup and deployment scripts
├── .gitignore                # Git ignore rules
└── README.md                 # This file
```

## 🔧 Backend Setup

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
go mod tidy
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
```

Edit the `.env` file with your configurations:
```env
GOOGLE_CLOUD_PROJECT=your-project-id
STORAGE_BUCKET=your-storage-bucket
JWT_SECRET=your-super-secret-jwt-key
GOOGLE_API_KEY=your-google-api-key
PORT=8080
```

### 4. Set Up Google Cloud Credentials
```bash
# Download service account key from Google Cloud Console
# Place it as service-account.json in the backend directory
export GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"
```

### 5. Run the Backend
```bash
# Development mode
go run .

# Build and run
go build -o rice-monitor-api
./rice-monitor-api
```

### 6. Verify Backend is Running
```bash
curl http://localhost:8080/health
```

## 🎨 Frontend Setup

### 1. Navigate to Frontend Directory
```bash
cd frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
```

Edit the `.env` file:
```env
REACT_APP_API_URL=http://localhost:8080/api/v1
REACT_APP_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### 4. Install Additional Dependencies
```bash
# Install Tailwind CSS dependencies
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms @tailwindcss/typography
```

### 5. Run the Frontend
```bash
# Development mode
npm start

# Build for production
npm run build

# Serve production build
npm run serve
```

### 6. Verify Frontend is Running
Open http://localhost:3000 in your browser.

## ☁️ Google Cloud Setup

### 1. Create Google Cloud Project
```bash
gcloud projects create rice-monitor-project
gcloud config set project rice-monitor-project
```

### 2. Enable Required APIs
```bash
gcloud services enable firestore.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable oauth2.googleapis.com
```

### 3. Create Service Account
```bash
gcloud iam service-accounts create rice-monitor-api \
    --description="Service account for Rice Monitor API" \
    --display-name="Rice Monitor API"
```

### 4. Generate Service Account Key
```bash
gcloud iam service-accounts keys create ./backend/service-account.json \
    --iam-account=rice-monitor-api@rice-monitor-project.iam.gserviceaccount.com
```

### 5. Grant Permissions
```bash
gcloud projects add-iam-policy-binding rice-monitor-project \
    --member="serviceAccount:rice-monitor-api@rice-monitor-project.iam.gserviceaccount.com" \
    --role="roles/datastore.user"

gcloud projects add-iam-policy-binding rice-monitor-project \
    --member="serviceAccount:rice-monitor-api@rice-monitor-project.iam.gserviceaccount.com" \
    --role="roles/storage.admin"
```

### 6. Create Storage Bucket
```bash
gsutil mb gs://rice-monitor-images-bucket
gsutil cors set cors.json gs://rice-monitor-images-bucket
```

### 7. Set Up OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to APIs & Services > Credentials
3. Create OAuth 2.0 Client ID
4. Add authorized origins: `http://localhost:3000`, `https://yourdomain.com`
5. Copy the Client ID to your frontend `.env` file

## 📝 API Documentation

### Authentication Endpoints
```
POST   /api/v1/auth/google     - Google OAuth login
POST   /api/v1/auth/refresh    - Refresh JWT token
POST   /api/v1/auth/logout     - User logout
GET    /api/v1/auth/me         - Get current user
```

### Submission Endpoints
```
GET    /api/v1/submissions     - List submissions
POST   /api/v1/submissions     - Create submission
GET    /api/v1/submissions/:id - Get specific submission
PUT    /api/v1/submissions/:id - Update submission
DELETE /api/v1/submissions/:id - Delete submission
GET    /api/v1/submissions/export - Export to CSV
```

### Image Endpoints
```
POST   /api/v1/images/upload   - Upload image
GET    /api/v1/images/:filename - Get image
DELETE /api/v1/images/:filename - Delete image
```

### Analytics Endpoints
```
GET    /api/v1/analytics/dashboard - Dashboard data
GET    /api/v1/analytics/trends    - Trends analysis
GET    /api/v1/analytics/reports   - Generate reports
```

### Field Management Endpoints
```
GET    /api/v1/fields          - List fields
POST   /api/v1/fields          - Create field
GET    /api/v1/fields/:id      - Get field
PUT    /api/v1/fields/:id      - Update field
DELETE /api/v1/fields/:id      - Delete field
```

## 🚀 Deployment

### Backend Deployment (Google Cloud Run)
```bash
# Build Docker image
docker build -t gcr.io/rice-monitor-project/rice-monitor-api .

# Push to Google Container Registry
docker push gcr.io/rice-monitor-project/rice-monitor-api

# Deploy to Cloud Run
gcloud run deploy rice-monitor-api \
  --image gcr.io/rice-monitor-project/rice-monitor-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Frontend Deployment (Netlify/Vercel)
```bash
# Build for production
npm run build

# Deploy to Netlify
npx netlify-cli deploy --prod --dir=build

# Deploy to Vercel
npx vercel --prod
```

## 🔬 Development

### Development Scripts
```bash
# Backend
cd backend
go run .                    # Run backend server
go test ./...              # Run tests
go build                   # Build binary

# Frontend
cd frontend
npm start                  # Development server
npm run build             # Production build
npm test                  # Run tests
npm run lint              # Lint code
npm run format            # Format code
```

### Code Style and Quality
- **Backend**: Follow Go standard formatting with `gofmt`
- **Frontend**: ESLint + Prettier configuration included
- **Commits**: Use conventional commit messages

### Database Schema
The application uses Firestore with the following collections:
- `users` - User profiles and authentication data
- `submissions` - Rice monitoring submissions
- `fields` - Field information and metadata

## 🧪 Testing

### Backend Testing
```bash
cd backend
go test ./...
go test -v ./handlers/
go test -race ./...
go test -cover ./...
```

### Frontend Testing
```bash
cd frontend
npm test
npm run test:coverage
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Write tests for new features
- Update documentation
- Ensure all tests pass
- Keep commits atomic and well-described

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `docs/` directory
- **Issues**: Report bugs on GitHub Issues
- **Email**: support@ricemonitor.com
- **Discord**: Join our development community

## 🙏 Acknowledgments

- Built with React and Go
- Powered by Google Cloud Platform
- Icons by Lucide React
- Styled with Tailwind CSS

---

**Happy Monitoring! 🌾**