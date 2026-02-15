output "cloud_run_url" {
  description = "The URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.default.uri
}

output "agent_staging_bucket" {
  description = "The GCS bucket used for staging agent code"
  value       = google_storage_bucket.staging.name
}

# output "firebase_storage_bucket" is already in firebase.tf

output "firebase_api_key" {
  value = data.google_firebase_web_app_config.default.api_key
  sensitive = true
}

output "firebase_auth_domain" {
  value = data.google_firebase_web_app_config.default.auth_domain
}

output "firebase_app_id" {
  value = google_firebase_web_app.default.app_id
}

output "firebase_messaging_sender_id" {
  value = data.google_firebase_web_app_config.default.messaging_sender_id
}
