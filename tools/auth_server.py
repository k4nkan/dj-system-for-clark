from urllib.parse import urlencode
import os
from pathlib import Path

import truststore

truststore.inject_into_ssl()

import requests
from flask import Flask, redirect, request

ROOT_DIR = Path(__file__).resolve().parents[1]


def load_env_file():
    env_path = ROOT_DIR / ".env"

    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        trimmed = line.strip()

        if not trimmed or trimmed.startswith("#") or "=" not in trimmed:
            continue

        key, value = trimmed.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env_file()

CLIENT_ID = os.environ.get("SPOTIFY_CLIENT_ID", "")
CLIENT_SECRET = os.environ.get("SPOTIFY_CLIENT_SECRET", "")
REDIRECT_URI = "http://[::1]:5000/callback"
SCOPES = (
    "playlist-modify-public playlist-modify-private playlist-read-private "
    "user-read-currently-playing user-read-playback-state"
)

app = Flask(__name__)


@app.get("/login")
def login():
    missing = get_missing_config()

    if missing:
        return f"Missing config: {', '.join(missing)}", 500

    query = urlencode({
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
    })
    return redirect(f"https://accounts.spotify.com/authorize?{query}")


@app.get("/callback")
def callback():
    missing = get_missing_config()

    if missing:
        return f"Missing config: {', '.join(missing)}", 500

    code = request.args.get("code")
    if not code:
        return "No code returned", 400

    res = requests.post(
        "https://accounts.spotify.com/api/token",
        auth=(CLIENT_ID, CLIENT_SECRET),
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
        },
        timeout=10,
    )
    res.raise_for_status()

    tokens = res.json()
    refresh_token = tokens.get("refresh_token", "")
    scope = tokens.get("scope", "")
    return f"Refresh Token: {refresh_token}<br>Scope: {scope}"


def get_missing_config():
    values = {
        "SPOTIFY_CLIENT_ID": CLIENT_ID,
        "SPOTIFY_CLIENT_SECRET": CLIENT_SECRET,
    }

    return [name for name, value in values.items() if not value]


if __name__ == "__main__":
    app.run(host="::1", port=5000, debug=True)
