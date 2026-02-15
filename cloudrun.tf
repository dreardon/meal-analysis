# Artifact Registry Repository
resource "google_artifact_registry_repository" "repo" {
  project       = google_project.default.project_id
  location      = var.region
  repository_id = "meal-analysis-repo"
  description   = "Docker repository for Meal Analysis App"
  format        = "DOCKER"

  depends_on = [
    time_sleep.wait_for_apis
  ]
}


# Cloud Run Service
resource "google_cloud_run_v2_service" "default" {
  name     = "meal-analysis-service"
  location = var.region
  invoker_iam_disabled = true
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = var.app_image
      
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = google_project.default.project_id
      }
      env {
        name  = "VITE_FIREBASE_PROJECT_ID"
        value = google_project.default.project_id
      }
      env {
        name  = "VITE_FIREBASE_API_KEY"
        value = data.google_firebase_web_app_config.default.api_key
      }
      env {
        name  = "VITE_FIREBASE_AUTH_DOMAIN"
        value = data.google_firebase_web_app_config.default.auth_domain
      }
      env {
        name  = "VITE_FIREBASE_STORAGE_BUCKET"
        value = google_storage_bucket.app_bucket.name
      }
      env {
        name  = "VITE_FIREBASE_MESSAGING_SENDER_ID"
        value = data.google_firebase_web_app_config.default.messaging_sender_id
      }
      env {
        name  = "VITE_FIREBASE_APP_ID"
        value = google_firebase_web_app.default.app_id
      }
      env {
        name  = "VITE_GOOGLE_CLIENT_ID"
        value = var.google_client_id
      }
      env {
        name  = "REASONING_ENGINE_URL_BASE"
        value = "placeholder" # Will be updated by null_resource.link_agent_engine
      }
    }
  }

  depends_on = [
    google_org_policy_policy.cloud_run_public
  ]
}


# Update Cloud Run with the Agent Engine URL and Google Client ID
resource "null_resource" "link_agent_engine" {
  triggers = {
    service_id = google_cloud_run_v2_service.default.id
    always_run = timestamp()
  }

  provisioner "local-exec" {
    command = <<EOT
      # Wait for the agent ID file to be available
      AGENT_ID=$(cat agent_engine_id.txt)
      REGION="${var.region}"
      PROJECT="${google_project.default.project_id}"
      URL="https://$REGION-aiplatform.googleapis.com/v1/$AGENT_ID"
      
      echo "Using provided OAuth Client ID from variables."
      CLIENT_ID="${var.google_client_id}"

      if [ -z "$CLIENT_ID" ]; then
        echo "Warning: google_client_id is empty. Skipping VITE_GOOGLE_CLIENT_ID update."
        echo "Updating Cloud Run service with REASONING_ENGINE_URL_BASE=$URL"
        gcloud run services update ${google_cloud_run_v2_service.default.name} \
          --region=$REGION \
          --project=$PROJECT \
          --update-env-vars=REASONING_ENGINE_URL_BASE=$URL
      else
        echo "Updating Cloud Run service with REASONING_ENGINE_URL_BASE=$URL and VITE_GOOGLE_CLIENT_ID=$CLIENT_ID"
        gcloud run services update ${google_cloud_run_v2_service.default.name} \
          --region=$REGION \
          --project=$PROJECT \
          --update-env-vars=REASONING_ENGINE_URL_BASE=$URL,VITE_GOOGLE_CLIENT_ID=$CLIENT_ID
      fi
    EOT
    interpreter = ["/bin/bash", "-c"]
  }


  depends_on = [
    google_cloud_run_v2_service.default,
    null_resource.deploy_agent
  ]
}

output "service_url" {
  value = google_cloud_run_v2_service.default.uri
}
