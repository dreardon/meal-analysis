# Enable Firebase on the project
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = google_project.default.project_id

  depends_on = [time_sleep.wait_for_apis]
}

# Create a Firebase Web App
resource "google_firebase_web_app" "default" {
  provider     = google-beta
  project      = google_project.default.project_id
  display_name = "Meal Analysis"
  
  depends_on = [google_firebase_project.default]
}

# Get the Web App configuration
data "google_firebase_web_app_config" "default" {
  provider   = google-beta
  project    = google_project.default.project_id
  web_app_id = google_firebase_web_app.default.app_id
}

# Firestore Database
resource "google_firestore_database" "database" {
  project     = google_project.default.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [time_sleep.wait_for_apis]
}


# Firestore Rules
resource "google_firebaserules_ruleset" "firestore" {
  provider = google-beta
  project  = google_project.default.project_id
  source {
    files {
      name    = "firestore.rules"
      content = file("firestore.rules")
    }
  }
}

resource "google_firebaserules_release" "firestore" {
  provider     = google-beta
  name         = "cloud.firestore"
  ruleset_name = google_firebaserules_ruleset.firestore.name
  project      = google_project.default.project_id
}

# Storage Bucket (Firebase Storage usually uses the default App Engine bucket or a specific one)
# We will use the staging bucket as the main bucket or create a new one. 
# The existing config uses "meal-plate-analysis-agent-code" as staging, 
# but Firebase Storage usually is "project-id.firebasestorage.app" or similar.
# The user's code refers to VITE_FIREBASE_STORAGE_BUCKET. 
# We'll create a dedicated bucket for Firebase Storage if one isn't implied, 
# but usually it's the default one. 
# Let's create a specific bucket for the app data if needed, or just rely on the default if it exists.
# However, to manage rules, we need the bucket resource or at least the name. 
# Let's assume we want to manage the rules for the default bucket or a specific one.
# For now, let's create a dedicated bucket for the app to be safe and explicit.

resource "google_storage_bucket" "app_bucket" {
  name          = "meals-app-storage-${random_id.bucket_suffix.hex}" # unique name to avoid naming collision
  project       = google_project.default.project_id
  location      = var.region
  force_destroy = true
  uniform_bucket_level_access = true
}

# Register the bucket with Firebase Storage
resource "google_firebase_storage_bucket" "app_bucket" {
  provider  = google-beta
  project   = google_project.default.project_id
  bucket_id = google_storage_bucket.app_bucket.name

  depends_on = [
    time_sleep.wait_for_apis,
    google_firebase_project.default
  ]
}

# Storage Rules
resource "google_firebaserules_ruleset" "storage" {
  provider = google-beta
  project  = google_project.default.project_id
  source {
    files {
      name    = "storage.rules"
      content = file("storage.rules")
    }
  }

  depends_on = [google_firebase_storage_bucket.app_bucket]
}

resource "google_firebaserules_release" "storage" {
  provider     = google-beta
  name         = "firebase.storage/${google_storage_bucket.app_bucket.name}"
  ruleset_name = google_firebaserules_ruleset.storage.name
  project      = google_project.default.project_id
}

# Output the bucket name for other resources to use
output "firebase_storage_bucket" {
  value = google_storage_bucket.app_bucket.name
}
