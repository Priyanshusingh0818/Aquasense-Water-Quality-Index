import os
import sys

# Add the backend directory to Python path so relative imports work inside Vercel Serverless
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from backend.app import app
