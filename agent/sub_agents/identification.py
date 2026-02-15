from google.adk.agents import LlmAgent


def get_identification_agent() -> LlmAgent:
    """Returns the Identification Agent."""
    
    system_prompt = """
    You are an expert food analyst. 
    Identify all food and beverage items in the image.
    For each item, provide a detailed estimation of the portion size (e.g., "150g", "1 cup", "medium slice").
    
    Return the result as a STRICT JSON object with a list of items. 
    This data will be passed to a Research Agent to find calories, so be as descriptive as possible with names and portions.
    
    JSON format:
    {
        "items": [
            {"name": "Food Name", "portion": "Detailed Portion", "visual_description": "Brief visual description"}
        ]
    }
    Focus EXCLUSIVELY on identification and volumetric estimation.
    """

    return LlmAgent(
        name="identification_agent",
        description="Identifies food items and estimates portions from an image.",
        instruction=system_prompt,
        model="gemini-2.5-flash"
    )
