# risk_engine.py
from geopy.distance import geodesic
from mock_data import WELLS_DATA, INCIDENTS_DATA

SEVERITY_WEIGHTS = {
    "CRITICAL": 1.0,
    "HIGH": 0.75,
    "MEDIUM": 0.4,
    "LOW": 0.2
}

def calculate_drilling_risk(active_lat: float, active_lon: float, current_depth_m: float, current_formation: str):
    """
    Evaluates risk score (0-100%) and identifies immediate hazards
    by correlating offset well proximity, depth window, and formation matching.
    """
    active_point = (active_lat, active_lon)
    total_risk_score = 0.0
    detected_hazards = []
    
    # Pre-calculate distances to offset wells
    well_distances = {}
    for well in WELLS_DATA:
        if well["status"] != "Active":
            dist = geodesic(active_point, (well["latitude"], well["longitude"])).kilometers
            well_distances[well["id"]] = dist

    # Evaluate each historical incident against current drilling bit state
    for inc in INCIDENTS_DATA:
        well_id = inc["well_id"]
        dist_km = well_distances.get(well_id, 10.0)
        
        # Spatial decay: closer wells contribute higher risk
        spatial_decay = 1.0 / (1.0 + (dist_km * 0.3))
        
        # Depth window: +/- 40 meters proximity
        depth_delta = abs(inc["depth_m"] - current_depth_m)
        depth_factor = max(0.0, 1.0 - (depth_delta / 40.0)) if depth_delta <= 40 else 0.0
        
        # Formation factor: 1.0 if identical formation layer
        formation_factor = 1.0 if inc.get("formation") == current_formation else 0.5
        
        # Base severity
        sev_weight = SEVERITY_WEIGHTS.get(inc.get("severity", "MEDIUM"), 0.5)
        
        # Combined incident risk weight
        incident_risk = sev_weight * spatial_decay * depth_factor * formation_factor * 100
        
        if incident_risk > 15:  # Significant threat detected
            total_risk_score = max(total_risk_score, incident_risk)
            detected_hazards.append({
                "offset_well": well_id,
                "distance_km": round(dist_km, 2),
                "incident_type": inc["event_type"],
                "severity": inc["severity"],
                "depth_m": inc["depth_m"],
                "proximity_m": round(depth_delta, 1),
                "mitigation": inc["mitigation"]
            })

    # Default operational baseline risk
    risk_percentage = min(95, max(18, round(total_risk_score, 1)))
    
    # Determine risk category
    if risk_percentage >= 70:
        level = "CRITICAL"
    elif risk_percentage >= 45:
        level = "ELEVATED"
    else:
        level = "NORMAL"

    return {
        "current_depth_m": current_depth_m,
        "current_formation": current_formation,
        "risk_percentage": risk_percentage,
        "risk_level": level,
        "hazards_count": len(detected_hazards),
        "hazards": detected_hazards
    }
