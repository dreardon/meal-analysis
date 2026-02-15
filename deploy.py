import os
import vertexai
from agent import root_agent
from dotenv import load_dotenv

# Load variables from root .env
load_dotenv()

# Configuration
GOOGLE_CLOUD_PROJECT = os.getenv("GOOGLE_CLOUD_PROJECT")
STAGING_BUCKET = os.getenv("STAGING_BUCKET")
GOOGLE_CLOUD_LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION")
AGENT_ENGINE_NAME = os.getenv("AGENT_ENGINE_NAME",'')

if not all([GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, STAGING_BUCKET]):
    raise ValueError("Missing required environment variables: GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION, and STAGING_BUCKET")

try:

    print(f"Deploying to Project: {GOOGLE_CLOUD_PROJECT}, Agent Engine Location: {GOOGLE_CLOUD_LOCATION}, Bucket: {STAGING_BUCKET}")

    # Create the Agent Engine instance
    client = vertexai.Client(
        project=GOOGLE_CLOUD_PROJECT,
        location=GOOGLE_CLOUD_LOCATION
    )    

    if not AGENT_ENGINE_NAME: 
        print("Creating Agent Engine Instance...")
        remote_app = client.agent_engines.create(
            agent=root_agent,
            config={
                "display_name": "Meal Analysis Agent",
                "identity_type": "AGENT_IDENTITY",
                "requirements": ['google-cloud-aiplatform[adk,agent_engines]==1.136.0','pydantic==2.12.5','cloudpickle==3.1.2','fastapi==0.124.1','uvicorn==0.34.0','google-genai==1.62.0','python-dotenv==1.0.1','requests==2.32.4','google-adk==1.24.1','certifi==2024.12.14','python-multipart==0.0.20','aiofiles==24.1.0'],
                "staging_bucket": f"gs://{STAGING_BUCKET}",
                "agent_framework": "google-adk",
                "env_vars": {
                    "_GOOGLE_CLOUD_PROJECT": GOOGLE_CLOUD_PROJECT,
                    "_GOOGLE_CLOUD_LOCATION": GOOGLE_CLOUD_LOCATION,
                },
                "extra_packages": [
                    "./agent"
                ],
            }
        )
    else:
        print("Updating Agent Engine Instance...")
        remote_app = client.agent_engines.update(
            name=AGENT_ENGINE_NAME,
            agent=root_agent,
            config={
                "requirements": ['google-cloud-aiplatform[adk,agent_engines]==1.136.0','pydantic==2.12.5','cloudpickle==3.1.2','fastapi==0.124.1','uvicorn==0.34.0','google-genai==1.62.0','python-dotenv==1.0.1','requests==2.32.4','google-adk==1.24.1','certifi==2024.12.14','python-multipart==0.0.20','aiofiles==24.1.0'],
                "staging_bucket": f"gs://{STAGING_BUCKET}",
                "agent_framework": "google-adk",
                "env_vars": {
                    "_GOOGLE_CLOUD_PROJECT": GOOGLE_CLOUD_PROJECT,
                    "_GOOGLE_CLOUD_LOCATION": GOOGLE_CLOUD_LOCATION,
                },
                "extra_packages": [
                    "./agent"
                ],
            }
        )

    print("\nDeployment Complete!")
    print(f"Reasoning Engine Name: {remote_app.api_resource.name}")
    print(f"Effective Identity: {remote_app.api_resource.spec.effective_identity}") 
    with open("agent_identity.txt", "w") as f: 
        f.write(remote_app.api_resource.spec.effective_identity) 

    with open("agent_engine_id.txt", "w") as f:
        f.write(remote_app.api_resource.name)
except Exception as e:
    print(f"\nDeployment Failed: {e}")
    raise