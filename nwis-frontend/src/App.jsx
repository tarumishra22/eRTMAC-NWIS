// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  AlertTriangle, 
  Layers, 
  ShieldAlert, 
  Play, 
  Pause, 
  Search, 
  FileText, 
  CheckCircle2, 
  UploadCloud, 
  X, 
  Compass, 
  FileCheck, 
  Maximize2, 
  Radio, 
  Activity
} from 'lucide-react';

// Custom Neon Tactical Pin for Map Markers
const createRigPin = (isActive, name) => {
  const bg = isActive ? '#10b981' : '#f59e0b';
  const glow = isActive ? '0 0 18px #10b981' : '0 0 12px #f59e0b';
  return L.divIcon({
    className: 'custom-radar-pin',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
        <div style="
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${bg};
          border: 2px solid #ffffff;
          box-shadow: ${glow};
        "></div>
        <div style="
          background: rgba(4, 6, 10, 0.95);
          border: 1px solid ${bg};
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 3px;
          margin-top: 3px;
          white-space: nowrap;
          letter-spacing: 0.5px;
        ">${name}</div>
      </div>
    `,
    iconSize: [60, 30],
    iconAnchor: [30, 7]
  });
};

// Smooth Pan & Zoom on Map when Basin is switched
function MapFlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, 11, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('cockpit');
  const [selectedBasin, setSelectedBasin] = useState('assam');
  const [basinsList, setBasinsList] = useState([]);
  const [wells, setWells] = useState([]);
  const [correlation, setCorrelation] = useState(null);
  const [currentDepth, setCurrentDepth] = useState(2480);
  const [riskData, setRiskData] = useState({ risk_percentage: 25, risk_level: "NORMAL", hazards: [] });
  const [isSimulating, setIsSimulating] = useState(false);
  const [radius, setRadius] = useState(10);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [activeModalDoc, setActiveModalDoc] = useState(null);
  const fileInputRef = useRef(null);

  // 1. Fetch Available Basins list on mount
  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/basins')
      .then(res => res.json())
      .then(data => setBasinsList(data))
      .catch(err => console.error("Error fetching basins:", err));
  }, []);

  // 2. Fetch Wells & Stratigraphy when basin or radius changes
  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/wells/nearby?basin=${selectedBasin}&radius_km=${radius}`)
      .then(res => res.json())
      .then(data => setWells(data))
      .catch(err => console.error("Error fetching wells:", err));

    fetch(`http://127.0.0.1:8000/api/wells/correlation?basin=${selectedBasin}`)
      .then(res => res.json())
      .then(data => setCorrelation(data))
      .catch(err => console.error("Error fetching correlation:", err));
  }, [selectedBasin, radius]);

  // 3. Dynamic Risk Evaluation as Depth Scrubber moves
  useEffect(() => {
    if (!wells || wells.length === 0) return;
    const activeW = wells.find(w => w.status === "Active") || wells[0];
    const lat = activeW ? activeW.latitude : 26.8500;
    const lon = activeW ? activeW.longitude : 94.3200;
    const formation = correlation?.formations?.[2]?.name || "Barail Sandstone";

    fetch(`http://127.0.0.1:8000/api/risk/evaluate?lat=${lat}&lon=${lon}&depth_m=${currentDepth}&formation=${encodeURIComponent(formation)}`)
      .then(res => res.json())
      .then(data => setRiskData(data))
      .catch(err => console.error("Error calculating risk:", err));
  }, [currentDepth]);

  // 4. Live Simulation loop
  useEffect(() => {
    let interval = null;
    if (isSimulating) {
      interval = setInterval(() => {
        setCurrentDepth(prev => (prev >= 2560 ? 2480 : prev + 2));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSimulating]);

  // ChromaDB Vector Search Handler
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    fetch(`http://127.0.0.1:8000/api/knowledge/search?query=${encodeURIComponent(searchQuery)}`)
      .then(res => res.json())
      .then(data => setSearchResults(data.results || []))
      .catch(err => console.error("Search query error:", err));
  };

  // PDF Document Ingestion Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    setUploadStatus({ type: 'loading', text: `Ingesting & indexing ${file.name} into ChromaDB...` });

    fetch("http://127.0.0.1:8000/api/documents/upload", {
      method: "POST",
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        setIsUploading(false);
        setUploadStatus({ type: 'success', text: `Indexed: "${data.filename}" (${data.characters_extracted} chars)` });
        setUploadedFiles(prev => [data, ...prev]);
        setTimeout(() => setUploadStatus(null), 5000);
      })
      .catch(err => {
        setIsUploading(false);
        setUploadStatus({ type: 'error', text: "Upload failed. Verify backend port 8000." });
      });
  };

  const activeWell = wells.find(w => w.status === "Active") || { latitude: 26.8500, longitude: 94.3200, name: "Active Rig" };
  const currentCenter = [activeWell.latitude, activeWell.longitude];
  const isHighRisk = riskData.risk_percentage >= 70;
  const pipeProgressPercent = Math.min(94, Math.max(8, ((currentDepth - 2450) / (2560 - 2450)) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#04060a', color: '#f1f5f9' }}>
      
      {/* INDUSTRIAL TOP NAVIGATION */}
      <header style={{ height: '56px', borderBottom: '1px solid #1a2233', background: 'linear-gradient(180deg, #0e1422 0%, #080b12 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
        
        {/* Rig Blueprint Logo & System Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'radial-gradient(circle, #f59e0b 0%, #b45309 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2L4 22h16L12 2z" />
              <path d="M7 15h10M9 9h6M12 2v20" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>OIL INDIA LIMITED</span>
              <span style={{ color: '#f59e0b', fontSize: '9px', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                eRTMAC-NWIS DIGITAL TWIN
              </span>
            </div>
            <div style={{ fontSize: '9px', color: '#64748b' }}>Autonomous Downhole Subsurface Correlation & Risk System</div>
          </div>
        </div>

        {/* Tab Controls */}
        <nav style={{ display: 'flex', gap: '6px', background: '#070a13', padding: '4px', borderRadius: '8px', border: '1px solid #1a2233' }}>
          <button 
            onClick={() => setActiveTab('cockpit')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'cockpit' ? '#f59e0b' : 'transparent',
              color: activeTab === 'cockpit' ? '#000' : '#94a3b8'
            }}
          >
            TACTICAL COCKPIT
          </button>
          
          <button 
            onClick={() => setActiveTab('map')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'map' ? '#f59e0b' : 'transparent',
              color: activeTab === 'map' ? '#000' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Maximize2 size={12} /> FULLSCREEN RADAR (MAP)
          </button>

          <button 
            onClick={() => setActiveTab('documents')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'documents' ? '#f59e0b' : 'transparent',
              color: activeTab === 'documents' ? '#000' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileText size={12} /> REPORT INGESTION LAB
          </button>
        </nav>

        {/* Basin Switcher & Telemetry Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}>
          
          {/* Glowing Basin Switcher */}
          <div style={{ 
            background: '#131b2e', 
            padding: '5px 12px', 
            borderRadius: '6px', 
            border: '1.5px solid #f59e0b',
            boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)',
            display: 'flex', 
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ color: '#f59e0b', fontSize: '10px', fontWeight: 900 }}>BASIN:</span>
            <select 
              value={selectedBasin} 
              onChange={(e) => setSelectedBasin(e.target.value)}
              style={{ background: '#090d18', color: '#fff', fontWeight: 800, border: '1px solid #334155', padding: '3px 8px', borderRadius: '4px', outline: 'none', cursor: 'pointer', fontSize: '11px' }}
            >
              {basinsList.map(b => (
                <option key={b.id} value={b.id} style={{ background: '#090d18', color: '#fff' }}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ background: '#090d18', padding: '5px 12px', borderRadius: '6px', border: '1px solid #1a2233' }}>
            <span style={{ color: '#64748b' }}>RIG:</span> <strong style={{ color: '#f59e0b' }}>{activeWell.id || "OIL-RIG"}</strong>
          </div>
          <div style={{ background: '#090d18', padding: '5px 12px', borderRadius: '6px', border: '1px solid #1a2233' }}>
            <span style={{ color: '#64748b' }}>TVD DEPTH:</span> <strong style={{ color: '#10b981', fontSize: '13px' }}>{currentDepth}m</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontWeight: 800 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
            DRILL TURNING
          </div>
        </div>
      </header>

      {/* ========================================================= */}
      {/* VIEW 1: MAIN COCKPIT                                      */}
      {/* ========================================================= */}
      {activeTab === 'cockpit' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateRows: 'auto 1fr auto', padding: '8px 10px', gap: '8px', overflow: 'hidden' }}>
          
          {/* Subsea Telemetry Bar */}
          <div style={{ background: '#080d1a', border: '1px solid #1a2233', borderRadius: '6px', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8' }}>
              <Radio size={14} color="#f59e0b" />
              <span>Scanning offset wells within <strong>{radius} km</strong> radius across <strong>{selectedBasin.toUpperCase()}</strong> basin.</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#10b981', fontWeight: 700 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Activity size={13} color="#10b981" /> MUD PULSE: 18.2 Hz (NORMAL)
              </span>
              <span>•</span>
              <span style={{ color: '#f59e0b' }}>ECD: 11.8 ppg</span>
            </div>
          </div>

          {/* 3-Pane Cockpit Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: '3.4fr 5.4fr 3.2fr', gap: '8px', overflow: 'hidden' }}>
            
            {/* PANE 1: SPATIAL MAP WITH RADIUS SLIDER */}
            <div style={{ background: '#090d18', borderRadius: '8px', border: '1px solid #1a2233', display: 'flex', flexDirection: 'column', padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={13} /> PANE 1: GEOSPATIAL OFFSET DISCOVERY
                </span>
                
                {/* Embedded Radius Controller */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: '#94a3b8' }}>
                  <span>Radius: <strong style={{ color: '#f59e0b' }}>{radius} km</strong></span>
                  <input 
                    type="range" 
                    min="5" 
                    max="60" 
                    value={radius} 
                    onChange={(e) => setRadius(Number(e.target.value))}
                    style={{ width: '70px', accentColor: '#f59e0b', cursor: 'pointer' }}
                  />
                  <button 
                    onClick={() => setActiveTab('map')} 
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}
                  >
                    <Maximize2 size={11} /> Expand
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, borderRadius: '6px', overflow: 'hidden', border: '1px solid #1a2233' }}>
                <MapContainer center={currentCenter} zoom={11} style={{ height: '100%', width: '100%', background: '#04060a' }}>
                  <MapFlyTo center={currentCenter} />
                  <TileLayer 
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  <Circle 
                    center={currentCenter} 
                    radius={radius * 1000} 
                    pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.12 }} 
                  />
                  {wells.map((well) => (
                    <Marker 
                      key={well.id} 
                      position={[well.latitude, well.longitude]}
                      icon={createRigPin(well.status === "Active", well.id)}
                    >
                      <Popup>
                        <div style={{ color: '#0f172a', fontSize: '12px' }}>
                          <strong>{well.name}</strong><br />
                          Status: {well.status}<br />
                          Distance: {well.distance_km ?? 0} km
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px' }}>
                <div style={{ background: '#0e1422', padding: '6px 8px', borderRadius: '6px', border: '1px solid #1a2233' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>WELLS IN RADIUS</div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#f59e0b' }}>{Math.max(0, wells.length - 1)} Offset Wells</div>
                </div>
                <div style={{ background: '#0e1422', padding: '6px 8px', borderRadius: '6px', border: '1px solid #1a2233' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 700 }}>HISTORICAL HAZARDS</div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: '#ef4444' }}>{correlation?.offset_incidents?.length || 0} Events</div>
                </div>
              </div>
            </div>

            {/* PANE 2: GRAPHICAL WELLBORE & STRATA VISUALIZER */}
            <div style={{ background: '#090d18', borderRadius: '8px', border: '1px solid #1a2233', display: 'flex', flexDirection: 'column', padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Compass size={14} /> PANE 2: SUBTERRANEAN DRILLING TWIN & LOG
                </span>
                <button 
                  onClick={() => setIsSimulating(!isSimulating)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11px',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 800,
                    background: isSimulating ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: isSimulating ? '#f87171' : '#34d399',
                    border: isSimulating ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(16, 185, 129, 0.5)'
                  }}
                >
                  {isSimulating ? <Pause size={12} /> : <Play size={12} />}
                  {isSimulating ? 'PAUSE DRILLING' : 'SIMULATE DRILLING FEED'}
                </button>
              </div>

              {/* Underground Cross-Section Box */}
              <div style={{ flex: 1, background: '#05070d', borderRadius: '6px', border: '1px solid #1a2233', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.6fr', padding: '10px', gap: '10px', position: 'relative' }}>
                
                {/* Geological Realistic Strata Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 800 }}>GEOLOGICAL STRATA</span>
                  {correlation?.formations.map((f, i) => (
                    <div 
                      key={i} 
                      style={{
                        background: `${f.color}18`,
                        borderLeft: `4px solid ${f.color}`,
                        borderTop: '1px solid #1a2233',
                        borderRight: '1px solid #1a2233',
                        borderBottom: '1px solid #1a2233',
                        padding: '8px',
                        borderRadius: '4px'
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#f8fafc' }}>{f.name}</div>
                      <div style={{ fontSize: '9px', color: '#94a3b8' }}>{f.top_m}m — {f.bottom_m}m</div>
                    </div>
                  ))}
                </div>

                {/* Drill-Shaft & Physical Bit */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '1px dashed #1e2638', borderRight: '1px dashed #1e2638', position: 'relative', overflow: 'hidden' }}>
                  <div className="scanner-line"></div>
                  <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 800, marginBottom: '6px' }}>BOREHOLE SHAFT</span>
                  
                  <div style={{ flex: 1, width: '40px', background: '#080c16', border: '1px solid #1a2233', position: 'relative', borderRadius: '2px' }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '13px',
                      width: '14px',
                      height: `${pipeProgressPercent}%`,
                      background: 'linear-gradient(90deg, #94a3b8 0%, #f1f5f9 50%, #475569 100%)',
                      borderBottom: '3px solid #10b981',
                      transition: 'height 0.4s ease'
                    }}>
                      <div style={{
                        position: 'absolute',
                        bottom: '-14px',
                        left: '-4px',
                        width: '22px',
                        height: '14px',
                        background: isHighRisk ? '#ef4444' : '#10b981',
                        clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
                        boxShadow: isHighRisk ? '0 0 15px #ef4444' : '0 0 12px #10b981'
                      }}></div>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', fontWeight: 900, color: '#10b981', marginTop: '6px' }}>
                    {currentDepth}m TVD
                  </div>
                </div>

                {/* Depth Scrubber & Offset Incidents */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>
                    <span>MANUAL SCRUBBER</span>
                  </div>

                  <input 
                    type="range" 
                    min="2450" 
                    max="2560" 
                    value={currentDepth}
                    onChange={(e) => setCurrentDepth(Number(e.target.value))}
                    style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer', marginBottom: '10px' }}
                  />

                  {/* Offset Incidents in Formation */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', flex: 1 }}>
                    <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 800 }}>OFFSET INCIDENT HORIZONS</span>
                    {correlation?.offset_incidents.map((inc, i) => {
                      const isClose = Math.abs(inc.depth_m - currentDepth) <= 30;
                      return (
                        <div 
                          key={i} 
                          className={isClose ? 'threat-pulse' : ''}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '5px',
                            fontSize: '10px',
                            border: isClose ? '1px solid #ef4444' : '1px solid #1a2233',
                            background: isClose ? 'rgba(239, 68, 68, 0.15)' : '#0e1422',
                            color: isClose ? '#fca5a5' : '#94a3b8',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                            <span style={{ color: isClose ? '#f87171' : '#e2e8f0' }}>{inc.event_type} @ {inc.depth_m}m</span>
                            <span style={{ background: '#1a2233', padding: '1px 5px', borderRadius: '3px', fontSize: '8px' }}>{inc.well_id}</span>
                          </div>
                          <div style={{ fontSize: '9px', marginTop: '2px', opacity: 0.85 }}>{inc.description}</div>
                          
                          <button 
                            onClick={() => setActiveModalDoc(inc)}
                            style={{
                              marginTop: '4px',
                              background: 'transparent',
                              border: 'none',
                              color: '#f59e0b',
                              fontSize: '9px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              padding: 0
                            }}
                          >
                            <FileCheck size={11} /> View Source WCR Snippet
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* PANE 3: PROACTIVE ADVISOR */}
            <div style={{ background: '#090d18', borderRadius: '8px', border: isHighRisk ? '1px solid rgba(239, 68, 68, 0.6)' : '1px solid #1a2233', display: 'flex', flexDirection: 'column', padding: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldAlert size={14} /> PANE 3: PROACTIVE ADVISOR
                </span>
              </div>

              {/* Arc Hazard Gauge */}
              <div style={{ background: '#05070d', border: '1px solid #1a2233', borderRadius: '6px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                <svg width="120" height="75" viewBox="0 0 140 100">
                  <path d="M 20 80 A 50 50 0 0 1 120 80" fill="none" stroke="#1a2233" strokeWidth="12" strokeLinecap="round" />
                  <path 
                    d="M 20 80 A 50 50 0 0 1 120 80" 
                    fill="none" 
                    stroke={isHighRisk ? '#ef4444' : '#10b981'} 
                    strokeWidth="12" 
                    strokeDasharray="157" 
                    strokeDashoffset={157 - (riskData.risk_percentage / 100) * 157}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', top: '35px', textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: isHighRisk ? '#ef4444' : '#10b981' }}>
                    {riskData.risk_percentage}%
                  </div>
                  <div style={{ fontSize: '8px', fontWeight: 700, color: '#64748b' }}>HAZARD RISK</div>
                </div>
                <div style={{ fontSize: '10px', fontWeight: 800, marginTop: '2px', color: isHighRisk ? '#f87171' : '#34d399' }}>
                  STATUS: {riskData.risk_level}
                </div>
              </div>

              {/* Dynamic Warning Card */}
              <div style={{ flex: 1, marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
                {riskData.hazards.length > 0 ? (
                  riskData.hazards.map((h, i) => (
                    <div key={i} style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.5)', borderRadius: '6px', padding: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#f87171', fontSize: '10px', fontWeight: 800 }}>
                        <AlertTriangle size={12} />
                        <span>{h.incident_type} IN {h.proximity_m}m!</span>
                      </div>
                      <div style={{ fontSize: '9px', color: '#cbd5e1', marginTop: '3px' }}>
                        Offset well <strong>{h.offset_well}</strong> encountered severe issues at {h.depth_m}m.
                      </div>
                      <div style={{ marginTop: '6px', background: '#05070d', padding: '5px 7px', borderRadius: '4px', border: '1px solid #1a2233', fontSize: '9px', color: '#34d399' }}>
                        <strong>Action:</strong> {h.mitigation}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ margin: 'auto', textAlign: 'center', color: '#64748b', fontSize: '10px', padding: '10px' }}>
                    <CheckCircle2 size={22} color="#10b981" style={{ margin: '0 auto 4px auto' }} />
                    Clear trajectory. No offset hazards within 40m.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom RAG Dock */}
          <footer style={{ height: '130px', border: '1px solid #1a2233', borderRadius: '8px', background: '#090d18', padding: '8px 12px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={13} /> CHROMADB SEMANTIC SEARCH (HISTORICAL LESSONS LEARNED)
              </span>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '6px' }}>
                <input 
                  type="text" 
                  placeholder="Ask reports (e.g. Barail mud loss, stuck pipe POOH)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '320px',
                    background: '#0e1422',
                    border: '1px solid #1a2233',
                    color: '#fff',
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    outline: 'none'
                  }}
                />
                <button 
                  type="submit" 
                  style={{
                    background: '#f59e0b',
                    border: 'none',
                    color: '#000',
                    fontSize: '11px',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Search size={11} /> QUERY
                </button>
              </form>
            </div>

            <div style={{ flex: 1, background: '#05070d', borderRadius: '4px', border: '1px solid #1a2233', padding: '6px', overflowY: 'auto' }}>
              {searchResults.length > 0 ? (
                searchResults.map((res, i) => (
                  <div key={i} style={{ background: '#0e1422', padding: '6px 10px', borderRadius: '4px', marginBottom: '4px', border: '1px solid #1a2233', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                    <div>
                      <span style={{ color: '#f59e0b', fontWeight: 800 }}>[{res.metadata.well_id} | {res.metadata.formation}]</span> {res.summary}
                    </div>
                    <span style={{ background: '#1a2233', color: '#94a3b8', fontSize: '9px', padding: '2px 8px', borderRadius: '4px' }}>
                      Depth: {res.metadata.depth_m}m
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ color: '#475569', fontSize: '11px', textAlign: 'center', padding: '14px 0' }}>
                  Type a drilling hazard query above to search past Daily Drilling Reports via vector similarity.
                </div>
              )}
            </div>
          </footer>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: FULLSCREEN RADAR                                  */}
      {/* ========================================================= */}
      {activeTab === 'map' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          <div style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 1000, background: 'rgba(9, 13, 24, 0.95)', border: '1px solid #1a2233', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', width: '260px', backdropFilter: 'blur(8px)' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#f59e0b', display: 'flex', justifyContent: 'space-between' }}>
              <span>RADAR CONTROLS</span>
              <span>{radius} km</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="60" 
              value={radius} 
              onChange={(e) => setRadius(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#f59e0b' }}
            />
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>
              Offset wells scanned around active rig in <strong>{selectedBasin.toUpperCase()}</strong>.
            </div>
          </div>

          <MapContainer center={currentCenter} zoom={11} style={{ height: '100%', width: '100%', background: '#04060a' }}>
            <MapFlyTo center={currentCenter} />
            <TileLayer 
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <Circle 
              center={currentCenter} 
              radius={radius * 1000} 
              pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.12 }} 
            />
            {wells.map((well) => (
              <Marker 
                key={well.id} 
                position={[well.latitude, well.longitude]}
                icon={createRigPin(well.status === "Active", well.id)}
              >
                <Popup>
                  <div style={{ color: '#0f172a', fontSize: '12px' }}>
                    <strong>{well.name}</strong><br />
                    Status: {well.status}<br />
                    Distance: {well.distance_km ?? 0} km
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 3: REPORT INGESTION LAB                             */}
      {/* ========================================================= */}
      {activeTab === 'documents' && (
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '4.5fr 7.5fr', padding: '16px', gap: '16px', overflow: 'hidden' }}>
          
          <div style={{ background: '#090d18', borderRadius: '8px', border: '1px solid #1a2233', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#f59e0b', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UploadCloud size={18} /> INGEST NEW DRILLING REPORTS (PDF / DDR / WCR)
            </h2>
            <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 20px 0' }}>
              Upload unstructured Daily Drilling Reports or Well Completion Reports to automatically parse and index into ChromaDB.
            </p>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".pdf" 
              style={{ display: 'none' }} 
            />

            <div 
              onClick={() => fileInputRef.current.click()}
              style={{
                flex: 1,
                border: '2px dashed #f59e0b',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: '20px',
                textAlign: 'center'
              }}
            >
              <UploadCloud size={42} color="#f59e0b" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>Click to Browse or Drag & Drop PDF</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Accepts WCR, DDRs, and Mud Logging Sheets</div>
            </div>

            {uploadStatus && (
              <div style={{ 
                marginTop: '16px', 
                padding: '10px', 
                borderRadius: '6px', 
                fontSize: '11px',
                background: uploadStatus.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                color: uploadStatus.type === 'error' ? '#f87171' : '#34d399',
                border: `1px solid ${uploadStatus.type === 'error' ? '#ef4444' : '#10b981'}`
              }}>
                {uploadStatus.text}
              </div>
            )}
          </div>

          <div style={{ background: '#090d18', borderRadius: '8px', border: '1px solid #1a2233', padding: '20px', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#fff', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCheck size={18} color="#10b981" /> INDEXED HISTORICAL DRILLING REPOSITORY
            </h2>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {uploadedFiles.length > 0 ? (
                uploadedFiles.map((doc, idx) => (
                  <div key={idx} style={{ background: '#0e1422', padding: '12px', borderRadius: '6px', border: '1px solid #1a2233' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ color: '#f59e0b', fontSize: '12px' }}>{doc.filename}</strong>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>Doc ID: {doc.doc_id}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
                      {doc.preview}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ margin: 'auto', textAlign: 'center', color: '#475569', fontSize: '12px' }}>
                  Historical reports are currently loaded into ChromaDB. Upload any PDF report to add new knowledge on-the-fly.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SOURCE DOCUMENT INSPECTION MODAL */}
      {activeModalDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#090d18', border: '1px solid #f59e0b', borderRadius: '8px', width: '520px', padding: '20px', position: 'relative' }}>
            <button 
              onClick={() => setActiveModalDoc(null)}
              style={{ position: 'absolute', top: '14px', right: '14px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#f59e0b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileCheck size={16} /> ORIGINAL SOURCE: WELL COMPLETION REPORT (WCR)
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '14px' }}>
              Extracted from archive records of offset well <strong>{activeModalDoc.well_id}</strong>.
            </div>
            <div style={{ background: '#05070d', border: '1px solid #1a2233', borderRadius: '4px', padding: '12px', fontSize: '11px', color: '#e2e8f0', lineHeight: '1.6' }}>
              <div style={{ color: '#f87171', fontWeight: 800, marginBottom: '4px' }}>
                Incident Horizon: {activeModalDoc.depth_m}m ({activeModalDoc.formation})
              </div>
              <p style={{ margin: 0, fontStyle: 'italic' }}>
                "{activeModalDoc.description}"
              </p>
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #1a2233', color: '#34d399' }}>
                <strong>Authorized Field Mitigation:</strong> {activeModalDoc.mitigation}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}