import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from ml.predict import predict_water_quality
from services.llm_service import generate_water_explanation

# Load .env file
load_dotenv()

app = Flask(__name__)
# Enable CORS for the frontend port (Vite typically runs on 5173, 8080 or localhost).
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route("/predict", methods=["POST"])
def predict_endpoint():
    """
    Expects a JSON payload with the 9 water parameters.
    Returns prediction, confidence, and AI explanation.
    """
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No JSON payload provided"}), 400

        # Optional: Validate missing keys
        expected_keys = [
            "ph", "Hardness", "Solids", "Chloramines", "Sulfate", 
            "Conductivity", "Organic_carbon", "Trihalomethanes", "Turbidity"
        ]
        missing_keys = [key for key in expected_keys if key not in data]
        
        if missing_keys:
            return jsonify({"error": f"Missing required parameters: {', '.join(missing_keys)}"}), 400

        # Ensure all types are numeric for prediction to work seamlessly
        try:
            features = {key: float(data[key]) for key in expected_keys}
        except ValueError:
             return jsonify({"error": "All parameter values must be numbers."}), 400

        # Make ML prediction
        try:
            ml_results = predict_water_quality(features)
        except FileNotFoundError as e:
            return jsonify({"error": "Model not trained. Backend configuration error."}), 500
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        prediction = ml_results["prediction"]
        confidence = ml_results["confidence"]

        # Request LLM explanation
        ai_explanation = generate_water_explanation(
            features=features,
            prediction=prediction,
            confidence=confidence
        )

        return jsonify({
            "prediction": prediction,
            "confidence": confidence,
            "ai_explanation": ai_explanation
        })

    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
