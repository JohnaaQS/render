# app/api/__init__.py
from flask import Blueprint

api_bp = Blueprint("api", __name__)

# import onderaan zodat api_bp al bestaat
from . import weather_api, reverse_geocode, search_location  # noqa: E402,F401