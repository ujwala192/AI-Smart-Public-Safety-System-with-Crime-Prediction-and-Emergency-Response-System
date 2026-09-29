import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import CrimeMap from '../components/CrimeMap'

const API = 'http://127.0.0.1:5000/api'

const COORDS_MAP = {
  'Hitech City':   { lat: 17.4435, lon: 78.3772 },
  'Gachibowli':    { lat: 17.4401, lon: 78.3489 },
  'Banjara Hills': { lat: 17.4156, lon: 78.4347 },
  'Jubilee Hills': { lat: 17.4320, lon: 78.4071 },
  'Secunderabad':  { lat: 17.4399, lon: 78.4983 },
  'Charminar':     { lat: 17.3616, lon: 78.4747 },
  'LB Nagar':      { lat: 17.3469, lon: 78.5469 },
  'Dilsukhnagar':  { lat: 17.3688, lon: 78.5247 },
  'Ameerpet':      { lat: 17.4375, lon: 78.4483 },
  'Kukatpally':    { lat: 17.4849, lon: 78.4138 },
  'Madhapur':      { lat: 17.4485, lon: 78.3908 },
  'Begumpet':      { lat: 17.4418, lon: 78.4636 },
  'Uppal':         { lat: 17.4054, lon: 78.5590 },
  'Miyapur':       { lat: 17.4956, lon: 78.3694 },
  'ECIL':          { lat: 17.4691, lon: 78.5624 },
}

export default function PublicDashboard({ user, onLogout }) {
  const [hotspots,    setHotspots]    = useState([])
  const [stations,    setStations]    = useState([])
  const [areas,       setAreas]       = useState([])
  const [alerts,      setAlerts]      = useState([])
  const [source,      setSource]      = useState('')
  const [dest,        setDest]        = useState('')
  const [routeInfo,   setRouteInfo]   = useState(null)
  const [routeLine,   setRouteLine]   = useState(null)
  const [areaInfo,    setAreaInfo]    = useState(null)
  const [selArea,     setSelArea]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [tab,         setTab]         = useState('map')
  const [sosStatus,   setSosStatus]   = useState(null)
  const [sosSent,     setSosSent]     = useState(false)
  const [incident,    setIncident]    = useState({
    crime_type: 'Theft', description: '', area: '', severity: 'Medium'
  })
  const [incidentMsg, setIncidentMsg] = useState('')
  const sosTimer  = useRef(null)
  const sourceRef = useRef('')

  useEffect(() => {
    axios.get(`${API}/hotspots`).then(r => setHotspots(r.data.hotspots))
    axios.get(`${API}/nearby-police?lat=17.4435&lon=78.3772`)
      .then(r => setStations(r.data.stations))
    axios.get(`${API}/areas`).then(r => setAreas(r.data.areas))
    axios.get(`${API}/alerts`).then(r => setAlerts(r.data.alerts))
    const interval = setInterval(() => {
      axios.get(`${API}/alerts`).then(r => setAlerts(r.data.alerts))
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fix map not rendering when switching to route tab
useEffect(() => {
  if (tab === 'route') {
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 200)
  }
}, [tab])
const checkRoute = async () => {
  if (!source || !dest) return alert('Please select source and destination!')
  setLoading(true)
  setRouteLine(null)

  try {
    const res = await axios.post(`${API}/safe-route`, {
      source, destination: dest
    })
    setRouteInfo(res.data)

    const srcCoord = COORDS_MAP[source]
    const dstCoord = COORDS_MAP[dest]

    if (srcCoord && dstCoord) {
      setRouteLine([
        [srcCoord.lat, srcCoord.lon],
        [dstCoord.lat, dstCoord.lon]
      ])
    }

    setTab('route')
  } catch {
    alert('Failed to get route. Make sure Flask is running!')
  }
  setLoading(false)
}
   
  const checkArea = async () => {
    if (!selArea) return alert('Please select an area!')
    const hour = new Date().getHours()
    const res  = await axios.get(
      `${API}/area-risk?area=${selArea}&hour=${hour}`
    )
    setAreaInfo(res.data)
  }

  const sendSOS = async () => {
    if (sosSent) return
    setSosSent(true)

    const userArea = selArea || sourceRef.current
    if (!userArea) {
      setSosSent(false)
      setSosStatus({
        message:         '⚠️ Please select your area from the navbar first!',
        helpline:        '100',
        nearest_station: '',
        station_phone:   '',
        station_area:    ''
      })
      return
    }

    const coords = COORDS_MAP[userArea] || { lat: 17.4435, lon: 78.3772 }
    setSosStatus({ message: `📡 Sending SOS from ${userArea}...` })

    try {
      const res = await axios.post(`${API}/sos`, {
        user_name:  user.name,
        latitude:   coords.lat,
        longitude:  coords.lon,
        address:    `${userArea}, Hyderabad`,
        area:       userArea
      })
      setSosStatus(res.data)
    } catch {
      setSosStatus({
        message:         '❌ Failed to send SOS. Call 100 directly!',
        helpline:        '100',
        nearest_station: 'Call Police directly',
        station_phone:   '100',
        station_area:    ''
      })
    }

    sosTimer.current = setTimeout(() => {
      setSosSent(false)
      setSosStatus(null)
    }, 20000)
  }

  const submitIncident = async () => {
    if (!incident.area || !incident.description)
      return alert('Please fill area and description!')
    const coords = COORDS_MAP[incident.area] ||
                   { lat: 17.4435, lon: 78.3772 }
    try {
      const res = await axios.post(`${API}/report-incident`, {
        ...incident,
        user_name:  user.name,
        latitude:   coords.lat,
        longitude:  coords.lon
      })
      setIncidentMsg(
        `${res.data.message} Assigned to: ${res.data.assigned_to} (${res.data.station_phone})`
      )
      setIncident({
        crime_type: 'Theft', description: '', area: '', severity: 'Medium'
      })
    } catch {
      setIncidentMsg('❌ Failed to submit. Make sure Flask is running!')
    }
    setTimeout(() => setIncidentMsg(''), 6000)
  }

  const riskColor = (r) =>
    r === 'High'   ? '#ef4444' :
    r === 'Medium' ? '#f59e0b' : '#22c55e'

  const sevColor = (s) =>
    s === 'High'   ? '#ef4444' :
    s === 'Medium' ? '#f59e0b' : '#22c55e'

  return (
    <div style={{ minHeight:'100vh', background:'#0f1117' }}>

      {/* Navbar */}
      <div className="navbar">
        <h2>🛡️ Crime Safety System</h2>
        <div style={{ display:'flex', alignItems:'center', gap:'15px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span style={{ color:'#888', fontSize:'13px' }}>📍 Your Area:</span>
            <select value={selArea}
              onChange={e => setSelArea(e.target.value)}
              style={{ background:'#0f1117', border:'1px solid #4f46e5',
                color:'white', padding:'5px 10px', borderRadius:'6px',
                fontSize:'13px', width:'140px' }}>
              <option value="">-- Select --</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <span style={{ color:'#888' }}>👤 {user.name}</span>
          <button className="btn btn-danger" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* Live Alerts Banner */}
      {alerts.length > 0 && (
        <div style={{ background:'#1a0a0a',
          borderBottom:'1px solid #ef444440',
          padding:'10px 30px' }}>
          <div style={{ display:'flex', gap:'20px', overflowX:'auto' }}>
            {alerts.slice(0,4).map((a,i) => (
              <div key={i} style={{ display:'flex', alignItems:'center',
                gap:'8px', whiteSpace:'nowrap',
                color: sevColor(a.severity), fontSize:'13px' }}>
                🔔 {a.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOS Button */}
      <div style={{ position:'fixed', bottom:'30px', right:'30px', zIndex:1000 }}>
        {sosStatus && (
          <div style={{ background:'#1a1d2e', border:'1px solid #ef4444',
            borderRadius:'12px', padding:'15px', marginBottom:'10px',
            maxWidth:'270px', fontSize:'13px' }}>
            <p style={{ color:'#ef4444', fontWeight:'bold' }}>
              🚨 SOS Alert
            </p>
            <p style={{ color:'#ccc', marginTop:'5px' }}>
              {sosStatus.message}
            </p>
            {sosStatus.nearest_station && (
              <>
                <p style={{ color:'#22c55e', marginTop:'5px',
                  fontWeight:'bold' }}>
                  👮 {sosStatus.nearest_station}
                </p>
                <p style={{ color:'#888' }}>📍 {sosStatus.station_area}</p>
                <p style={{ color:'#4f46e5', marginTop:'3px' }}>
                  📞 <a href={`tel:${sosStatus.station_phone}`}
                    style={{ color:'#4f46e5' }}>
                    {sosStatus.station_phone}
                  </a>
                </p>
              </>
            )}
            <p style={{ color:'#888', marginTop:'5px' }}>
              📞 Emergency:{' '}
              <a href="tel:100" style={{ color:'#ef4444' }}>100</a>
            </p>
          </div>
        )}
        <button onClick={sendSOS} disabled={sosSent}
          style={{ width:'70px', height:'70px', borderRadius:'50%',
            background: sosSent ? '#666' : '#ef4444',
            border:'3px solid white', color:'white',
            fontSize:'12px', fontWeight:'bold',
            cursor: sosSent ? 'not-allowed' : 'pointer',
            boxShadow:'0 0 20px #ef444480' }}>
          {sosSent ? '✓ SENT' : '🆘 SOS'}
        </button>
      </div>

      <div className="container">

        {/* Stats */}
        <div className="grid-3" style={{ margin:'20px 0' }}>
          <div className="stat-card">
            <h1>{hotspots.length}</h1>
            <p>Crime Hotspots</p>
          </div>
          <div className="stat-card">
            <h1 style={{ color:'#ef4444' }}>
              {hotspots.filter(h => h.risk_level==='High').length}
            </h1>
            <p>High Risk Zones</p>
          </div>
          <div className="stat-card">
            <h1 style={{ color:'#f59e0b' }}>{alerts.length}</h1>
            <p>Active Alerts</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'10px',
          marginBottom:'20px', flexWrap:'wrap' }}>
          {['map','route','area','police','alerts','report'].map(t => (
            <button key={t} className="btn"
              onClick={() => setTab(t)}
              style={{ background: tab===t ? '#4f46e5':'#1a1d2e',
                color:'white' }}>
              {t==='map'    ? '🗺️ Map'
              :t==='route'  ? '🛣️ Safe Route'
              :t==='area'   ? '📍 Area Risk'
              :t==='police' ? '👮 Police'
              :t==='alerts' ? `🔔 Alerts (${alerts.length})`
              :               '📝 Report'}
            </button>
          ))}
        </div>

        {/* MAP TAB */}
        {tab === 'map' && (
          <div className="card">
            <h3 style={{ marginBottom:'10px' }}>
              🗺️ Crime Hotspot Map — Hyderabad
            </h3>
            <p style={{ color:'#888', fontSize:'13px', marginBottom:'10px' }}>
              Live crime hotspot visualization based on ML clustering
            </p>
            <div style={{ display:'flex', gap:'20px',
              marginBottom:'12px', flexWrap:'wrap' }}>
              <span style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{ width:'12px', height:'12px',
                  borderRadius:'50%', background:'#ef4444',
                  display:'inline-block' }}/>
                High Risk
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{ width:'12px', height:'12px',
                  borderRadius:'50%', background:'#f59e0b',
                  display:'inline-block' }}/>
                Medium Risk
              </span>
              <span style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <span style={{ width:'12px', height:'12px',
                  borderRadius:'50%', background:'#22c55e',
                  display:'inline-block' }}/>
                Low Risk
              </span>
              <span>👮 Police Station</span>
            </div>
            <CrimeMap
              hotspots={hotspots}
              stations={stations}
              height="500px"
            />
            <div style={{ display:'flex', gap:'15px',
              marginTop:'15px', flexWrap:'wrap' }}>
              <div style={{ padding:'10px 15px', background:'#ef444415',
                borderRadius:'8px', flex:1, textAlign:'center' }}>
                <h3 style={{ color:'#ef4444' }}>
                  {hotspots.filter(h=>h.risk_level==='High').length}
                </h3>
                <p style={{ color:'#888', fontSize:'12px' }}>High Risk</p>
              </div>
              <div style={{ padding:'10px 15px', background:'#f59e0b15',
                borderRadius:'8px', flex:1, textAlign:'center' }}>
                <h3 style={{ color:'#f59e0b' }}>
                  {hotspots.filter(h=>h.risk_level==='Medium').length}
                </h3>
                <p style={{ color:'#888', fontSize:'12px' }}>Medium Risk</p>
              </div>
              <div style={{ padding:'10px 15px', background:'#22c55e15',
                borderRadius:'8px', flex:1, textAlign:'center' }}>
                <h3 style={{ color:'#22c55e' }}>
                  {hotspots.filter(h=>h.risk_level==='Low').length}
                </h3>
                <p style={{ color:'#888', fontSize:'12px' }}>Low Risk</p>
              </div>
              <div style={{ padding:'10px 15px', background:'#4f46e515',
                borderRadius:'8px', flex:1, textAlign:'center' }}>
                <h3 style={{ color:'#4f46e5' }}>{stations.length}</h3>
                <p style={{ color:'#888', fontSize:'12px' }}>Police Stations</p>
              </div>
            </div>
          </div>
        )}

        {/* ROUTE TAB */}
        {tab === 'route' && (
          <div className="card">
            <h3 style={{ marginBottom:'5px' }}>🛣️ Safe Route Finder</h3>
            <p style={{ color:'#888', fontSize:'13px', marginBottom:'15px' }}>
              Powered by real crime data from dataset
            </p>
            <div className="grid-2">
              <div>
                <label style={{ color:'#888', fontSize:'13px' }}>
                  Source Area
                </label>
                <select value={source}
                  onChange={e => {
                    setSource(e.target.value)
                    sourceRef.current = e.target.value
                    setSelArea(e.target.value)
                  }}>
                  <option value="">-- Select Source --</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color:'#888', fontSize:'13px' }}>
                  Destination Area
                </label>
                <select value={dest}
                  onChange={e => setDest(e.target.value)}>
                  <option value="">-- Select Destination --</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary" onClick={checkRoute}
              style={{ marginTop:'15px', width:'100%', padding:'12px' }}
              disabled={loading}>
              {loading ? '🔍 Analyzing crime data...' : '🔍 Find Safe Route'}
            </button>

            {routeInfo && !routeInfo.success && (
              <div style={{ marginTop:'15px', padding:'15px',
                background:'#ef444415', borderRadius:'8px',
                color:'#ef4444' }}>
                ❌ {routeInfo.message}
              </div>
            )}

            {routeInfo && routeInfo.success && (
              <div style={{ marginTop:'20px' }}>

                {/* Risk Banner */}
                <div style={{ padding:'20px', borderRadius:'12px',
                  marginBottom:'15px',
                  background: riskColor(routeInfo.risk_level)+'15',
                  border:`1px solid ${riskColor(routeInfo.risk_level)}40` }}>
                  <div style={{ display:'flex',
                    justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <h3 style={{ color: riskColor(routeInfo.risk_level) }}>
                        {routeInfo.risk_level==='High'
                          ? '🔴 HIGH RISK ROUTE'
                          : routeInfo.risk_level==='Medium'
                          ? '🟡 MODERATE RISK'
                          : '🟢 SAFE ROUTE'}
                      </h3>
                      <p style={{ color:'#ccc', marginTop:'8px' }}>
                        {routeInfo.advice}
                      </p>
                    </div>
                    <div style={{ textAlign:'center', minWidth:'80px' }}>
                      <div style={{ fontSize:'2.5rem', fontWeight:'bold',
                        color: riskColor(routeInfo.risk_level) }}>
                        {routeInfo.risk_score}
                      </div>
                      <div style={{ color:'#888', fontSize:'11px' }}>
                        / 100 Risk Score
                      </div>
                    </div>
                  </div>
                  {routeInfo.night_warning && (
                    <div style={{ marginTop:'10px', padding:'8px 12px',
                      background:'#f59e0b20', borderRadius:'6px',
                      color:'#f59e0b', fontSize:'13px' }}>
                      {routeInfo.night_warning}
                    </div>
                  )}
                </div>

                {/* ML Predictions */}
                <div className="grid-2" style={{ marginBottom:'15px' }}>
                  <div style={{ padding:'15px', background:'#1a1d2e',
                    borderRadius:'10px' }}>
                    <p style={{ color:'#888', fontSize:'12px' }}>
                      ML Risk — {routeInfo.source}
                    </p>
                    <h4 style={{ color: riskColor(routeInfo.source_ml_risk),
                      marginTop:'5px' }}>
                      {routeInfo.source_ml_risk} Risk
                    </h4>
                  </div>
                  <div style={{ padding:'15px', background:'#1a1d2e',
                    borderRadius:'10px' }}>
                    <p style={{ color:'#888', fontSize:'12px' }}>
                      ML Risk — {routeInfo.destination}
                    </p>
                    <h4 style={{ color: riskColor(routeInfo.dest_ml_risk),
                      marginTop:'5px' }}>
                      {routeInfo.dest_ml_risk} Risk
                    </h4>
                  </div>
                </div>

                {/* Crime Breakdown */}
                <div className="grid-2" style={{ marginBottom:'15px' }}>
                  <div style={{ padding:'15px', background:'#1a1d2e',
                    borderRadius:'10px' }}>
                    <p style={{ color:'#888', fontSize:'12px',
                      marginBottom:'8px' }}>
                      🔢 Crimes near {routeInfo.source} ({routeInfo.source_crime_count})
                    </p>
                    {Object.entries(routeInfo.source_breakdown||{}).map(([c,n])=>(
                      <div key={c} style={{ display:'flex',
                        justifyContent:'space-between', marginBottom:'4px' }}>
                        <span style={{ color:'#ccc', fontSize:'13px' }}>
                          🦹 {c}
                        </span>
                        <span style={{ color:'#ef4444', fontWeight:'bold',
                          fontSize:'13px' }}>{n}</span>
                      </div>
                    ))}
                    {routeInfo.source_peak_hours?.length > 0 && (
                      <p style={{ color:'#f59e0b', fontSize:'12px',
                        marginTop:'8px' }}>
                        ⏰ Peak: {routeInfo.source_peak_hours.join(', ')}
                      </p>
                    )}
                  </div>
                  <div style={{ padding:'15px', background:'#1a1d2e',
                    borderRadius:'10px' }}>
                    <p style={{ color:'#888', fontSize:'12px',
                      marginBottom:'8px' }}>
                      🔢 Crimes near {routeInfo.destination} ({routeInfo.dest_crime_count})
                    </p>
                    {Object.entries(routeInfo.dest_breakdown||{}).map(([c,n])=>(
                      <div key={c} style={{ display:'flex',
                        justifyContent:'space-between', marginBottom:'4px' }}>
                        <span style={{ color:'#ccc', fontSize:'13px' }}>
                          🦹 {c}
                        </span>
                        <span style={{ color:'#ef4444', fontWeight:'bold',
                          fontSize:'13px' }}>{n}</span>
                      </div>
                    ))}
                    {routeInfo.dest_peak_hours?.length > 0 && (
                      <p style={{ color:'#f59e0b', fontSize:'12px',
                        marginTop:'8px' }}>
                        ⏰ Peak: {routeInfo.dest_peak_hours.join(', ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Safety Tips */}
                <div style={{ padding:'15px', background:'#1a1d2e',
                  borderRadius:'10px', marginBottom:'15px' }}>
                  <p style={{ color:'#888', marginBottom:'10px',
                    fontSize:'13px' }}>
                    💡 Safety Tips (based on real crimes):
                  </p>
                  {routeInfo.safety_tips?.map((tip,i) => (
                    <p key={i} style={{ color:'#ccc', fontSize:'13px',
                      marginBottom:'6px' }}>{tip}</p>
                  ))}
                </div>

                {/* Nearest Police */}
                {routeInfo.nearest_police && (
                  <div style={{ padding:'15px', background:'#4f46e515',
                    borderRadius:'10px', marginBottom:'15px',
                    border:'1px solid #4f46e540' }}>
                    <p style={{ color:'#4f46e5', fontWeight:'bold',
                      marginBottom:'8px' }}>
                      👮 Nearest Police to {routeInfo.destination}
                    </p>
                    <p style={{ color:'#ccc' }}>
                      {routeInfo.nearest_police.name}
                    </p>
                    <p style={{ color:'#4f46e5', marginTop:'5px' }}>
                      📞 <a href={`tel:${routeInfo.nearest_police.phone}`}
                        style={{ color:'#4f46e5' }}>
                        {routeInfo.nearest_police.phone}
                      </a>
                    </p>
                  </div>
                )}

                {/* Route Map */}
                {(() => {
  const srcCoord = COORDS_MAP[routeInfo.source]
  const dstCoord = COORDS_MAP[routeInfo.destination]
  const midLat   = srcCoord && dstCoord
    ? (srcCoord.lat + dstCoord.lat) / 2 : 17.4065
  const midLon   = srcCoord && dstCoord
    ? (srcCoord.lon + dstCoord.lon) / 2 : 78.4772
  const line     = srcCoord && dstCoord
    ? [[srcCoord.lat, srcCoord.lon], [dstCoord.lat, dstCoord.lon]]
    : null

  return (
    <div style={{ marginBottom:'15px', marginTop:'15px' }}>
      <p style={{ color:'#888', fontSize:'13px', marginBottom:'10px' }}>
        🗺️ Route Map — {routeInfo.source} → {routeInfo.destination}:
      </p>
      <div style={{ height:'380px', minHeight:'380px', borderRadius:'12px',
        overflow:'hidden', border:'1px solid #2a2d3e' }}>
        {srcCoord && dstCoord ? (
          <CrimeMap
            key={`${routeInfo.source}-${routeInfo.destination}`}
            hotspots={(routeInfo.hotspots_nearby || []).filter(h => h.distance_km <= 2)}
            stations={[]}
            routeLine={routeLine || line}
            height="380px"
            center={[midLat, midLon]}
            zoom={12}
          />
        ) : (
          <div style={{ height:'100%', background:'#1a1d2e',
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#888' }}>
            ⚠️ Could not load map for this route
          </div>
        )}
      </div>
      <div style={{ display:'flex', gap:'15px', marginTop:'10px', flexWrap:'wrap' }}>
        <span style={{ color:'#4f46e5', fontSize:'13px' }}>━━ Route Path</span>
        <span style={{ color:'#ef4444', fontSize:'13px' }}>🔴 High Risk</span>
        <span style={{ color:'#f59e0b', fontSize:'13px' }}>🟡 Medium Risk</span>
      </div>
    </div>
  )
})()}
               
                {/* Hotspots */}
                {routeInfo.hotspots_nearby?.length > 0 && (
                  <div>
                    <p style={{ color:'#888', marginBottom:'10px',
                      fontSize:'13px' }}>
                      ⚠️ Crime Hotspots Near This Route:
                    </p>
                    {routeInfo.hotspots_nearby.map((h,i) => (
                      <div key={i} style={{ padding:'12px',
                        background:'#1a1d2e', borderRadius:'8px',
                        marginBottom:'8px',
                        borderLeft:`3px solid ${riskColor(h.risk_level)}` }}>
                        <div style={{ display:'flex',
                          justifyContent:'space-between' }}>
                          <div>
                            <b>📍 {h.area}</b>
                            <p style={{ color:'#888', fontSize:'12px',
                              marginTop:'3px' }}>
                              🦹 {h.top_crime} | 📏 {h.distance_km} km away
                            </p>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <span className={`badge badge-${h.risk_level.toLowerCase()}`}>
                              {h.risk_level}
                            </span>
                            <p style={{ color:'#888', fontSize:'11px',
                              marginTop:'3px' }}>
                              {h.crime_count} crimes
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {routeInfo.hotspots_nearby?.length === 0 && (
                  <div style={{ padding:'15px', background:'#22c55e15',
                    borderRadius:'10px', textAlign:'center',
                    border:'1px solid #22c55e40' }}>
                    <p style={{ color:'#22c55e' }}>
                      ✅ No crime hotspots near this route!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* AREA RISK TAB */}
        {/* AREA RISK TAB */}
{tab === 'area' && (
  <div className="card">
    <h3 style={{ marginBottom:'15px' }}>📍 Area Risk Checker</h3>
    <select value={selArea}
      onChange={e => setSelArea(e.target.value)}>
      <option value="">-- Select Area --</option>
      {areas.map(a => <option key={a} value={a}>{a}</option>)}
    </select>
    <button className="btn btn-primary" onClick={checkArea}
      style={{ marginTop:'10px' }}>
      🔍 Check Risk Now
    </button>

    {areaInfo && (
      <div style={{ marginTop:'20px' }}>

        {/* Risk Result */}
        <div style={{ padding:'20px', background:'#0f1117',
          borderRadius:'12px', marginBottom:'15px',
          borderLeft:`4px solid ${riskColor(areaInfo.risk_level)}` }}>
          <h3>{areaInfo.area}</h3>
          <p style={{ margin:'10px 0', fontSize:'1.3rem' }}>
            Risk:{' '}
            <span style={{ color: riskColor(areaInfo.risk_level),
              fontWeight:'bold', fontSize:'1.5rem' }}>
              {areaInfo.risk_level}
            </span>
          </p>
          <div className="grid-2" style={{ marginTop:'10px' }}>
            <p>🦹 Most Common: <b>{areaInfo.top_crime}</b></p>
            <p>🔢 Total Crimes: <b>{areaInfo.crime_count}</b></p>
            <p>🕐 Checked at: <b>{areaInfo.hour}:00 hrs</b></p>
            <p>📍 Area: <b>{areaInfo.area}</b></p>
          </div>
          {areaInfo.risk_level === 'High' && (
            <div style={{ marginTop:'15px', padding:'10px',
              background:'#ef444420', borderRadius:'8px',
              color:'#ef4444' }}>
              ⚠️ High-risk area. Avoid traveling here at night.
            </div>
          )}
          {areaInfo.risk_level === 'Medium' && (
            <div style={{ marginTop:'15px', padding:'10px',
              background:'#f59e0b20', borderRadius:'8px',
              color:'#f59e0b' }}>
              🟡 Moderate risk. Stay on main roads and stay alert.
            </div>
          )}
          {areaInfo.risk_level === 'Low' && (
            <div style={{ marginTop:'15px', padding:'10px',
              background:'#22c55e20', borderRadius:'8px',
              color:'#22c55e' }}>
              ✅ Relatively safe area. Normal precautions apply.
            </div>
          )}
        </div>

        {/* Map showing the area location + nearby hotspots */}
        <div>
          <p style={{ color:'#888', fontSize:'13px', marginBottom:'10px' }}>
            🗺️ {areaInfo.area} on map — showing nearby crime hotspots:
          </p>
          <CrimeMap
  hotspots={hotspots.filter(h => {
    const coord = COORDS_MAP[areaInfo.area]
    if (!coord) return false
    const dist = ((h.latitude - coord.lat)**2 +
                 (h.longitude - coord.lon)**2)**0.5 * 111
    return dist <= 8
  }).length > 0
    ? hotspots.filter(h => {
        const coord = COORDS_MAP[areaInfo.area]
        if (!coord) return false
        const dist = ((h.latitude - coord.lat)**2 +
                     (h.longitude - coord.lon)**2)**0.5 * 111
        return dist <= 8
      })
    : hotspots.slice(0, 5)
  }
            stations={stations.filter(s => {
              const coord = COORDS_MAP[areaInfo.area]
              if (!coord) return false
              const dist = ((s.latitude - coord.lat)**2 +
                           (s.longitude - coord.lon)**2)**0.5 * 111
              return dist <= 10
            })}
            height="350px"
            center={COORDS_MAP[areaInfo.area]
              ? [COORDS_MAP[areaInfo.area].lat, COORDS_MAP[areaInfo.area].lon]
              : [17.4065, 78.4772]}
            zoom={14}
          />
        </div>
      </div>
    )}
  </div>
)}
        {/* POLICE TAB */}
        {tab === 'police' && (
          <div className="card">
            <h3 style={{ marginBottom:'15px' }}>👮 Nearest Police Stations</h3>
            <CrimeMap hotspots={[]} stations={stations} height="280px" />
            <div style={{ marginTop:'15px' }}>
              {stations.map((s,i) => (
                <div key={i} style={{ padding:'15px', background:'#0f1117',
                  borderRadius:'10px', marginBottom:'10px',
                  display:'flex', justifyContent:'space-between',
                  alignItems:'center' }}>
                  <div>
                    <b>👮 {s.name}</b>
                    <p style={{ color:'#888', fontSize:'13px' }}>
                      📍 {s.area}
                    </p>
                    <p style={{ color:'#4f46e5', fontSize:'13px',
                      marginTop:'4px' }}>
                      📞 <a href={`tel:${s.phone}`}
                        style={{ color:'#4f46e5' }}>{s.phone}</a>
                    </p>
                  </div>
                  <span className="badge badge-low">{s.distance} km</span>
                </div>
              ))}
              <div style={{ padding:'15px', background:'#ef444415',
                borderRadius:'10px', textAlign:'center', marginTop:'10px' }}>
                <p style={{ color:'#ef4444', fontWeight:'bold',
                  fontSize:'1.1rem' }}>
                  🚨 Emergency? Call{' '}
                  <a href="tel:100" style={{ color:'#ef4444' }}>100</a>
                </p>
                <p style={{ color:'#888', fontSize:'13px', marginTop:'5px' }}>
                  Women:{' '}
                  <a href="tel:1091" style={{ color:'#f59e0b' }}>1091</a>
                  {' '}| Ambulance:{' '}
                  <a href="tel:108" style={{ color:'#22c55e' }}>108</a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ALERTS TAB */}
        {tab === 'alerts' && (
          <div className="card">
            <h3 style={{ marginBottom:'15px' }}>🔔 Live Safety Alerts</h3>
            <p style={{ color:'#888', fontSize:'13px', marginBottom:'15px' }}>
              Auto-refreshes every 30 seconds
            </p>
            {alerts.length === 0 && (
              <p style={{ color:'#888' }}>No alerts at this time</p>
            )}
            {alerts.map((a,i) => (
              <div key={i} style={{ padding:'15px', background:'#0f1117',
                borderRadius:'10px', marginBottom:'10px',
                borderLeft:`3px solid ${sevColor(a.severity)}` }}>
                <div style={{ display:'flex',
                  justifyContent:'space-between',
                  alignItems:'flex-start' }}>
                  <div>
                    <p style={{ color:'#fff', marginBottom:'5px' }}>
                      {a.message}
                    </p>
                    <p style={{ color:'#888', fontSize:'12px' }}>
                      📍 {a.area}
                    </p>
                  </div>
                  <span className={`badge badge-${a.severity?.toLowerCase()}`}>
                    {a.severity}
                  </span>
                </div>
                <p style={{ color:'#555', fontSize:'11px', marginTop:'8px' }}>
                  🕐 {new Date(a.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* REPORT TAB */}
        {tab === 'report' && (
          <div className="card">
            <h3 style={{ marginBottom:'5px' }}>📝 Report an Incident</h3>
            <p style={{ color:'#888', fontSize:'13px', marginBottom:'15px' }}>
              Your report goes directly to the nearest police station
            </p>

            <label style={{ color:'#888', fontSize:'13px' }}>
              Crime Type
            </label>
            <select value={incident.crime_type}
              onChange={e => setIncident({
                ...incident, crime_type: e.target.value })}>
              {['Theft','Robbery','Assault','Burglary','Chain Snatching',
                'Vehicle Theft','Harassment','Fraud','Vandalism',
                'Pickpocket','Other'].map(c =>
                <option key={c} value={c}>{c}</option>
              )}
            </select>

            <label style={{ color:'#888', fontSize:'13px',
              marginTop:'10px', display:'block' }}>
              Your Current Area
            </label>
            <select value={incident.area}
              onChange={e => setIncident({
                ...incident, area: e.target.value })}>
              <option value="">-- Select Your Area --</option>
              {areas.map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <label style={{ color:'#888', fontSize:'13px',
              marginTop:'10px', display:'block' }}>
              Severity
            </label>
            <select value={incident.severity}
              onChange={e => setIncident({
                ...incident, severity: e.target.value })}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>

            <label style={{ color:'#888', fontSize:'13px',
              marginTop:'10px', display:'block' }}>
              Description
            </label>
            <textarea value={incident.description}
              onChange={e => setIncident({
                ...incident, description: e.target.value })}
              placeholder="Describe what happened..."
              style={{ background:'#0f1117', border:'1px solid #2a2d3e',
                color:'white', padding:'10px', borderRadius:'8px',
                width:'100%', marginTop:'6px', minHeight:'100px',
                fontSize:'14px' }} />

            {incidentMsg && (
              <p style={{ color:'#22c55e', margin:'10px 0',
                fontSize:'13px' }}>
                {incidentMsg}
              </p>
            )}

            <button className="btn btn-primary" onClick={submitIncident}
              style={{ marginTop:'15px', width:'100%', padding:'12px' }}>
              📤 Submit Report
            </button>
          </div>
        )}

      </div>
    </div>
  )
}