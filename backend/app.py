from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import requests
import sqlite3
import jwt
import datetime
from functools import wraps
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
import logging

load_dotenv()

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["DATABASE"] = "places.db"
app.config["JWT_EXPIRATION"] = datetime.timedelta(hours=24)


# Database setup
def get_db():
    db = sqlite3.connect(app.config["DATABASE"])
    db.row_factory = sqlite3.Row
    return db


def init_db():
    with app.app_context():
        db = get_db()
        db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        db.execute("""
            CREATE TABLE IF NOT EXISTS saved_places (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                place_id TEXT NOT NULL,
                saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id),
                UNIQUE(user_id, place_id)
            )
        """)
        db.commit()


init_db()


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            token = request.headers["Authorization"].split(" ")[1]

        if not token:
            return jsonify({"message": "Token is missing!"}), 401

        try:
            data = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
            current_user = (
                get_db()
                .execute("SELECT * FROM users WHERE id = ?", (data["user_id"],))
                .fetchone()
            )
        except Exception as e:
            return jsonify({"message": f"Token error: {str(e)}"}), 401

        return f(current_user, *args, **kwargs)

    return decorated


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password required!"}), 400

    hashed_password = generate_password_hash(password)

    try:
        db = get_db()
        db.execute(
            "INSERT INTO users (email, password) VALUES (?, ?)",
            (email, hashed_password),
        )
        db.commit()
        return jsonify({"message": "User created successfully!"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"message": "Email already exists!"}), 409


@app.route("/login", methods=["POST"])
def login():
    auth = request.get_json()
    email = auth.get("email")
    password = auth.get("password")

    if not email or not password:
        return jsonify({"message": "Email and password required!"}), 400

    user = get_db().execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not user or not check_password_hash(user["password"], password):
        return jsonify({"message": "Invalid credentials!"}), 401

    token = jwt.encode(
        {
            "user_id": user["id"],
            "exp": datetime.datetime.utcnow() + app.config["JWT_EXPIRATION"],
        },
        app.config["SECRET_KEY"],
    )

    return jsonify({"token": token, "user_id": user["id"], "email": user["email"]}), 200


@app.route("/weather", methods=["GET"])
def get_weather():
    try:
        lat = request.args.get("lat", type=float)
        lon = request.args.get("lon", type=float)

        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,wind_speed_10m,precipitation",
            "hourly": "temperature_2m",
            "timezone": "auto",
        }

        response = requests.get("https://api.open-meteo.com/v1/forecast", params=params)
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/places", methods=["GET"])
def get_places():
    try:
        lat = request.args.get("lat", type=float)
        lon = request.args.get("lon", type=float)
        radius = request.args.get("radius", default=5000, type=int)
        categories = request.args.get("categories", type=str)

        if not categories:
            return jsonify({"error": "Categories parameter required"}), 400

        SUPPORTED_CATEGORIES = [
            "commercial.supermarket",
            "catering.restaurant",
            "entertainment.cinema",
        ]
        formatted_categories = ",".join(
            [c for c in categories.split(",") if c in SUPPORTED_CATEGORIES]
        )
        if not formatted_categories:
            return jsonify({"error": "No valid categories provided"}), 400

        url = f"https://api.geoapify.com/v2/places?categories={formatted_categories}&filter=circle:{lon},{lat},{radius}&limit=100&apiKey={os.getenv('GEOAPIFY_KEY')}"
        response = requests.get(url)
        response.raise_for_status()

        features = response.json().get("features", [])
        processed = [
            {
                **f,
                "properties": {
                    **f["properties"],
                    "lat": f["geometry"]["coordinates"][1],
                    "lon": f["geometry"]["coordinates"][0],
                    "place_id": f["properties"].get("place_id"),
                },
            }
            for f in features
        ]
        return jsonify({"features": processed})

    except requests.exceptions.HTTPError as http_err:
        return jsonify({"error": f"HTTP error occurred: {http_err}"}), 500
    except requests.exceptions.RequestException as req_err:
        return jsonify({"error": f"Request error occurred: {req_err}"}), 500
    except Exception as e:
        logging.error(f"Unexpected error in /places: {e}", exc_info=True)
        return jsonify({"error": f"Places API error: {str(e)}"}), 500


@app.route("/save_place", methods=["POST"])
@token_required
def save_place(current_user):
    try:
        data = request.get_json()
        place_id = data.get("place_id")

        if not place_id:
            return jsonify({"error": "Missing place_id"}), 400

        db = get_db()
        db.execute(
            """
            INSERT INTO saved_places (user_id, place_id)
            VALUES (?, ?)
            ON CONFLICT(user_id, place_id) DO NOTHING
        """,
            (current_user["id"], place_id),
        )
        db.commit()

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/saved_places", methods=["GET"])
@token_required
def get_saved_places(current_user):
    try:
        db = get_db()
        saved = db.execute(
            """
            SELECT place_id FROM saved_places
            WHERE user_id = ?
        """,
            (current_user["id"],),
        ).fetchall()

        return jsonify({"places": [p["place_id"] for p in saved]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="localhost", port=5000)
