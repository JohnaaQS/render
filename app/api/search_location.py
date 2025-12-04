# app/api/search_location.py
from flask import request, jsonify
import requests

from . import api_bp

@api_bp.route("/search-location")
def search_location():
    query = request.args.get("q")
    limit = request.args.get("limit", "5")

    if not query:
        return jsonify({"error": "Parameter q is verplicht"}), 400

    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "format": "json",
                "q": query,
                "limit": limit,
            },
            headers={"User-Agent": "weer-app-schoolproject/1.0"},
            timeout=10,
        )
        resp.raise_for_status()
        return jsonify(resp.json())
    except requests.exceptions.RequestException as e:
        print("Nominatim search error:", e)
        return jsonify({"error": "Kon locatie niet zoeken"}), 500