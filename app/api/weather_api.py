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
        return jsonify({"error": "WEATHER_API_KEY ontbreekt op de server"}), 503

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
    except requests.exceptions.RequestException as e:
        print("WeatherAPI request error:", e)
        return jsonify({"error": "Weer API niet bereikbaar"}), 502

    # probeer de originele API-fout door te geven zodat de gebruiker weet wat er mis is
    try:
        data = resp.json()
    except ValueError:
        data = None

    if resp.status_code >= 400:
        # WeatherAPI levert vaak {"error": {"message": "..."}}
        api_error = None
        if isinstance(data, dict):
            api_error = data.get("error") or data.get("message")
            if isinstance(api_error, dict):
                api_error = api_error.get("message") or api_error.get("info")

        message = api_error or f"WeatherAPI gaf status {resp.status_code}"
        return jsonify({"error": message}), resp.status_code

    if data is not None:
        return jsonify(data)

    return jsonify({"error": "Kon weerdata niet ophalen"}), 502
