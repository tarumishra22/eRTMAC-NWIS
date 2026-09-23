# mock_data.py

# Multi-Basin Pan-India Master Repository
BASINS_CONFIG = {
    "assam": {
        "name": "Assam-Arakan Basin (OIL Hub)",
        "center": [26.8500, 94.3200],
        "default_rig": "OIL-BOR-09",
        "wells": [
            {
                "id": "OIL-BOR-09",
                "name": "Borholla Active Rig 09",
                "latitude": 26.8500,
                "longitude": 94.3200,
                "status": "Active",
                "current_depth": 2485,
                "formation": "Barail Sandstone"
            },
            {
                "id": "OIL-DIB-02",
                "name": "Digboi Offset Well 02",
                "latitude": 26.8820,
                "longitude": 94.3410,
                "status": "Completed",
                "total_depth": 3100,
                "formation": "Barail Sandstone"
            },
            {
                "id": "OIL-NAH-04",
                "name": "Nahorkatiya Offset Well 04",
                "latitude": 26.8310,
                "longitude": 94.2950,
                "status": "Completed",
                "total_depth": 2900,
                "formation": "Tipam Sandstone"
            }
        ],
        "formations": [
            {"name": "Girujan Clay", "top_m": 1800, "bottom_m": 2200, "color": "#8d5b4c"},
            {"name": "Tipam Sandstone", "top_m": 2200, "bottom_m": 2450, "color": "#d97706"},
            {"name": "Barail Sandstone", "top_m": 2450, "bottom_m": 2900, "color": "#059669"}
        ],
        "incidents": [
            {
                "incident_id": "INC-ASM-01",
                "well_id": "OIL-DIB-02",
                "depth_m": 2510,
                "formation": "Barail Sandstone",
                "event_type": "MUD_LOSS",
                "severity": "CRITICAL",
                "description": "Total mud loss of 150 bbl observed. Circulation broke completely.",
                "mitigation": "Pumped high-viscosity LCM pill. Maintained ECD < 12.2 ppg."
            },
            {
                "incident_id": "INC-ASM-02",
                "well_id": "OIL-DIB-02",
                "depth_m": 2540,
                "formation": "Barail Sandstone",
                "event_type": "STUCK_PIPE",
                "severity": "HIGH",
                "description": "Differential pipe sticking while pulling out of hole (POOH).",
                "mitigation": "Soaked drill string with spotting fluid and worked torque safely."
            }
        ]
    },
    "rajasthan": {
        "name": "Rajasthan (Barmer Basin)",
        "center": [25.7500, 71.4000],
        "default_rig": "OIL-RAJ-01",
        "wells": [
            {
                "id": "OIL-RAJ-01",
                "name": "Barmer Active Rig 01",
                "latitude": 25.7500,
                "longitude": 71.4000,
                "status": "Active",
                "current_depth": 2490,
                "formation": "Fatehgarh Sandstone"
            },
            {
                "id": "OIL-RAJ-02",
                "name": "Mangala Offset Well 02",
                "latitude": 25.7820,
                "longitude": 71.4250,
                "status": "Completed",
                "total_depth": 3100,
                "formation": "Fatehgarh Sandstone"
            },
            {
                "id": "OIL-RAJ-03",
                "name": "Bhagyam Offset Well 03",
                "latitude": 25.7210,
                "longitude": 71.3780,
                "status": "Completed",
                "total_depth": 2900,
                "formation": "Barmer Hill Shale"
            }
        ],
        "formations": [
            {"name": "Dharvi Dungar Shale", "top_m": 1800, "bottom_m": 2200, "color": "#78350f"},
            {"name": "Barmer Hill Shale", "top_m": 2200, "bottom_m": 2450, "color": "#b45309"},
            {"name": "Fatehgarh Sandstone", "top_m": 2450, "bottom_m": 2900, "color": "#059669"}
        ],
        "incidents": [
            {
                "incident_id": "INC-RAJ-01",
                "well_id": "OIL-RAJ-02",
                "depth_m": 2510,
                "formation": "Fatehgarh Sandstone",
                "event_type": "MUD_LOSS",
                "severity": "CRITICAL",
                "description": "Total mud loss of 120 bbl in fractured sandstone zone. Circulation broke.",
                "mitigation": "Pumped high-viscosity LCM pill with coarse bridging agents."
            }
        ]
    },
    "up_ganga": {
        "name": "Uttar Pradesh (Ganga Basin)",
        "center": [27.8800, 78.6800],
        "default_rig": "OIL-UP-01",
        "wells": [
            {
                "id": "OIL-UP-01",
                "name": "Kasganj Deep Rig 01",
                "latitude": 27.8800,
                "longitude": 78.6800,
                "status": "Active",
                "current_depth": 2480,
                "formation": "Vindhyan Limestone"
            },
            {
                "id": "OIL-UP-02",
                "name": "Bareilly Offset 02",
                "latitude": 28.3600,
                "longitude": 79.4200,
                "status": "Completed",
                "total_depth": 3200,
                "formation": "Vindhyan Limestone"
            }
        ],
        "formations": [
            {"name": "Alluvium / Siwalik", "top_m": 0, "bottom_m": 1900, "color": "#64748b"},
            {"name": "Ujhani Clastics", "top_m": 1900, "bottom_m": 2450, "color": "#d97706"},
            {"name": "Vindhyan Limestone", "top_m": 2450, "bottom_m": 3100, "color": "#059669"}
        ],
        "incidents": [
            {
                "incident_id": "INC-UP-01",
                "well_id": "OIL-UP-02",
                "depth_m": 2505,
                "formation": "Vindhyan Limestone",
                "event_type": "HIGH_PRESSURE_KICK",
                "severity": "CRITICAL",
                "description": "Sudden 350 psi gas kick observed from fractured limestone zone.",
                "mitigation": "Shut in well. Weighted mud up from 10.5 ppg to 12.1 ppg using barite."
            }
        ]
    }
}

# Backward compatibility exports for risk_engine and rag_engine
WELLS_DATA = BASINS_CONFIG["assam"]["wells"]
FORMATION_DATA = BASINS_CONFIG["assam"]["formations"]
INCIDENTS_DATA = BASINS_CONFIG["assam"]["incidents"]