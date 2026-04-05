import logging
from flask import Blueprint, request, jsonify

from ml.drift_detector import detect_drift, clear_cache

drift_bp = Blueprint("drift", __name__)
log = logging.getLogger(__name__)

@drift_bp.route("/drift-data", methods=["GET"])
def drift_data():
    """
    Compare training vs test-set distributions using KS test + PSI.
    Results cached per-process. Pass ?force=1 to recompute.
    """
    force = request.args.get("force", "0") == "1"
    try:
        result = detect_drift(force=force)
        return jsonify(result), 200
    except Exception as e:
        log.exception("Error in /drift-data")
        return jsonify({"error": str(e)}), 500

@drift_bp.route("/drift-reset", methods=["POST"])
def drift_reset():
    """Clear drift cache so the next request recomputes."""
    try:
        clear_cache()
        return jsonify({"status": "cache cleared"}), 200
    except Exception as e:
        log.exception("Error in /drift-reset")
        return jsonify({"error": str(e)}), 500
