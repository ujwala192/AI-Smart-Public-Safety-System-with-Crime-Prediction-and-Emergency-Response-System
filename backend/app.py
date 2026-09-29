from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import pickle
import json
import sqlite3
import hashlib
import os
from datetime import datetime

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:5174"])

# ─────────────────────────────────────────
# LOAD ML MODELS
# ─────────────────────────────────────────
model    = pickle.load(open("models/risk_model.pkl", "rb"))
le_crime = pickle.load(open("models/le_crime.pkl",   "rb"))
le_risk  = pickle.load(open("models/le_risk.pkl",    "rb"))

with open("models/hotspots.json")    as f: hotspots    = json.load(f)
with open("models/area_counts.json") as f: area_counts = json.load(f)

df = pd.read_csv("data/crime_data.csv")

# ── Area -> coordinates lookup ────────────────────────────────────────────────
AREA_COORDS = {
    "Hitech City":   {"lat": 17.4435, "lon": 78.3772},
    "Gachibowli":    {"lat": 17.4401, "lon": 78.3489},
    "Banjara Hills": {"lat": 17.4156, "lon": 78.4347},
    "Jubilee Hills": {"lat": 17.4320, "lon": 78.4071},
    "Secunderabad":  {"lat": 17.4399, "lon": 78.4983},
    "Charminar":     {"lat": 17.3616, "lon": 78.4747},
    "LB Nagar":      {"lat": 17.3469, "lon": 78.5469},
    "Dilsukhnagar":  {"lat": 17.3688, "lon": 78.5247},
    "Ameerpet":      {"lat": 17.4375, "lon": 78.4483},
    "Kukatpally":    {"lat": 17.4849, "lon": 78.4138},
    "Madhapur":      {"lat": 17.4485, "lon": 78.3908},
    "Begumpet":      {"lat": 17.4418, "lon": 78.4636},
    "Uppal":         {"lat": 17.4054, "lon": 78.5590},
    "Miyapur":       {"lat": 17.4956, "lon": 78.3694},
    "ECIL":          {"lat": 17.4691, "lon": 78.5624},
}

def resolve_coords(lat, lon, area):
    """
    Always use area-centre coordinates when the area name is known.
    This ensures correct police station assignment regardless of
    whether the browser GPS is available or blocked.
    """
    coords = AREA_COORDS.get(area)
    if coords:
        return coords["lat"], coords["lon"]
    return lat, lon

# ─────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────
def get_db():
    conn = sqlite3.connect("data/crime_safety.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c    = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT    NOT NULL,
        email        TEXT    UNIQUE NOT NULL,
        password     TEXT    NOT NULL,
        role         TEXT    DEFAULT 'public',
        station_id   INTEGER DEFAULT 0,
        station_name TEXT    DEFAULT NULL
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS police_stations (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        name      TEXT,
        area      TEXT,
        latitude  REAL,
        longitude REAL,
        phone     TEXT
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS sos_alerts (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name           TEXT,
        latitude            REAL,
        longitude           REAL,
        address             TEXT,
        area                TEXT,
        assigned_station    TEXT,
        assigned_station_id INTEGER,
        status              TEXT DEFAULT 'active',
        timestamp           DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS incidents (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name           TEXT,
        crime_type          TEXT,
        description         TEXT,
        latitude            REAL,
        longitude           REAL,
        area                TEXT,
        severity            TEXT,
        assigned_station    TEXT,
        assigned_station_id INTEGER,
        status              TEXT DEFAULT 'pending',
        timestamp           DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS alerts (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        area       TEXT,
        message    TEXT,
        severity   TEXT,
        station_id INTEGER DEFAULT 0,
        timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS route_history (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER,
        source      TEXT,
        destination TEXT,
        risk_score  TEXT,
        timestamp   DATETIME DEFAULT CURRENT_TIMESTAMP
    )''')

    # Seed police stations — all 15 areas
    c.execute("SELECT COUNT(*) FROM police_stations")
    if c.fetchone()[0] == 0:
        stations = [
            ("Hitech City PS",   "Hitech City",   17.4460, 78.3780, "040-23304986"),
            ("Gachibowli PS",    "Gachibowli",    17.4410, 78.3500, "040-23304987"),
            ("Banjara Hills PS", "Banjara Hills", 17.4160, 78.4350, "040-23304988"),
            ("Jubilee Hills PS", "Jubilee Hills", 17.4325, 78.4075, "040-23305000"),
            ("Secunderabad PS",  "Secunderabad",  17.4400, 78.4990, "040-23304989"),
            ("Charminar PS",     "Charminar",     17.3620, 78.4750, "040-23304990"),
            ("LB Nagar PS",      "LB Nagar",      17.3470, 78.5470, "040-23304991"),
            ("Dilsukhnagar PS",  "Dilsukhnagar",  17.3690, 78.5250, "040-23304996"),
            ("Ameerpet PS",      "Ameerpet",      17.4380, 78.4490, "040-23304993"),
            ("Kukatpally PS",    "Kukatpally",    17.4850, 78.4140, "040-23304992"),
            ("Madhapur PS",      "Madhapur",      17.4490, 78.3910, "040-23304995"),
            ("Begumpet PS",      "Begumpet",      17.4420, 78.4640, "040-23304997"),
            ("Uppal PS",         "Uppal",         17.4060, 78.5590, "040-23304994"),
            ("Miyapur PS",       "Miyapur",       17.4960, 78.3700, "040-23304998"),
            ("ECIL PS",          "ECIL",          17.4695, 78.5625, "040-23304999"),
        ]
        c.executemany(
            "INSERT INTO police_stations (name,area,latitude,longitude,phone) VALUES (?,?,?,?,?)",
            stations
        )

    # Seed alerts
    c.execute("SELECT COUNT(*) FROM alerts")
    if c.fetchone()[0] == 0:
        seed_alerts = [
            ("Charminar",    "⚠️ High theft activity near Charminar market",   "High",   5),
            ("LB Nagar",     "🚨 Chain snatching at LB Nagar bus stop",        "High",   6),
            ("Secunderabad", "⚠️ Vehicle theft near railway station",          "Medium", 4),
            ("Uppal",        "🔶 Robbery reported near Uppal crossroads",      "High",   13),
            ("Ameerpet",     "ℹ️ Pickpocket incidents near metro station",     "Medium", 9),
        ]
        c.executemany(
            "INSERT INTO alerts (area,message,severity,station_id) VALUES (?,?,?,?)",
            seed_alerts
        )

    conn.commit()
    conn.close()

init_db()

def hash_password(p):
    return hashlib.sha256(p.encode()).hexdigest()

# ─────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────
@app.route("/api/register", methods=["POST"])
def register():
    data         = request.json
    name         = data.get("name")
    email        = data.get("email")
    password     = hash_password(data.get("password"))
    role         = data.get("role", "public")
    station_id   = data.get("station_id", 0)
    station_name = data.get("station_name", None)

    if role == "police" and not station_id:
        return jsonify({"success": False,
                        "message": "Police must select a station!"}), 400
    try:
        conn = get_db()
        conn.execute(
            """INSERT INTO users
               (name,email,password,role,station_id,station_name)
               VALUES (?,?,?,?,?,?)""",
            (name, email, password, role, station_id, station_name)
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Registered successfully"})
    except sqlite3.IntegrityError:
        return jsonify({"success": False,
                        "message": "Email already exists"}), 400

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    conn = get_db()
    user = conn.execute(
        "SELECT * FROM users WHERE email=? AND password=?",
        (data["email"], hash_password(data["password"]))
    ).fetchone()
    conn.close()
    if user:
        return jsonify({
            "success": True,
            "user": {
                "id":           user["id"],
                "name":         user["name"],
                "role":         user["role"],
                "station_id":   user["station_id"],
                "station_name": user["station_name"]
            }
        })
    return jsonify({"success": False,
                    "message": "Invalid credentials"}), 401

# ─────────────────────────────────────────
# STATIONS LIST
# ─────────────────────────────────────────
@app.route("/api/police-stations-list", methods=["GET"])
def police_stations_list():
    conn     = get_db()
    stations = conn.execute(
        "SELECT id, name, area FROM police_stations"
    ).fetchall()
    conn.close()
    return jsonify({"success": True,
                    "stations": [dict(s) for s in stations]})

# ─────────────────────────────────────────
# PUBLIC APIs
# ─────────────────────────────────────────
@app.route("/api/hotspots", methods=["GET"])
def get_hotspots():
    return jsonify({"success": True, "hotspots": hotspots})

@app.route("/api/areas", methods=["GET"])
def get_areas():
    return jsonify({"success": True,
                    "areas": df["area"].unique().tolist()})

@app.route("/api/area-risk", methods=["GET"])
def area_risk():
    area     = request.args.get("area", "")
    hour     = int(request.args.get("hour", 12))
    count    = area_counts.get(area, 10)
    enc      = le_crime.transform(["Theft"])[0]
    is_night = 1 if (hour >= 20 or hour <= 5) else 0
    coords   = AREA_COORDS.get(area, {"lat": 17.44, "lon": 78.44})
    features = np.array([[coords["lat"], coords["lon"], hour, 6, 2,
                           is_night, enc, 1, count]])
    pred     = model.predict(features)[0]
    risk     = le_risk.inverse_transform([pred])[0]
    area_df  = df[df["area"] == area]
    top_crime = area_df["crime_type"].mode()[0] \
                if len(area_df) > 0 else "Unknown"
    return jsonify({
        "success":     True,
        "area":        area,
        "risk_level":  risk.capitalize(),
        "crime_count": count,
        "top_crime":   top_crime,
        "hour":        hour
    })

@app.route("/api/nearby-police", methods=["GET"])
def nearby_police():
    lat      = float(request.args.get("lat", 17.44))
    lon      = float(request.args.get("lon", 78.44))
    area     = request.args.get("area", "")
    lat, lon = resolve_coords(lat, lon, area)
    conn     = get_db()
    stations = conn.execute(
        "SELECT * FROM police_stations"
    ).fetchall()
    conn.close()
    results  = []
    for s in stations:
        dist = ((s["latitude"] - lat)**2 +
                (s["longitude"] - lon)**2)**0.5
        results.append({
            "name":      s["name"],
            "area":      s["area"],
            "latitude":  s["latitude"],
            "longitude": s["longitude"],
            "phone":     s["phone"],
            "distance":  round(dist * 111, 2)
        })
    results = sorted(results, key=lambda x: x["distance"])[:5]
    return jsonify({"success": True, "stations": results})

@app.route("/api/crime-stats", methods=["GET"])
def crime_stats():
    crime_counts  = df["crime_type"].value_counts().to_dict()
    area_counts_s = df["area"].value_counts().head(10).to_dict()
    df["hour_col"] = df["time"].str.split(":").str[0].astype(int)
    hour_counts    = df["hour_col"].value_counts().sort_index().to_dict()
    return jsonify({
        "success":     True,
        "crime_types": crime_counts,
        "top_areas":   area_counts_s,
        "hourly":      {str(k): v for k, v in hour_counts.items()}
    })

# ─────────────────────────────────────────
# SAFE ROUTE
# ─────────────────────────────────────────
@app.route("/api/safe-route", methods=["POST"])
def safe_route():
    data     = request.json
    source   = data.get("source", "").strip()
    dest     = data.get("destination", "").strip()
    hour     = datetime.now().hour
    is_night = hour >= 20 or hour <= 5

    def match_area(user_input):
        user_input = user_input.strip().lower()
        for area in AREA_COORDS:
            if area.lower() == user_input:
                return area
        for area in AREA_COORDS:
            if user_input in area.lower() or area.lower() in user_input:
                return area
        return None

    source_area = match_area(source)
    dest_area   = match_area(dest)

    if not source_area or not dest_area:
        return jsonify({
            "success": False,
            "message": f"Area not found. Available: {', '.join(AREA_COORDS.keys())}"
        }), 400

    source_coord = AREA_COORDS[source_area]
    dest_coord   = AREA_COORDS[dest_area]

    df["hour_col"] = df["time"].str.split(":").str[0].astype(int)

    def get_real_crimes_near(coord, radius_km=3.0):
        lat        = coord["lat"]
        lon        = coord["lon"]
        df["dist"] = ((df["latitude"] - lat)**2 +
                      (df["longitude"] - lon)**2)**0.5 * 111
        return df[df["dist"] <= radius_km].copy()

    source_crimes_df = get_real_crimes_near(source_coord)
    dest_crimes_df   = get_real_crimes_near(dest_coord)

    def time_weighted_score(crimes_df):
        if len(crimes_df) == 0:
            return 0
        same_hour = crimes_df[
            (crimes_df["hour_col"] >= max(0,  hour - 2)) &
            (crimes_df["hour_col"] <= min(23, hour + 2))
        ]
        return len(crimes_df) + (len(same_hour) * 2)

    source_score = time_weighted_score(source_crimes_df)
    dest_score   = time_weighted_score(dest_crimes_df)

    def predict_risk_ml(coord, crime_count):
        enc      = le_crime.transform(["Theft"])[0]
        is_n     = 1 if is_night else 0
        features = np.array([[
            coord["lat"], coord["lon"],
            hour, datetime.now().month,
            datetime.now().weekday(),
            is_n, enc, 1, crime_count
        ]])
        pred = model.predict(features)[0]
        return le_risk.inverse_transform([pred])[0]

    source_ml_risk = predict_risk_ml(source_coord, len(source_crimes_df))
    dest_ml_risk   = predict_risk_ml(dest_coord,   len(dest_crimes_df))

    risk_map   = {"high": 3, "medium": 2, "low": 1}
    ml_score   = (risk_map.get(source_ml_risk, 1) +
                  risk_map.get(dest_ml_risk,   1)) * 15
    raw_score  = min(source_score + dest_score + ml_score, 200)
    risk_score = min(int(raw_score / 2), 100)
    if is_night:
        risk_score = min(int(risk_score * 1.4), 100)

    if risk_score >= 60:
        risk = "High"
    elif risk_score >= 30:
        risk = "Medium"
    else:
        risk = "Low"

    def crime_breakdown(crimes_df):
        if len(crimes_df) == 0:
            return {}
        return crimes_df["crime_type"].value_counts().head(5).to_dict()

    def peak_hours(crimes_df):
        if len(crimes_df) == 0:
            return []
        top = crimes_df["hour_col"].value_counts().head(3).index.tolist()
        return [f"{h}:00" for h in sorted(top)]

    source_breakdown = crime_breakdown(source_crimes_df)
    dest_breakdown   = crime_breakdown(dest_crimes_df)
    source_peak      = peak_hours(source_crimes_df)
    dest_peak        = peak_hours(dest_crimes_df)

    # ── FIXED: radius 2km + sort by distance not crime_count ──
    def nearby_hotspots_fn(coord, radius_km=2.0):
        results = []
        for h in hotspots:
            dist = ((h["latitude"] - coord["lat"])**2 +
                    (h["longitude"] - coord["lon"])**2)**0.5 * 111
            if dist <= radius_km:
                results.append({**h, "distance_km": round(dist, 2)})
        return sorted(results, key=lambda x: x["distance_km"])

    route_hotspots = (nearby_hotspots_fn(source_coord) +
                      nearby_hotspots_fn(dest_coord))
    seen            = set()
    unique_hotspots = []
    for h in route_hotspots:
        if h["cluster_id"] not in seen:
            seen.add(h["cluster_id"])
            unique_hotspots.append(h)

    # Sort by distance so closest hotspots show first
    unique_hotspots = sorted(unique_hotspots,
                             key=lambda x: x["distance_km"])[:6]

    all_crimes = (list(source_breakdown.keys()) +
                  list(dest_breakdown.keys()))
    tips = []
    if "Chain Snatching" in all_crimes or "Robbery" in all_crimes:
        tips.append("⚠️ Chain snatching reported — avoid wearing jewellery")
    if "Vehicle Theft" in all_crimes:
        tips.append("🚗 Vehicle theft common — park only in guarded areas")
    if "Harassment" in all_crimes:
        tips.append("👥 Travel in groups, especially after dark")
    if "Pickpocket" in all_crimes:
        tips.append("👜 Keep bags in front, avoid crowded spots")
    if is_night:
        tips.append("🌙 Late night — share live location with someone")
    tips.append("📞 Emergency: Police 100 | Women Helpline 1091")
    if not tips:
        tips.append("✅ Stay aware and keep valuables secure")

    conn     = get_db()
    stations = conn.execute(
        "SELECT * FROM police_stations"
    ).fetchall()
    conn.close()
    nearest_ps = min(
        [dict(s) for s in stations],
        key=lambda s: ((s["latitude"]  - dest_coord["lat"])**2 +
                       (s["longitude"] - dest_coord["lon"])**2)**0.5
    )

    return jsonify({
        "success":            True,
        "source":             source_area,
        "destination":        dest_area,
        "risk_level":         risk,
        "risk_score":         risk_score,
        "source_ml_risk":     source_ml_risk.capitalize(),
        "dest_ml_risk":       dest_ml_risk.capitalize(),
        "advice": (
            f"🔴 HIGH RISK — {len(source_crimes_df)} crimes near "
            f"{source_area}, {len(dest_crimes_df)} crimes near {dest_area}."
            if risk == "High" else
            f"🟡 MODERATE — Some crime activity near this route."
            if risk == "Medium" else
            f"🟢 SAFE — Low crime activity near both areas."
        ),
        "safety_tips":        tips,
        "source_crime_count": int(len(source_crimes_df)),
        "dest_crime_count":   int(len(dest_crimes_df)),
        "source_breakdown":   source_breakdown,
        "dest_breakdown":     dest_breakdown,
        "source_peak_hours":  source_peak,
        "dest_peak_hours":    dest_peak,
        "hotspots_nearby":    unique_hotspots,
        "nearest_police":     nearest_ps,
        "checked_at":         f"{hour:02d}:00 hrs",
        "is_night":           is_night,
        "night_warning":      (
            f"🌙 It is {hour:02d}:00 hrs — crime rates are higher at night!"
            if is_night else ""
        )
    })

# ─────────────────────────────────────────
# SOS
# ─────────────────────────────────────────
@app.route("/api/sos", methods=["POST"])
def sos():
    data      = request.json
    raw_lat   = float(data.get("latitude",  17.44))
    raw_lon   = float(data.get("longitude", 78.44))
    area      = data.get("area",     "Unknown")
    user_name = data.get("user_name", "Unknown")
    address   = data.get("address",  "Unknown location")

    user_lat, user_lon = resolve_coords(raw_lat, raw_lon, area)

    conn     = get_db()
    stations = conn.execute(
        "SELECT * FROM police_stations"
    ).fetchall()
    nearest  = min(
        [dict(s) for s in stations],
        key=lambda s: ((s["latitude"]  - user_lat)**2 +
                       (s["longitude"] - user_lon)**2)**0.5
    )
    conn.execute(
        """INSERT INTO sos_alerts
           (user_name,latitude,longitude,address,area,
            assigned_station,assigned_station_id,status)
           VALUES (?,?,?,?,?,?,?,'active')""",
        (user_name, user_lat, user_lon, address, area,
         nearest["name"], nearest["id"])
    )
    conn.commit()
    conn.close()
    return jsonify({
        "success":         True,
        "message":         f"🚨 SOS sent! {nearest['name']} has been notified.",
        "helpline":        "100",
        "nearest_station": nearest["name"],
        "station_phone":   nearest["phone"],
        "station_area":    nearest["area"]
    })

@app.route("/api/sos-alerts", methods=["GET"])
def get_sos_alerts():
    station_id = request.args.get("station_id")
    conn       = get_db()
    if station_id and station_id != "0":
        alerts = conn.execute(
            """SELECT * FROM sos_alerts
               WHERE assigned_station_id=?
               ORDER BY timestamp DESC LIMIT 20""",
            (station_id,)
        ).fetchall()
    else:
        alerts = conn.execute(
            "SELECT * FROM sos_alerts ORDER BY timestamp DESC LIMIT 20"
        ).fetchall()
    conn.close()
    return jsonify({"success": True,
                    "alerts": [dict(a) for a in alerts]})

@app.route("/api/sos-resolve/<int:alert_id>", methods=["POST"])
def resolve_sos(alert_id):
    conn = get_db()
    conn.execute(
        "UPDATE sos_alerts SET status='resolved' WHERE id=?",
        (alert_id,)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Alert resolved"})

# ─────────────────────────────────────────
# LIVE ALERTS
# ─────────────────────────────────────────
@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    station_id = request.args.get("station_id")
    conn       = get_db()
    if station_id and station_id != "0":
        alerts = conn.execute(
            """SELECT * FROM alerts
               WHERE station_id=? OR station_id=0
               ORDER BY timestamp DESC LIMIT 10""",
            (station_id,)
        ).fetchall()
    else:
        alerts = conn.execute(
            "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 10"
        ).fetchall()
    conn.close()
    return jsonify({"success": True,
                    "alerts": [dict(a) for a in alerts]})

# ─────────────────────────────────────────
# INCIDENT REPORTING
# ─────────────────────────────────────────
@app.route("/api/report-incident", methods=["POST"])
def report_incident():
    data      = request.json
    raw_lat   = float(data.get("latitude",  17.44))
    raw_lon   = float(data.get("longitude", 78.44))
    area      = data.get("area", "Unknown")
    user_name = data.get("user_name", "Anonymous")

    user_lat, user_lon = resolve_coords(raw_lat, raw_lon, area)

    conn     = get_db()
    stations = conn.execute(
        "SELECT * FROM police_stations"
    ).fetchall()
    nearest  = min(
        [dict(s) for s in stations],
        key=lambda s: ((s["latitude"]  - user_lat)**2 +
                       (s["longitude"] - user_lon)**2)**0.5
    )
    conn.execute(
        """INSERT INTO incidents
           (user_name,crime_type,description,latitude,longitude,
            area,severity,assigned_station,assigned_station_id,status)
           VALUES (?,?,?,?,?,?,?,?,?,'pending')""",
        (user_name, data.get("crime_type", "Other"),
         data.get("description", ""),
         user_lat, user_lon, area,
         data.get("severity", "Medium"),
         nearest["name"], nearest["id"])
    )
    conn.execute(
        """INSERT INTO alerts (area,message,severity,station_id)
           VALUES (?,?,?,?)""",
        (area,
         f"🚨 Incident: {data.get('crime_type','Crime')} near {area} by {user_name}",
         data.get("severity", "Medium"),
         nearest["id"])
    )
    conn.commit()
    conn.close()
    return jsonify({
        "success":       True,
        "message":       f"✅ Report sent to {nearest['name']}!",
        "assigned_to":   nearest["name"],
        "station_phone": nearest["phone"]
    })

@app.route("/api/incidents", methods=["GET"])
def get_incidents():
    station_id = request.args.get("station_id")
    conn       = get_db()
    if station_id and station_id != "0":
        incidents = conn.execute(
            """SELECT * FROM incidents
               WHERE assigned_station_id=?
               ORDER BY timestamp DESC LIMIT 30""",
            (station_id,)
        ).fetchall()
    else:
        incidents = conn.execute(
            "SELECT * FROM incidents ORDER BY timestamp DESC LIMIT 30"
        ).fetchall()
    conn.close()
    return jsonify({"success": True,
                    "incidents": [dict(i) for i in incidents]})

# ─────────────────────────────────────────
# PATROL RECOMMENDATIONS
# ─────────────────────────────────────────
@app.route("/api/patrol-recommendations", methods=["GET"])
def patrol_recommendations():
    hour     = datetime.now().hour
    is_night = hour >= 20 or hour <= 5
    is_peak  = 17 <= hour <= 20

    recommendations = []
    for h in hotspots[:10]:
        area_df      = df[df["area"] == h["area"]]
        area_df      = area_df.copy()
        area_df["h"] = area_df["time"].str.split(":").str[0].astype(int)
        night_crimes = len(area_df[area_df["h"] >= 20])
        day_crimes   = len(area_df) - night_crimes
        top_crimes   = area_df["crime_type"].value_counts().head(3).to_dict()
        unresolved   = len(area_df[area_df["status"] == "Unresolved"]) \
                       if "status" in area_df.columns else 0

        if h["risk_level"] == "High":
            priority  = "🔴 URGENT"
            action    = "Deploy 2 patrol units immediately"
            frequency = "Every 30 minutes"
        elif h["risk_level"] == "Medium":
            priority  = "🟡 MODERATE"
            action    = "Increase patrol frequency"
            frequency = "Every 1 hour"
        else:
            priority  = "🟢 NORMAL"
            action    = "Regular patrol"
            frequency = "Every 2 hours"

        time_warning = ""
        if is_night and night_crimes > day_crimes:
            time_warning = "⚠️ Night hotspot — double patrol tonight"
        elif is_peak:
            time_warning = "⚠️ Peak hours — monitor closely"

        recommendations.append({
            "area":         h["area"],
            "risk_level":   h["risk_level"],
            "priority":     priority,
            "action":       action,
            "frequency":    frequency,
            "crime_count":  h["crime_count"],
            "top_crimes":   list(top_crimes.keys()),
            "unresolved":   unresolved,
            "time_warning": time_warning,
            "night_crimes": night_crimes,
            "day_crimes":   day_crimes,
            "coordinates":  {"lat": h["latitude"], "lon": h["longitude"]}
        })

    return jsonify({
        "success":         True,
        "current_hour":    hour,
        "shift":           ("Night Shift 🌙" if is_night
                            else "Evening Shift 🌆" if is_peak
                            else "Day Shift ☀️"),
        "recommendations": recommendations
    })

# ─────────────────────────────────────────
# TONIGHT'S RISK PREDICTION
# ─────────────────────────────────────────
@app.route("/api/risk-prediction-tonight", methods=["GET"])
def risk_prediction_tonight():
    hour        = datetime.now().hour
    predictions = []

    for area_name, count in list(area_counts.items())[:10]:
        coords   = AREA_COORDS.get(area_name, {"lat": 17.44, "lon": 78.44})
        enc      = le_crime.transform(["Theft"])[0]
        features = np.array([[coords["lat"], coords["lon"], 21, 6, 4, 1, enc, 1, count]])
        pred     = model.predict(features)[0]
        risk     = le_risk.inverse_transform([pred])[0]
        area_df  = df[df["area"] == area_name].copy()
        area_df["h"] = area_df["time"].str.split(":").str[0].astype(int)
        night_count  = len(area_df[area_df["h"] >= 20])

        predictions.append({
            "area":                area_name,
            "predicted_risk":      risk.capitalize(),
            "night_crime_history": night_count,
            "total_crimes":        count,
            "alert":               night_count > 20
        })

    predictions.sort(key=lambda x: x["night_crime_history"], reverse=True)
    return jsonify({
        "success":      True,
        "predictions":  predictions,
        "generated_at": datetime.now().strftime("%H:%M:%S")
    })

# ─────────────────────────────────────────
# RUN
# ─────────────────────────────────────────
if __name__ == "__main__":
    app.run(debug=True, port=5000)