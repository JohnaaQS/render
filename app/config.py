# app/config.py
import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

# .env in root inladen
load_dotenv(ROOT_DIR / ".env")

class Config:
    WEATHER_API_KEY = os.getenv("WEATHER_API_KEY")
    PORT = int(os.getenv("PORT", 3000))