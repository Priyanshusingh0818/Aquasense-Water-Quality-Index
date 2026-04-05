import logging
from flask import Blueprint, request, jsonify

from ml.predict import predict_water_quality
from services.llm_service import generate_water_explanation
from services.recommender import generate_recommendations

prediction_bp = Blueprint("prediction", __name__)
log = logging.getLogger(__name__)

EXPECTED_FEATURES = [
    "ph", "Hardness", "Solids", "Chloramines", "Sulfate",
    "Conductivity", "Organic_carbon", "Trihalomethanes", "Turbidity"
]

@prediction_bp.route("/predict", methods=["POST"])
def predict_endpoint():
    """
    Expects 9 water parameters, returns prediction + confidence + AI explanation.
    Used for Prediction and Simulation features.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON payload provided"}), 400

        # Input validation: check for missing keys
        missing_keys = [k for k in EXPECTED_FEATURES if k not in data]
        if missing_keys:
            return jsonify({"error": f"Missing required parameters: {', '.join(missing_keys)}"}), 400

        # Input validation: check types and ranges
        features = {}
        for k in EXPECTED_FEATURES:
            try:
                val = float(data[k])
                if val < 0 and k != "ph": # most physical parameters can't be negative
                    return jsonify({"error": f"Parameter {k} cannot be negative"}), 400
                features[k] = val
            except (ValueError, TypeError):
                return jsonify({"error": f"Parameter '{k}' must be a valid number."}), 400

        # Invoke model
        try:
            ml_results = predict_water_quality(features)
        except FileNotFoundError:
            log.error("Model file not found during /predict")
            return jsonify({"error": "Model not trained. Backend configuration error."}), 500
        except ValueError as e:
            return jsonify({"error": str(e)}), 400

        prediction  = ml_results["prediction"]
        confidence  = ml_results["confidence"]

        # Generate value-based recommendations
        try:
            recommendations = generate_recommendations(
                features=features,
                prediction=prediction,
                confidence=confidence,
            )
        except Exception as e:
            log.error("Error generating recommendations: %s", e)
            recommendations = []

        # Request LLM explanation (optional — graceful if key missing)
        try:
            ai_explanation = generate_water_explanation(
                features=features, prediction=prediction, confidence=confidence
            )
        except Exception as e:
            log.error("Error generating AI explanation: %s", e)
            ai_explanation = None

        return jsonify({
            "prediction":      prediction,
            "confidence":      confidence,
            "ai_explanation":  ai_explanation,
            "recommendations": recommendations,
        }), 200

    except Exception as e:
        log.exception("Unexpected error in /predict")
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
