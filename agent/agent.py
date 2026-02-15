import os
import vertexai
from vertexai.agent_engines import AdkApp
from google.adk.agents import SequentialAgent
from .sub_agents.identification import get_identification_agent
from .sub_agents.research import get_research_agent
from .sub_agents.calculator import get_calculator_agent

vertexai.init(
    project=os.getenv("_GOOGLE_CLOUD_PROJECT"),
    location=os.getenv("_GOOGLE_CLOUD_LOCATION", "us-central1"),
)

# Initialize sub-agents
identification_agent = get_identification_agent()
research_agent = get_research_agent()
calculator_agent = get_calculator_agent()

# Define Root Agent
root_agent = SequentialAgent(
    name="meal_analysis_orchestrator",
    sub_agents=[identification_agent, research_agent, calculator_agent]
)

agent = AdkApp(agent=root_agent)