# Unique ID for storage bucket
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Staging Bucket for Agent Code
resource "google_storage_bucket" "staging" {
  name          = "meals-agent-staging-${random_id.bucket_suffix.hex}"
  project       = google_project.default.project_id
  location      = var.region
  force_destroy = true
  uniform_bucket_level_access = true
}

# Zip the agent code
data "archive_file" "agent_zip" {
  type        = "zip"
  source_dir  = "${path.module}/agent"
  output_path = "${path.module}/agent.zip"
}

# Upload the agent code to GCS
resource "google_storage_bucket_object" "agent_code" {
  name   = "agent-${data.archive_file.agent_zip.output_sha}.zip"
  bucket = google_storage_bucket.staging.name
  source = data.archive_file.agent_zip.output_path
}

# Agent Engine (Reasoning Engine) Deployment
# We use a null_resource to deploy via the existing deploy.py script because
# the google_vertex_ai_reasoning_engine resource requires complex artifact handling
# that the Python SDK handles transparently.

resource "null_resource" "deploy_agent" {
  triggers = {
    agent_code_hash = data.archive_file.agent_zip.output_sha
    deploy_script   = filemd5("${path.module}/deploy.py")
  }

  provisioner "local-exec" {
    command = <<EOT
      python3 -m venv .venv
      source .venv/bin/activate
      pip install -r requirements.txt
      # We need to install the agent requirements too if they are not in root requirements
      pip install -r agent/requirements.txt
      
      # Set env vars for deploy script
      export GOOGLE_CLOUD_PROJECT="${google_project.default.project_id}"
      export GOOGLE_CLOUD_LOCATION="${var.region}"
      export STAGING_BUCKET="${google_storage_bucket.staging.name}"
      
      # Run deploy script
      ./.venv/bin/python3 deploy.py
    EOT
    interpreter = ["/bin/bash", "-c"]
    working_dir = path.module
  }
}

# Grant aiplatform.expressUser role to the Agent Engine identity
resource "null_resource" "grant_agent_permissions" {
  triggers = {
    agent_id = null_resource.deploy_agent.id
  }

  provisioner "local-exec" {
    command = <<EOT
      # Record identity so cloudrun can grant permissions
      IDENTITY=$(cat agent_identity.txt)
      echo "Granting roles/aiplatform.expressUser to principal://$IDENTITY"
      gcloud projects add-iam-policy-binding ${google_project.default.project_id} \
        --member="principal://$IDENTITY" \
        --role="roles/aiplatform.expressUser" \
        --condition=None
    EOT
    interpreter = ["/bin/bash", "-c"]
    working_dir = path.module
  }

  depends_on = [null_resource.deploy_agent]
}
