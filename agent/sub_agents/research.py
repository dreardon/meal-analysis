from google.adk.agents import LlmAgent
from google.adk.tools import google_search

def get_research_agent() -> LlmAgent:
    """Returns the Research Agent."""
    
    system_prompt = """
    You are a nutritional researcher.
    Use Google Search to find accurate nutrition information for the listed food items.
    Prioritize specific brand estimates if the item name implies a brand.
    This data will be passed to a Calculator Agent to complete the meal analysis.
    
    Update and return the JSON object where each item from the input now includes:
    "calories": estimated calories based on portion,
    "carbs": grams of carbohydrates,
    "protein": grams of protein,
    "fat": grams of fat.
    
    Ensure the JSON structure is preserved: {"items": [...]}
    """

    return LlmAgent(
        name="research_agent",
        description="Searches for nutrition facts for food items, especially branded ones.",
        instruction=system_prompt,
        model="gemini-2.5-flash",
        tools=[google_search]
    )
