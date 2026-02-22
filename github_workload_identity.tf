variable "github_repo" {
  description = "The GitHub repository to trust with Workload Identity (e.g. dreardon/meal-analysis)"
  type        = string
  default     = "dreardon/meal-analysis"
}

# Workload Identity Pool
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-actions-pool"
  project                   = google_project.default.project_id
  display_name              = "GitHub Actions Pool"
}

# Workload Identity Provider for GitHub
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  project                            = google_project.default.project_id
  display_name                       = "GitHub Actions Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.actor"      = "assertion.actor"
    "attribute.aud"        = "assertion.aud"
  }

  attribute_condition = "assertion.repository == '${var.github_repo}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Allow the GitHub Actions identity to impersonate the Compute Engine Service Account
resource "google_service_account_iam_member" "github_workload_identity" {
  service_account_id = "projects/${google_project.default.project_id}/serviceAccounts/${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}

output "workload_identity_provider" {
  value       = google_iam_workload_identity_pool_provider.github.name
  description = "The dynamically generated Workload Identity Provider path for GitHub Actions"
}

output "service_account_email" {
  value       = "${data.google_project.project.number}-compute@developer.gserviceaccount.com"
  description = "The Service Account email GitHub Actions will impersonate"
}
