import logging
from flask import Blueprint, request, jsonify

from ml.anomaly_detector import detect_anomalies, clear_cache

anomaly_bp = Blueprint("anomaly", __name__)
log = logging.getLogger(__name__)

@anomaly_bp.route("/anomaly-data", methods=["GET"])
def anomaly_data():
    """
    Run Isolation Forest to detect anomalies and identify feature triggers.
    Pass ?force=1 to force rerun.
    """
    force = request.args.get("force", "0") == "1"
    try:
        result = detect_anomalies(force=force)
        return jsonify(result), 200
    except Exception as e:
        log.exception("Error in /anomaly-data")
        return jsonify({"error": str(e)}), 500

@anomaly_bp.route("/anomaly-reset", methods=["POST"])
def anomaly_reset():
    """Clear anomaly cache so the next request re-runs detection."""
    try:
        clear_cache()
        return jsonify({"status": "cache cleared"}), 200
    except Exception as e:
        log.exception("Error in /anomaly-reset")
        return jsonify({"error": str(e)}), 500
