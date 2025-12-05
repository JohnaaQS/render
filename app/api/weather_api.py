# app/api/weather_api.py
from flask import current_app, request, jsonify
import requests

from . import api_bp

@api_bp.route("/weather")
def get_weather():
    location = request.args.get("q")
    if not location:
        return jsonify({"error": "Parameter q (locatie) is verplicht"}), 400

    api_key = current_app.config.get("WEATHER_API_KEY")
    if not api_key:
        return jsonify({"error": "WEATHER_API_KEY ontbreekt op de server"}), 500

    try:
        resp = requests.get(
            "https://api.weatherapi.com/v1/forecast.json",
            params={
                "key": api_key,
                "q": location,
                "days": 3,
                "lang": "nl",
            },
            timeout=10,
        )
        resp.raise_for_status()
        return jsonify(resp.json())
    except requests.exceptions.RequestException as e:
        print("WeatherAPI error:", e)
        return jsonify({"error": "Kon weerdata niet ophalen"}), 500