# main.py
import os
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from geopy.distance import geodesic

# Local project imports
from mock_data import BASINS_CONFIG
from rag_engine import seed_initial_knowledge, query_knowledge_base, ingest_pdf_document
from risk_engine import calculate_drilling_risk

# Initialize FastAPI instance
app = FastAPI(title="eRTMAC-NWIS Intelligence System")

# Seed ChromaDB vector store on initialization
seed_initial_knowledge()

# Enable CORS for backward compatibility and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------

@app.get("/api/basins")
def get_all_basins():
    """Returns list of all active drilling basins across India."""
    return [
        {"id": k, "name": v["name"], "center": v["center"], "rig": v["default_rig"]}
        for k, v in BASINS_CONFIG.items()
    ]

@app.get("/api/wells/nearby")
def get_nearby_wells(basin: str = "assam", radius_km: float = 10.0):
    """Filter wells for the selected basin."""
    b_data = BASINS_CONFIG.get(basin, BASINS_CONFIG["assam"])
    active_well = next((w for w in b_data["wells"] if w["status"] == "Active"), b_data["wells"][0])
    active_point = (active_well["latitude"], active_well["longitude"])

    nearby = []
    for well in b_data["wells"]:
        dist = geodesic(active_point, (well["latitude"], well["longitude"])).kilometers
        if dist <= radius_km:
            entry = well.copy()
            entry["distance_km"] = round(dist, 2)
            nearby.append(entry)
    return nearby

@app.get("/api/wells/correlation")
def get_correlation_data(basin: str = "assam"):
    """Retrieve basin-specific stratigraphy and incidents."""
    b_data = BASINS_CONFIG.get(basin, BASINS_CONFIG["assam"])
    active_well = next((w for w in b_data["wells"] if w["status"] == "Active"), b_data["wells"][0])
    return {
        "active_well_id": active_well["id"],
        "formations": b_data["formations"],
        "offset_incidents": b_data["incidents"]
    }

@app.get("/api/risk/evaluate")
def evaluate_risk(lat: float = 26.8500, lon: float = 94.3200, depth_m: float = 2485.0, formation: str = "Barail Formation"):
    """Evaluate multi-parameter downhole hazard index."""
    return calculate_drilling_risk(lat, lon, depth_m, formation)

@app.get("/api/knowledge/search")
def search_historical_knowledge(query: str):
    """Semantic vector search across well reports using ChromaDB."""
    results = query_knowledge_base(query)
    return {"query": query, "results": results}

@app.post("/api/documents/upload")
async def upload_drilling_report(file: UploadFile = File(...)):
    """Accept PDF documents, extract text, and index into ChromaDB."""
    if not file.filename.endswith(".pdf"):
        return {"status": "ERROR", "message": "Only PDF documents are supported."}
        
    contents = await file.read()
    result = ingest_pdf_document(contents, file.filename)
    return result

@app.websocket("/ws/drilling-feed")
async def drilling_feed(websocket: WebSocket):
    """Simulate real-time depth telemetry stream over WebSocket."""
    await websocket.accept()
    current_depth = 2480
    
    try:
        while True:
            current_depth += 5
            risk_eval = calculate_drilling_risk(26.8500, 94.3200, current_depth, "Barail Formation")
            
            payload = {
                "current_depth_m": current_depth,
                "current_formation": "Barail Formation",
                "risk_gauge_percent": risk_eval["risk_percentage"],
                "alert": risk_eval["hazards"][0] if risk_eval["hazards"] else None
            }
            
            await websocket.send_json(payload)
            await asyncio.sleep(2)
            
    except WebSocketDisconnect:
        print("Telemetry stream disconnected.")

# ---------------------------------------------------------
# Static File Mounting: Serving React Frontend from FastAPI
# ---------------------------------------------------------

# Path to the compiled React production build
FRONTEND_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "nwis-frontend", "dist"))

if os.path.exists(FRONTEND_DIST_DIR):
    # Mount compiled static assets (JS, CSS, images) under /assets
    assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Catch-all route to serve index.html for Single-Page Application (SPA) routing
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # Allow API requests to pass through untouched
        if full_path.startswith("api/") or full_path.startswith("ws/"):
            return None
            
        file_path = os.path.join(FRONTEND_DIST_DIR, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        return FileResponse(os.path.join(FRONTEND_DIST_DIR, "index.html"))