terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google" {
  alias                 = "with_override"
  project               = var.project_id
  region                = var.region
  billing_project       = var.project_id
  user_project_override = true
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Create Project (optional, if you want to manage it)
# Note: If project already exists, it must be imported.
resource "google_project" "default" {
  name            = var.project_id
  project_id      = var.project_id
  billing_account = var.billing_account
  deletion_policy = "DELETE"
}

# Enable APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "aiplatform.googleapis.com",
    "artifactregistry.googleapis.com",
    "run.googleapis.com",
    "firestore.googleapis.com",
    "firebaserules.googleapis.com",
    "firebasestorage.googleapis.com",
    "storage.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "iam.googleapis.com",
    "identitytoolkit.googleapis.com",
    "firebase.googleapis.com",
    "orgpolicy.googleapis.com"
  ])

  project = google_project.default.project_id
  service = each.key
  disable_on_destroy = false

  depends_on = [google_project.default]
}

# Wait for APIs to fully activate to avoid propagation delays
resource "time_sleep" "wait_for_apis" {
  create_duration = "60s"
  depends_on      = [google_project_service.apis]
}

# Get project info for service account
data "google_project" "project" {
  project_id = google_project.default.project_id
}

# Grant Storage Object Viewer to default compute service account (used by Cloud Build)
resource "google_project_iam_member" "compute_storage_viewer" {
  project = google_project.default.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# Grant Artifact Registry Writer to default compute service account (used by Cloud Build to push)
resource "google_project_iam_member" "compute_artifact_writer" {
  project = google_project.default.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# Grant Vertex AI User to default compute service account (used by Cloud Build to query Agent Engine)
resource "google_project_iam_member" "vertex_user" {
  project = google_project.default.project_id
  role    = "roles/aiplatform.expressUser"
  member  = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
}

# Disable requireInvokerIam to allow public Cloud Run services
resource "google_org_policy_policy" "cloud_run_public" {
  provider = google.with_override
  name     = "projects/${google_project.default.project_id}/policies/run.managed.requireInvokerIam"
  parent   = "projects/${google_project.default.project_id}"

  spec {
    rules {
      enforce = "FALSE"
    }
  }

  depends_on = [time_sleep.wait_for_apis]
}
