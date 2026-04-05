import logging
from flask import Blueprint, request, jsonify

from ml.model_trainer import train_and_evaluate, clear_cache

model_bp = Blueprint("model", __name__)
log = logging.getLogger(__name__)

@model_bp.route("/model-comparison", methods=["GET"])
def model_comparison():
    """
    Trains models (LR, RF, GB, XGB) and returns evaluation metrics.
    Cached after first call. Pass ?force=1 to retrain.
    """
    force = request.args.get("force", "0") == "1"
    try:
        result = train_and_evaluate(force=force)
        return jsonify(result), 200
    except Exception as e:
        log.exception("Error in /model-comparison")
        return jsonify({"error": str(e)}), 500

@model_bp.route("/retrain", methods=["POST"])
def retrain():
    """Force clear the model comparison cache so the next call retrains."""
    try:
        clear_cache()
        return jsonify({"status": "cache cleared", "message": "Next /model-comparison call will retrain all models."}), 200
    except Exception as e:
        log.exception("Error in /retrain")
        return jsonify({"error": str(e)}), 500
