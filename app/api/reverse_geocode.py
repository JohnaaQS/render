# app/api/reverse_geocode.py
from flask import request, jsonify
import requests

from . import api_bp

@api_bp.route("/reverse-geocode")
def reverse_geocode():
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    zoom = request.args.get("zoom", "18")

    if not lat or not lon:
        return jsonify({"error": "lat en lon zijn verplicht"}), 400

    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "format": "json",
                "lat": lat,
                "lon": lon,
                "zoom": zoom,
                "addressdetails": 1,
            },
            headers={"User-Agent": "weer-app-schoolproject/1.0"},
            timeout=10,
        )
        resp.raise_for_status()
        return jsonify(resp.json())
    except requests.exceptions.RequestException as e:
        print("Nominatim reverse error:", e)
        return jsonify({"error": "Kon adresgegevens niet ophalen"}), 500