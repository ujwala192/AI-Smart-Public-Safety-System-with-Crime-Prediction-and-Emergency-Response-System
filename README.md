# 🚨 AI-Smart Public Safety System

## Crime Prediction, Hotspot Detection & Emergency Response System

An AI-powered public safety platform that combines **Machine Learning, Geospatial Analysis, Web Technologies, and Emergency Response** to help users identify crime-prone areas, assess area risk, find safer routes, report incidents, and send SOS alerts to nearby police stations.

---

## 📌 Project Overview

The **AI-Smart Public Safety System** is a web-based application designed to support public safety through intelligent crime analysis and emergency response.

The system analyzes historical crime data using:

- 🌲 **Random Forest** — Crime-risk classification
- 📍 **DBSCAN** — Crime hotspot detection
- 🗺️ **Geospatial analysis** — Location and distance calculations
- 🚨 **Rule-based decision logic** — Patrol recommendations, alerts, and emergency response

The system provides separate interfaces for **public users and police personnel**.

---

## 🎯 Objectives

1. Identify geographical crime hotspots.
2. Classify crime risk into **Low, Medium, and High** levels.
3. Allow users to check the risk of an area.
4. Provide crime-based safer route risk information.
5. Help users locate nearby police stations.
6. Allow users to report criminal incidents.
7. Provide an SOS emergency alert mechanism.
8. Help police monitor incidents and emergency alerts.
9. Generate patrol recommendations based on crime risk.
10. Provide night-time risk information for selected areas.

---

# ✨ Key Features

## 👤 Public User Features

### 1. User Registration & Login
Users can create an account and access the public safety system.

### 2. Crime Hotspot Map
Displays geographically concentrated crime locations identified using **DBSCAN clustering**.

### 3. Area Risk Checker
Users can select an area and obtain:

- 🟢 Low Risk
- 🟡 Medium Risk
- 🔴 High Risk

The prediction uses the trained Random Forest model.

### 4. Safe Route Risk
Users can provide a source and destination area to obtain crime-based route risk information.

The system considers crime activity, location, time, historical crime information, machine-learning risk, and night-time conditions.

### 5. Nearby Police Stations
The system identifies nearby police stations using geographical distance calculations.

### 6. Crime/Incident Reporting
Users can report incidents by providing crime type, description, location, area, and severity.

### 7. SOS Emergency Alert
Users can trigger an SOS alert during an emergency. The system records emergency information and assigns it to the appropriate police station.

### 8. Safety Alerts
Users can view relevant safety and crime-related alerts.

---

# 👮 Police Features

Police personnel have a dedicated dashboard for monitoring public-safety information.

Police can:

- View crime statistics
- Monitor crime hotspots
- View reported incidents
- Monitor SOS alerts
- Resolve SOS alerts
- Monitor high-risk areas
- View patrol recommendations
- View night-time risk information

---

# 🤖 Artificial Intelligence & Machine Learning

The project uses two primary machine-learning techniques.

## 1. 🌲 Random Forest

Random Forest is used for **crime-risk classification**.

### Input Features

```text
Latitude
Longitude
Hour
Month
Weekday
Night Indicator
Crime Type
Severity Score
Area Crime Count
```

### Output

```text
Low Risk
Medium Risk
High Risk
```

### Model Configuration

```python
RandomForestClassifier(
    n_estimators=100,
    random_state=42
)
```

The dataset is divided into:

```text
80% → Training Data
20% → Testing Data
```

---

## 2. 📍 DBSCAN

DBSCAN is used for **geographical crime hotspot detection**.

It groups geographically close crime incidents into clusters.

### Main parameters

```text
eps ≈ 1.5 km
min_samples = 3
metric = haversine
```

Points classified as `-1` are treated as noise.

### Hotspot Risk

After clusters are detected, the system determines hotspot risk using crime counts:

```text
Crime Count > 20 → High
Crime Count > 10 → Medium
Otherwise         → Low
```

> DBSCAN identifies the geographical clusters; the subsequent rule determines their displayed risk level.

---

# 🧠 Feature Engineering

The crime dataset is transformed into useful machine-learning features.

### Hour
The hour is extracted from the crime time.

Example:

```text
21:30 → 21
```

### Month
The month is extracted from the crime date.

### Weekday
The day of the week is extracted from the crime date.

### Night Indicator

```text
20:00 – 23:59 → Night
00:00 – 05:59 → Night
06:00 – 19:59 → Day
```

### Crime Type Encoding
Categorical crime types are converted into numerical values using label encoding.

### Area Crime Count
The number of crimes associated with each area is calculated and used as an additional feature.

---

# 🏗️ System Architecture

```text
                    CRIME DATASET
                         │
                         ▼
                DATA PREPROCESSING
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
           DBSCAN              RANDOM FOREST
              │                     │
              ▼                     ▼
       CRIME HOTSPOTS          RISK PREDICTION
              │                     │
              └──────────┬──────────┘
                         ▼
                    FLASK BACKEND
                         │
             ┌───────────┴───────────┐
             │                       │
             ▼                       ▼
        REACT FRONTEND           SQLITE DB
             │                       │
       ┌─────┴─────┐          ┌──────┴──────┐
       │           │          │             │
       ▼           ▼          ▼             ▼
    PUBLIC       POLICE     USERS       INCIDENTS/
   DASHBOARD    DASHBOARD              SOS/ALERTS
```

---

# 🔄 Complete Project Workflow

```text
Historical Crime Data
        │
        ▼
Data Preprocessing
        │
        ▼
Feature Engineering
        │
        ├──────────────────┐
        ▼                  ▼
     DBSCAN          Random Forest
        │                  │
        ▼                  ▼
 Crime Hotspots       Risk Prediction
        │                  │
        └─────────┬────────┘
                  ▼
             Flask Backend
                  │
                  ▼
             REST APIs
                  │
                  ▼
             React Frontend
                  │
       ┌──────────┼───────────┐
       ▼          ▼           ▼
   Risk Check   Hotspots   Safe Route
       │          │           │
       └──────────┼───────────┘
                  ▼
          Public Safety Services
                  │
       ┌──────────┼───────────┐
       ▼          ▼           ▼
      SOS      Incidents    Alerts
       │          │
       └─────┬────┘
             ▼
       Police Dashboard
             │
       ┌─────┴─────┐
       ▼           ▼
    Patrol      Emergency
 Recommendations Response
```

---

# 🛠️ Technology Stack

| Category | Technology |
|---|---|
| Frontend | React.js |
| Backend | Python Flask |
| Programming | Python, JavaScript |
| Machine Learning | Scikit-learn |
| Classification | Random Forest |
| Clustering | DBSCAN |
| Data Processing | Pandas, NumPy |
| Database | SQLite |
| Maps | Leaflet |
| API Requests | Axios |
| Model Storage | Pickle |
| Authentication | SHA-256 |
| Browser | Chrome / Firefox / Edge |

---

# 📂 Project Structure

A typical implementation structure is:

```text
AI-Smart-Public-Safety-System/
│
├── backend/
│   ├── app.py
│   ├── ML_model.py
│   ├── database.py
│   ├── models/
│   │   └── crime_risk_model.pkl
│   │
│   ├── data/
│   │   └── crime_data.csv
│   │
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx
│   │
│   ├── package.json
│   └── public/
│
├── database/
│   └── database.db
│
└── README.md
```

> The exact repository folder structure should match the actual project files when published.

---

# 📊 Database

The system uses **SQLite** for application information.

Major tables include:

### `users`
Stores user and police account information.

### `police_stations`
Stores station name, area, latitude, longitude, and phone number.

### `sos_alerts`
Stores emergency SOS information.

### `incidents`
Stores user-reported crime incidents.

### `alerts`
Stores safety alerts.

### `route_history`
Stores route-risk information.

---

# 🔌 Major REST APIs

## Authentication

```text
POST /api/register
POST /api/login
```

## Crime Analysis

```text
GET /api/hotspots
GET /api/areas
GET /api/area-risk
GET /api/crime-stats
```

## Police Stations

```text
GET /api/police-stations-list
GET /api/nearby-police
```

## Safe Route

```text
POST /api/safe-route
```

## SOS

```text
POST /api/sos
GET  /api/sos-alerts
POST /api/sos-resolve/<id>
```

## Incidents

```text
POST /api/report-incident
GET  /api/incidents
```

## Police Intelligence

```text
GET /api/patrol-recommendations
GET /api/risk-prediction-tonight
```

---

# 🚨 SOS Workflow

```text
User
 │
 ▼
Press SOS
 │
 ▼
Capture Emergency Information
 │
 ▼
Find Appropriate Police Station
 │
 ▼
Store SOS Alert
 │
 ▼
Police Dashboard
 │
 ▼
Police Responds
 │
 ▼
Mark Alert as Resolved
```

---

# 📝 Incident Reporting Workflow

```text
User
 │
 ▼
Report Incident
 │
 ▼
Enter Crime Details
 │
 ▼
Determine Police Station
 │
 ▼
Store Incident
 │
 ▼
Police Dashboard
 │
 ▼
Police Reviews Incident
```

---

# 👮 Patrol Recommendation Workflow

```text
Crime Data
    │
    ▼
Hotspot Detection
    │
    ▼
Risk Level
    │
    ▼
Patrol Recommendation
```

The implementation uses rule-based recommendations such as:

```text
High Risk
→ Urgent patrol
→ 2 patrol units
→ Approximately every 30 minutes

Medium Risk
→ Increased patrol
→ Approximately every 1 hour

Low Risk
→ Regular patrol
→ Approximately every 2 hours
```

---

# 🌙 Night Risk Analysis

The system considers historical night-time crime activity.

```text
Crime Data
    │
    ▼
Identify Night Crimes
    │
    ▼
Calculate Night Crime History
    │
    ▼
Combine with Risk Information
    │
    ▼
Generate Night Risk Information
```

---

# ⚙️ Installation

## 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd AI-Smart-Public-Safety-System
```

## 2. Create a Python virtual environment

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

## 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

---

# 🧠 Train the ML Model

Place the crime dataset at:

```text
backend/data/crime_data.csv
```

Then run:

```bash
python ML_model.py
```

The training process is:

```text
Load Dataset
     ↓
Clean Data
     ↓
Feature Engineering
     ↓
Encode Crime Types
     ↓
Calculate Area Crime Count
     ↓
Train Random Forest
     ↓
Evaluate Model
     ↓
Save Trained Model
```

---

# ▶️ Run the Backend

```bash
cd backend
python app.py
```

The Flask server provides the REST APIs used by the frontend.

---

# ▶️ Run the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm start
```

The React frontend communicates with the Flask backend through REST APIs.

---

# 🔐 User Roles

## 👤 Public User

```text
Register/Login
View hotspots
Check area risk
Check route risk
Find police stations
Report incidents
Send SOS
View alerts
```

## 👮 Police User

```text
Login
View crime statistics
View hotspots
Monitor incidents
Monitor SOS alerts
Resolve SOS alerts
View patrol recommendations
View night risk information
```

---

# 📈 Example Prediction

Example input:

```text
Hour             → 22
Month            → 9
Weekday          → 2
Night            → Yes
Crime Type       → Theft
Severity         → High
Area Crime Count → 25
```

The Random Forest model produces a risk category:

```text
Predicted Risk: HIGH
```

---

# 📍 Example Hotspot Detection

If DBSCAN finds:

```text
Cluster 0 → 25 crimes
Cluster 1 → 14 crimes
Cluster 2 → 5 crimes
```

The system assigns:

```text
Cluster 0 → High Risk
Cluster 1 → Medium Risk
Cluster 2 → Low Risk
```

---

# 🔒 Security

The implementation includes user authentication and SHA-256 password hashing as described in the project report.

For production deployment, additional security measures such as secure password hashing, HTTPS, token-based authentication, input validation, and secret management should be implemented.

---

# ⚠️ Technical Note

The project should be understood as a **crime-risk classification and hotspot-analysis system**, rather than a system that can guarantee or precisely forecast future crimes.

```text
Random Forest
→ Risk Classification

DBSCAN
→ Spatial Hotspot Detection

Rule-Based Logic
→ Patrol / Route / Alert Decisions
```

The current Safe Route module calculates **crime-based route risk between configured areas**; it does not demonstrate a complete road-network shortest/safest-path algorithm such as A* or Dijkstra.

---

# 🚀 Future Enhancements

- Real-time crime-data integration
- Real road-network routing
- A* / Dijkstra-based safe route optimization
- Real-time GPS tracking
- Mobile application
- Push notifications
- Advanced deep-learning models
- Real-time CCTV integration
- Police vehicle tracking
- Advanced time-series crime forecasting
- Explainable AI
- Role-based access control
- Cloud deployment
- Live emergency communication

---

# 👩‍💻 Project Information

**Project:** AI-Smart Public Safety System with Crime Prediction and Emergency Response System

**Domains:**

```text
Artificial Intelligence
Machine Learning
Data Science
Geospatial Analysis
Web Development
Public Safety
```

---

# 📜 License

This project was developed for **academic/project purposes**.

Add an appropriate open-source license if the source code will be publicly distributed.

---

## ⭐ Project Summary

```text
AI-Smart Public Safety System
             │
             ├── Random Forest
             │       └── Crime Risk Classification
             │
             ├── DBSCAN
             │       └── Crime Hotspot Detection
             │
             ├── Safe Route
             │       └── Crime-Based Route Risk
             │
             ├── SOS
             │       └── Emergency Response
             │
             ├── Incident Reporting
             │       └── Police Monitoring
             │
             ├── Patrol Recommendations
             │       └── Police Decision Support
             │
             └── React + Flask + SQLite
                     └── Complete Web Platform
```

**In short:** the project integrates **machine learning + geographical crime analysis + web application + emergency response** into a single public-safety platform.
