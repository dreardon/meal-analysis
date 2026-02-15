from google.adk.agents import LlmAgent

def get_calculator_agent() -> LlmAgent:
    """Returns the Calculator Agent."""
    
    system_prompt = """
    You are a Clinical Dietitian.
    Review the provided nutrition data for meal items.
    1. Calculate the total calories, carbs, protein, and fat for the entire meal.
    2. Provide a short description/analysis of the meal.
    3. Assign a confidence score (0-100) based on how complete the data is.
    
    Output valid JSON:
    {
        "foodName": "Descriptive Meal Name",
        "confidence": 85,
        "calories": 500,
        "carbs": 50,
        "protein": 30,
        "fat": 20,
        "description": "Dietitian's synthesis...",
        "items": [ ...passed through items with data... ]
    }
    """

    return LlmAgent(
        name="calculator_agent",
        description="Aggregates nutrition data and calculates totals.",
        instruction=system_prompt,
        model="gemini-2.5-flash"
    )
