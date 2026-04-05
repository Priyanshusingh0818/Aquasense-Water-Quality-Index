import logging
from flask import Blueprint, jsonify

from ml.data_processor import (
    get_dataset, compute_summary, compute_distributions,
    compute_feature_importances, compute_radar
)

dashboard_bp = Blueprint("dashboard", __name__)
log = logging.getLogger(__name__)

@dashboard_bp.route("/dashboard-data", methods=["GET"])
def dashboard_data():
    """Returns aggregated data and distributions for the main Dashboard."""
    try:
        df      = get_dataset()
        summary = compute_summary(df)
        importances = compute_feature_importances()
        radar   = compute_radar(df)
        ph_dist = compute_distributions(df, "ph", bins=12)
        turb_dist = compute_distributions(df, "Turbidity", bins=12)
        
        return jsonify({
            "summary":               summary,
            "featureImportances":    importances,
            "radarData":             radar,
            "phDistribution":        ph_dist,
            "turbidityDistribution": turb_dist,
        }), 200
    except Exception as e:
        log.exception("Error in /dashboard-data")
        return jsonify({"error": str(e)}), 500
