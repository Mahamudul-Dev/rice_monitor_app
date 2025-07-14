# ---------- Build Stage ----------
FROM golang:1.21-alpine AS builder

# Set working directory
WORKDIR /app

# Install necessary tools (e.g., git for go modules)
RUN apk add --no-cache git

# Copy Go modules files and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build the Go binary
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# ---------- Production Stage ----------
FROM alpine:latest

# Install CA certificates for HTTPS support
RUN apk --no-cache add ca-certificates

# Set working directory for runtime
WORKDIR /app

# Copy the compiled binary from builder
COPY --from=builder /app/main .

# Set port used by the application (optional for Cloud Run)
EXPOSE 8080

# Set runtime environment variables — these will be overridden in Cloud Run or CI/CD
ENV PORT=8080 \
    GIN_MODE=release \
    ENVIRONMENT=production

# Optionally: define runtime command
CMD ["./main"]
