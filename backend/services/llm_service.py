import os
import requests

def generate_water_explanation(features: dict, prediction: str, confidence: float) -> str:
    """
    Uses the Groq API with llama-3.3-70b-versatile to generate an explanation and recommendations
    directly using Python's reliable `requests` library to avoid SDK proxy conflicts.
    
    Args:
        features (dict): The input water parameters.
        prediction (str): "Safe" or "Unsafe".
        confidence (float): The model's confidence probability.
        
    Returns:
        str: AI-generated explanation.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your_groq_api_key_here":
        return "AI explanation unavailable: Groq API key is not configured or missing."

    system_prompt = "You are an environmental scientist specializing in water pollution."
    
    user_prompt = f"""
    Here are the water parameters for a recently tested sample:
    {features}
    
    A Machine Learning model predicted this water is: **{prediction}** Support with confidence: {confidence*100:.1f}%.
    
    Please provide:
    1. A brief explanation of the water quality based on these parameters.
    2. Possible pollution causes or concerns if not perfectly typical.
    3. Practical safety recommendations for standard usage.
    
    Keep the response concise, readable, and structured. Do not use markdown headers (like # or ##) that might break a simple frontend UI display, just use standard paragraphs or bullet points or bolding.
    """

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.5,
        "max_tokens": 512
    }

    try:
         # Direct API request eliminates underlying httpx/proxy errors
        response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            return data["choices"][0]["message"]["content"]
        else:
            return f"Error from Groq API (Status {response.status_code}): {response.text}"
            
    except Exception as e:
        return f"Communication error generating AI explanation: {str(e)}"

