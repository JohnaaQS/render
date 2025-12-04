# app/__init__.py
from flask import Flask
from .config import Config
from .routes import main_bp
from .api import api_bp

def create_app():
    app = Flask(
        __name__,
        static_folder="static",      # app/static
        template_folder="templates"  # app/templates
    )

    app.config.from_object(Config)

    # Frontend routes
    app.register_blueprint(main_bp)

    # API routes onder /api/...
    app.register_blueprint(api_bp, url_prefix="/api")

    return app