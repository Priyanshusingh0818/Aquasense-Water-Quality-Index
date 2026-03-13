import os
import joblib
import pandas as pd

def load_model():
    """Loads the trained RandomForest model."""
    model_path = os.path.join(os.path.dirname(__file__), "water_quality_model.pkl")
    if not os.path.exists(model_path):
        raise FileNotFoundError("Model file not found. Please run train.py first.")
    return joblib.load(model_path)

# Initialize model at module scope if we want to keep it in memory
model = None

def get_model():
    global model
    if model is None:
        model = load_model()
    return model

def predict_water_quality(features: dict):
    """
    Predicts water potability based on input features.
    
    Args:
        features (dict): Dictionary of 9 feature values matching dataset columns.
                         
    Returns:
        dict: Contains 'prediction' ("Safe" or "Unsafe") and 'confidence'.
    """
    clf = get_model()
    
    expected_cols = [
        "ph", "Hardness", "Solids", "Chloramines", "Sulfate", 
        "Conductivity", "Organic_carbon", "Trihalomethanes", "Turbidity"
    ]
    
    # Create DataFrame to ensure correct order
    try:
        df = pd.DataFrame([features], columns=expected_cols)
    except Exception as e:
        raise ValueError(f"Feature processing error: {str(e)}")
        
    # Check for NaNs
    if df.isnull().values.any():
        raise ValueError("Input contains missing values for some parameters.")

    prediction_class = clf.predict(df)[0]
    probabilities = clf.predict_proba(df)[0]
    
    confidence = probabilities[prediction_class]
    prediction_label = "Safe" if prediction_class == 1 else "Unsafe"
    
    return {
        "prediction": prediction_label,
        "confidence": round(float(confidence), 3)
    }
