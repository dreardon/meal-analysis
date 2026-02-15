variable "project_id" {
  description = "The Google Cloud Project ID"
  type        = string
}

variable "billing_account" {
  description = "The billing account ID to associate with the project"
  type        = string
}

variable "region" {
  description = "The Google Cloud region"
  type        = string
  default     = "us-central1"
}

variable "google_client_id" {
  description = "Google OAuth Client ID"
  type        = string
  default     = ""
}

variable "app_image" {
  description = "The Docker container image to deploy to Cloud Run"
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello" # Placeholder to break bootstrap circular dependency
}
