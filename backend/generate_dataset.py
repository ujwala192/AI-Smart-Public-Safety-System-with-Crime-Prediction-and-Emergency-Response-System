import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta
import os

random.seed(42)
np.random.seed(42)

areas = [
    {"name": "Hitech City",    "lat": 17.4435, "lon": 78.3772, "risk": "high"},
    {"name": "Gachibowli",     "lat": 17.4401, "lon": 78.3489, "risk": "medium"},
    {"name": "Banjara Hills",  "lat": 17.4156, "lon": 78.4347, "risk": "medium"},
    {"name": "Jubilee Hills",  "lat": 17.4320, "lon": 78.4071, "risk": "low"},
    {"name": "Secunderabad",   "lat": 17.4399, "lon": 78.4983, "risk": "high"},
    {"name": "Charminar",      "lat": 17.3616, "lon": 78.4747, "risk": "high"},
    {"name": "LB Nagar",       "lat": 17.3469, "lon": 78.5469, "risk": "high"},
    {"name": "Dilsukhnagar",   "lat": 17.3688, "lon": 78.5247, "risk": "medium"},
    {"name": "Ameerpet",       "lat": 17.4375, "lon": 78.4483, "risk": "medium"},
    {"name": "Kukatpally",     "lat": 17.4849, "lon": 78.4138, "risk": "medium"},
    {"name": "Madhapur",       "lat": 17.4485, "lon": 78.3908, "risk": "low"},
    {"name": "Begumpet",       "lat": 17.4418, "lon": 78.4636, "risk": "low"},
    {"name": "Uppal",          "lat": 17.4054, "lon": 78.5590, "risk": "high"},
    {"name": "Miyapur",        "lat": 17.4956, "lon": 78.3694, "risk": "low"},
    {"name": "ECIL",           "lat": 17.4691, "lon": 78.5624, "risk": "medium"},
]

crime_types = ["Theft", "Robbery", "Assault", "Burglary", "Chain Snatching",
               "Vehicle Theft", "Harassment", "Fraud", "Vandalism", "Pickpocket"]

severity_map    = {"high": [2, 2], "medium": [1, 1], "low": [0, 0]}
severity_labels = ["Low", "Medium", "High"]

records    = []
start_date = datetime(2022, 1, 1)

for i in range(2000):
    area = random.choice(areas)
    lat  = area["lat"] + np.random.normal(0, 0.008)
    lon  = area["lon"] + np.random.normal(0, 0.008)

    if area["risk"] == "high":
        hour = random.choices(range(24), weights=[
            1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,3,4,5,5,5,4,3,2])[0]
    else:
        hour = random.randint(0, 23)

    date = start_date + timedelta(days=random.randint(0, 730))

    if random.random() < 0.2:
        severity_val = random.randint(0, 2)
    else:
        severity_val = random.choice(severity_map[area["risk"]])

    records.append({
        "crime_id":       i + 1,
        "crime_type":     random.choice(crime_types),
        "date":           date.strftime("%Y-%m-%d"),
        "time":           f"{hour:02d}:{random.randint(0,59):02d}",
        "latitude":       round(lat, 6),
        "longitude":      round(lon, 6),
        "area":           area["name"],
        "severity":       severity_labels[severity_val],
        "severity_score": severity_val,
        "status":         random.choice(["Resolved", "Unresolved",
                                         "Under Investigation"]),
        "base_risk":      area["risk"]
    })

df = pd.DataFrame(records)
os.makedirs("data", exist_ok=True)
df.to_csv("data/crime_data.csv", index=False)
print(f"✅ Dataset created: {len(df)} records saved to backend/data/crime_data.csv")
print(df.head())
print("\nArea-wise crime count:")
print(df["area"].value_counts())