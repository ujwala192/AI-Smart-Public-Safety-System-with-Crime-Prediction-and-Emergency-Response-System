import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
import pickle
import os
import json

# ─────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────
print("📂 Loading dataset...")
df = pd.read_csv("data/crime_data.csv")
print(f"✅ Loaded {len(df)} records\n")

# ─────────────────────────────────────────
# 2. FEATURE ENGINEERING
# ─────────────────────────────────────────
print("🔧 Engineering features...")

# Extract hour and month from date/time
df["hour"]    = df["time"].str.split(":").str[0].astype(int)
df["month"]   = pd.to_datetime(df["date"]).dt.month
df["weekday"] = pd.to_datetime(df["date"]).dt.dayofweek
df["is_night"] = (df["hour"] >= 20) | (df["hour"] <= 5)
df["is_night"] = df["is_night"].astype(int)

# Encode crime type as number
le_crime = LabelEncoder()
df["crime_type_encoded"] = le_crime.fit_transform(df["crime_type"])

# Encode risk label
le_risk = LabelEncoder()
df["risk_encoded"] = le_risk.fit_transform(df["base_risk"])

# Count crimes per area (density feature)
area_counts = df["area"].value_counts().to_dict()
df["area_crime_count"] = df["area"].map(area_counts)

print("✅ Features ready\n")

# ─────────────────────────────────────────
# 3. DBSCAN HOTSPOT DETECTION
# ─────────────────────────────────────────
print("🗺️  Running DBSCAN hotspot detection...")

# Convert lat/lon to radians for DBSCAN
coords = df[["latitude", "longitude"]].values
coords_rad = np.radians(coords)

# DBSCAN: eps=0.5km, min 5 crimes to form a hotspot
db = DBSCAN(eps=1.5/6371, min_samples=3, algorithm="ball_tree", metric="haversine")
df["cluster"] = db.fit_predict(coords_rad)

# Count how many clusters found
n_clusters = len(set(df["cluster"])) - (1 if -1 in df["cluster"].values else 0)
print(f"✅ Found {n_clusters} crime hotspot clusters\n")

# Build hotspot summary per cluster
hotspots = []
for cluster_id in sorted(set(df["cluster"])):
    if cluster_id == -1:
        continue  # skip noise points
    cluster_data = df[df["cluster"] == cluster_id]
    hotspots.append({
        "cluster_id":   int(cluster_id),
        "latitude":     round(float(cluster_data["latitude"].mean()), 6),
        "longitude":    round(float(cluster_data["longitude"].mean()), 6),
        "crime_count":  int(len(cluster_data)),
        "top_crime":    cluster_data["crime_type"].mode()[0],
        "area":         cluster_data["area"].mode()[0],
        "risk_level":   "High" if len(cluster_data) > 20
                        else "Medium" if len(cluster_data) > 10
                        else "Low"
    })

# Sort by crime count
hotspots = sorted(hotspots, key=lambda x: x["crime_count"], reverse=True)

# Save hotspots to JSON
os.makedirs("models", exist_ok=True)
with open("models/hotspots.json", "w") as f:
    json.dump(hotspots, f, indent=2)
print(f"✅ Saved {len(hotspots)} hotspots to models/hotspots.json\n")

# ─────────────────────────────────────────
# 4. RANDOM FOREST RISK PREDICTION
# ─────────────────────────────────────────
print("🤖 Training Random Forest model...")

features = [
    "latitude", "longitude", "hour", "month",
    "weekday", "is_night", "crime_type_encoded",
    "severity_score", "area_crime_count"
]

X = df[features]
y = df["risk_encoded"]   # 0=high, 1=low, 2=medium (alphabetical)

# Split into train and test
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

# Train the model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
y_pred   = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"✅ Model Accuracy: {accuracy * 100:.2f}%\n")
print("📊 Classification Report:")
print(classification_report(y_test, y_pred,
      target_names=le_risk.classes_))

# ─────────────────────────────────────────
# 5. SAVE MODEL & ENCODERS
# ─────────────────────────────────────────
print("\n💾 Saving model and encoders...")

pickle.dump(model,    open("models/risk_model.pkl",    "wb"))
pickle.dump(le_crime, open("models/le_crime.pkl",      "wb"))
pickle.dump(le_risk,  open("models/le_risk.pkl",       "wb"))

# Save area crime counts for API use
with open("models/area_counts.json", "w") as f:
    json.dump(area_counts, f)

print("✅ Saved: models/risk_model.pkl")
print("✅ Saved: models/le_crime.pkl")
print("✅ Saved: models/le_risk.pkl")
print("✅ Saved: models/area_counts.json")
print("\n🎉 ML Phase Complete! All models ready.")