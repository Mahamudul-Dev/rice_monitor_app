# Build stage
FROM golang:1.21-alpine AS builder

# Set working directory
WORKDIR /app

# Install git (needed for go mod download)
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Production stage
FROM alpine:latest

# Install ca-certificates for HTTPS calls
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Copy service account file if it exists
COPY --from=builder /app/service-account.json ./service-account.json 2>/dev/null || true

# Expose port
EXPOSE 8080

# Set environment variable for service account
ENV GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# Run the application
CMD ["./main"]