# 🛢️ eRTMAC-NWIS: Autonomous Downhole Geohazard Prediction Engine

An institutional-grade drilling digital-twin system engineered for **Oil India Limited (OIL)**. It transforms fragmented, historical well records into actionable, real-time geohazard advisories during drilling operations.

---

## 📌 Problem Context & Executive Summary

During critical exploratory and development drilling, downhole geohazards—such as high-pressure kicks, catastrophic mud circulation losses, and differential pipe sticking—lead to millions in Non-Productive Time (NPT) and potential well-control emergencies. 

Historically, valuable lessons learned remain trapped across hundreds of static, unstructured Daily Drilling Reports (DDRs) and Well Completion Reports (WCRs). **eRTMAC-NWIS** acts as an autonomous digital twin by cross-referencing real-time telemetry (TVD depth, formation stratigraphy, geographic coordinates) against offset well profiles and vector-indexed historical reports.

---

## 🚀 Key Architectural Pillars

* **Multi-Basin Exploration Coverage:** Pan-India operational telemetry supporting major oil fields across the **Assam-Arakan Basin (OIL Hub)**, **Rajasthan (Barmer Basin)**, and the **UP Ganga Basin**.
* **Decay-Weighted Hazard Formulation:** Real-time mathematical scoring using WGS-84 geodesic offset distances, vertical proximity buffers ($\pm 30\text{ m}$), and formation cross-matching.
* **Vector Semantic RAG Engine:** Powered by **ChromaDB**, allowing semantic retrieval across archived Daily Drilling Reports and on-the-fly ingestion of unstructured operational PDFs.
* **Tactical 3-Pane Cockpit:**
  * **Pane 1 (Geospatial Discovery):** Interactive GIS radar with dynamic offset radius filtering (5 km to 60 km).
  * **Pane 2 (Subterranean Twin):** Synchronized visual drill-stem progression, geological strata column, and offset incident horizon indicators.
  * **Pane 3 (Proactive Advisor):** Real-time hazard gauge and instant operational mitigations.
* **100% Grounded Recommendations:** Eliminates AI hallucination by directly citing archived Well Completion Reports (WCR) with verified source snippets.

---

## 🛠️ Tech Stack

* **Backend & ML Engine:** FastAPI, Python, ChromaDB, PyPDF, Geopy (WGS-84 ellipsoidal computations).
* **Frontend Digital Twin:** React 19, Vite, Leaflet GIS, Lucide-React.
* **Deployment Pattern:** Full-stack monolith serving Vite static production assets via FastAPI to eliminate CORS overhead.

---

## 📂 Repository Structure

```text
eRTMAC-NWIS/
├── nwis-backend/
│   ├── main.py              # FastAPI app & static build server
│   ├── mock_data.py         # Multi-basin telemetry & lithology profiles
│   ├── risk_engine.py       # Distance-decay spatial hazard scoring
│   ├── rag_engine.py        # ChromaDB vector embedding & RAG pipeline
│   └── requirements.txt     # Python dependencies
├── nwis-frontend/
│   ├── src/
│   │   ├── App.jsx          # Tactical cockpit & digital twin interface
│   │   ├── App.css          # Industrial dark telemetry styling
│   │   └── main.jsx         # React DOM root
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
