import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from api.prediction import prediction_bp
from api.dashboard import dashboard_bp
from api.model import model_bp
from api.anomaly import anomaly_bp
from api.drift import drift_bp

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Register modular blueprints
app.register_blueprint(prediction_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(model_bp)
app.register_blueprint(anomaly_bp)
app.register_blueprint(drift_bp)

# Global error handler
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error"}), 500

@app.route("/health", methods=["GET"])
def health_check():
    """Simple health check endpoint."""
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
