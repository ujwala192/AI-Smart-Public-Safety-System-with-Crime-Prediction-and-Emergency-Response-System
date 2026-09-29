import { useState, useEffect } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
         PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import CrimeMap from '../components/CrimeMap'

const API    = 'http://127.0.0.1:5000/api'
const COLORS = ['#4f46e5','#ef4444','#f59e0b','#22c55e',
                '#8b5cf6','#06b6d4','#ec4899','#14b8a6']

export default function PoliceDashboard({ user, onLogout }) {
  const [hotspots,   setHotspots]   = useState([])
  const [stats,      setStats]      = useState(null)
  const [stations,   setStations]   = useState([])
  const [patrol,     setPatrol]     = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [incidents,  setIncidents]  = useState([])
  const [sosAlerts,  setSosAlerts]  = useState([])
  const [tab,        setTab]        = useState('overview')

  const stationId   = user.station_id   || 0
  const stationName = user.station_name || 'All Stations'
  const isAdmin     = !stationId || stationId === 0

  useEffect(() => {
    const sid = stationId
    axios.get(`${API}/hotspots`).then(r => setHotspots(r.data.hotspots))
    axios.get(`${API}/crime-stats`).then(r => setStats(r.data))
    axios.get(`${API}/nearby-police?lat=17.4435&lon=78.3772`)
      .then(r => setStations(r.data.stations))
    axios.get(`${API}/patrol-recommendations`)
      .then(r => setPatrol(r.data))
    axios.get(`${API}/risk-prediction-tonight`)
      .then(r => setPrediction(r.data))
    axios.get(`${API}/incidents?station_id=${sid}`)
      .then(r => setIncidents(r.data.incidents))
    axios.get(`${API}/sos-alerts?station_id=${sid}`)
      .then(r => setSosAlerts(r.data.alerts))

    const interval = setInterval(() => {
      axios.get(`${API}/sos-alerts?station_id=${sid}`)
        .then(r => setSosAlerts(r.data.alerts))
      axios.get(`${API}/incidents?station_id=${sid}`)
        .then(r => setIncidents(r.data.incidents))
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  const resolveSOS = async (id) => {
    await axios.post(`${API}/sos-resolve/${id}`)
    setSosAlerts(prev =>
      prev.map(a => a.id === id ? {...a, status:'resolved'} : a))
  }

  // Filter hotspots for this station's area
  const myHotspots = isAdmin ? hotspots : hotspots.filter(h =>
    h.area === user.station_name?.replace(' PS','').trim() ||
    hotspots.slice(0, 5).includes(h)
  )

  // Filter patrol recommendations for this station
  const myPatrol = patrol ? {
    ...patrol,
    recommendations: isAdmin
      ? patrol.recommendations
      : patrol.recommendations.filter((r,i) =>
          r.area === user.station_name?.replace(' PS','').trim() || i < 3
        )
  } : null

  // Filter tonight's predictions for this station
  const myPredictions = prediction ? {
    ...prediction,
    predictions: isAdmin
      ? prediction.predictions
      : prediction.predictions.filter(p =>
          p.area === user.station_name?.replace(' PS','').trim() ||
          prediction.predictions.indexOf(p) < 3
        )
  } : null

  const crimeTypeData = stats
    ? Object.entries(stats.crime_types)
        .map(([name,value]) => ({name, value}))
        .sort((a,b) => b.value - a.value)
    : []

  const topAreasData = stats
    ? Object.entries(stats.top_areas)
        .map(([name,value]) => ({name: name.split(' ')[0], value}))
    : []

  const hourlyData = stats
    ? Object.entries(stats.hourly)
        .map(([hour,count]) => ({hour:`${hour}h`, count}))
        .sort((a,b) => parseInt(a.hour) - parseInt(b.hour))
    : []

  const activeSOS   = sosAlerts.filter(a => a.status === 'active')
  const highRisk    = hotspots.filter(h => h.risk_level === 'High')
  const totalCrimes = hotspots.reduce((s,h) => s + h.crime_count, 0)

  const riskColor = (r) =>
    r==='High'||r==='high'   ? '#ef4444' :
    r==='Medium'||r==='medium'? '#f59e0b' : '#22c55e'

  return (
    <div style={{ minHeight:'100vh', background:'#0f1117' }}>

      {/* Navbar */}
      <div className="navbar">
        <div>
          <h2>👮 Police Dashboard</h2>
          {/* Station badge */}
          <div style={{ marginTop:'4px' }}>
            <span style={{ background: isAdmin ? '#4f46e520' : '#22c55e20',
              color: isAdmin ? '#4f46e5' : '#22c55e',
              padding:'3px 10px', borderRadius:'20px', fontSize:'12px' }}>
              {isAdmin ? '🔑 Admin — All Stations' : `🏠 ${stationName}`}
            </span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'15px' }}>
          {activeSOS.length > 0 && (
            <span style={{ background:'#ef4444', color:'white',
              padding:'5px 12px', borderRadius:'20px',
              fontSize:'13px', fontWeight:'bold' }}>
              🚨 {activeSOS.length} Active SOS
            </span>
          )}
          <div style={{ textAlign:'right' }}>
            <span style={{ color:'#888' }}>👮 {user.name}</span>
            {user.station_name && (
              <p style={{ color:'#22c55e', fontSize:'11px', marginTop:'2px' }}>
                {user.station_name}
              </p>
            )}
          </div>
          <button className="btn btn-danger" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="container">

        {/* Station Info Banner */}
        {!isAdmin && (
          <div style={{ background:'#1a1d2e', borderRadius:'12px',
            padding:'15px 20px', margin:'20px 0',
            border:'1px solid #22c55e40',
            display:'flex', alignItems:'center',
            justifyContent:'space-between' }}>
            <div>
              <h4 style={{ color:'#22c55e' }}>🏠 {stationName}</h4>
              <p style={{ color:'#888', fontSize:'13px', marginTop:'3px' }}>
                Showing data for your station's coverage area only
              </p>
            </div>
            <div style={{ display:'flex', gap:'20px' }}>
              <div style={{ textAlign:'center' }}>
                <h3 style={{ color:'#ef4444' }}>{activeSOS.length}</h3>
                <p style={{ color:'#888', fontSize:'12px' }}>Active SOS</p>
              </div>
              <div style={{ textAlign:'center' }}>
                <h3 style={{ color:'#f59e0b' }}>
                  {incidents.filter(i => i.status==='pending').length}
                </h3>
                <p style={{ color:'#888', fontSize:'12px' }}>Pending</p>
              </div>
              <div style={{ textAlign:'center' }}>
                <h3>{incidents.length}</h3>
                <p style={{ color:'#888', fontSize:'12px' }}>Total Reports</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Row — Admin sees all, police sees their area */}
        <div style={{ display:'grid',
          gridTemplateColumns:'repeat(4,1fr)',
          gap:'15px', margin:'20px 0' }}>
          <div className="stat-card">
            <h1 style={{ color:'#ef4444' }}>{highRisk.length}</h1>
            <p>High Risk Zones</p>
          </div>
          <div className="stat-card">
            <h1>{totalCrimes}</h1>
            <p>Total Crimes</p>
          </div>
          <div className="stat-card">
            <h1 style={{ color:'#ef4444' }}>{activeSOS.length}</h1>
            <p>{isAdmin ? 'All Active SOS' : 'Your SOS Alerts'}</p>
          </div>
          <div className="stat-card">
            <h1 style={{ color:'#f59e0b' }}>
              {incidents.filter(i => i.status==='pending').length}
            </h1>
            <p>{isAdmin ? 'All Pending' : 'Your Pending'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:'10px',
          marginBottom:'20px', flexWrap:'wrap' }}>
          {['overview','map','patrol','prediction','sos','incidents'].map(t => (
            <button key={t} className="btn" onClick={() => setTab(t)}
              style={{ background: tab===t ? '#4f46e5':'#1a1d2e',
                color:'white',
                border: t==='sos' && activeSOS.length > 0
                  ? '1px solid #ef4444' : 'none' }}>
              {t==='overview'   ? '📊 Overview'
              :t==='map'        ? '🗺️ Hotspot Map'
              :t==='patrol'     ? '🚔 Patrol AI'
              :t==='prediction' ? "🔮 Tonight's Risk"
              :t==='sos'        ? `🚨 SOS (${activeSOS.length})`
              :                   `📝 Incidents (${incidents.length})`}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && stats && (
          <div>
            {/* Area info for non-admin */}
            {!isAdmin && (
              <div className="card" style={{ marginBottom:'15px',
                borderLeft:'4px solid #4f46e5' }}>
                <h4>📊 Overview for {stationName} Coverage Area</h4>
                <p style={{ color:'#888', fontSize:'13px', marginTop:'5px' }}>
                  Charts below show city-wide data for reference.
                  Your station's specific data is in SOS and Incidents tabs.
                </p>
              </div>
            )}
            <div className="grid-2">
              <div className="card">
                <h3 style={{ marginBottom:'15px' }}>
                  🦹 Crime Type Distribution
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={crimeTypeData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" outerRadius={90}
                      label={({name}) => name}>
                      {crimeTypeData.map((_,i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <h3 style={{ marginBottom:'15px' }}>📍 Top Crime Areas</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={topAreasData}>
                    <XAxis dataKey="name"
                      tick={{ fill:'#888', fontSize:11 }} />
                    <YAxis tick={{ fill:'#888' }} />
                    <Tooltip contentStyle={{
                      background:'#1a1d2e', border:'none' }} />
                    <Bar dataKey="value" fill="#4f46e5"
                      radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card" style={{ gridColumn:'1/-1' }}>
                <h3 style={{ marginBottom:'15px' }}>
                  📈 Hourly Crime Pattern
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={hourlyData}>
                    <XAxis dataKey="hour"
                      tick={{ fill:'#888', fontSize:11 }} />
                    <YAxis tick={{ fill:'#888' }} />
                    <Tooltip contentStyle={{
                      background:'#1a1d2e', border:'none' }} />
                    <Line type="monotone" dataKey="count"
                      stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* MAP */}
        {tab === 'map' && (
          <div className="card">
            <h3 style={{ marginBottom:'10px' }}>🗺️ Crime Hotspot Map</h3>
            {!isAdmin && (
              <p style={{ color:'#888', fontSize:'13px', marginBottom:'10px' }}>
                Showing all city hotspots — your station: {stationName}
              </p>
            )}
            <div style={{ display:'flex', gap:'15px',
              marginBottom:'10px', flexWrap:'wrap' }}>
              <span>🔴 High ({highRisk.length})</span>
              <span>🟡 Medium (
                {hotspots.filter(h=>h.risk_level==='Medium').length})
              </span>
              <span>🟢 Low (
                {hotspots.filter(h=>h.risk_level==='Low').length})
              </span>
            </div>
            <CrimeMap hotspots={hotspots} stations={stations} height="500px" />
          </div>
        )}

        {/* PATROL AI */}
        {tab === 'patrol' && myPatrol && (
          <div>
            <div className="card" style={{ marginBottom:'15px' }}>
              <div style={{ display:'flex',
                justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <h3>🚔 AI Patrol Recommendations</h3>
                  <p style={{ color:'#888', fontSize:'13px', marginTop:'5px' }}>
                    {isAdmin
                      ? 'City-wide patrol suggestions based on ML'
                      : `Patrol suggestions for ${stationName} coverage area`}
                  </p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <span style={{ background:'#4f46e520', color:'#4f46e5',
                    padding:'5px 15px', borderRadius:'20px', fontSize:'13px' }}>
                    {myPatrol.shift}
                  </span>
                  <p style={{ color:'#888', fontSize:'12px', marginTop:'5px' }}>
                    Hour: {myPatrol.current_hour}:00
                  </p>
                </div>
              </div>
            </div>

            {myPatrol.recommendations.map((r,i) => (
              <div key={i} className="card" style={{ marginBottom:'10px',
                borderLeft:`4px solid ${riskColor(r.risk_level)}` }}>
                <div style={{ display:'flex',
                  justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center',
                      gap:'10px', marginBottom:'8px' }}>
                      <h4>#{i+1} {r.area}</h4>
                      <span style={{ fontSize:'13px' }}>{r.priority}</span>
                    </div>
                    <div style={{ display:'grid',
                      gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                      <p style={{ color:'#ccc', fontSize:'13px' }}>
                        🚔 <b>Action:</b> {r.action}
                      </p>
                      <p style={{ color:'#ccc', fontSize:'13px' }}>
                        ⏱️ <b>Frequency:</b> {r.frequency}
                      </p>
                      <p style={{ color:'#ccc', fontSize:'13px' }}>
                        🦹 <b>Top Crimes:</b> {r.top_crimes?.join(', ')}
                      </p>
                      <p style={{ color:'#ccc', fontSize:'13px' }}>
                        📊 <b>Unresolved:</b> {r.unresolved} cases
                      </p>
                    </div>
                    {r.time_warning && (
                      <p style={{ color:'#f59e0b', fontSize:'13px',
                        marginTop:'8px', background:'#f59e0b15',
                        padding:'6px 10px', borderRadius:'6px' }}>
                        {r.time_warning}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign:'right', marginLeft:'15px' }}>
                    <span className={`badge badge-${r.risk_level.toLowerCase()}`}>
                      {r.risk_level}
                    </span>
                    <p style={{ color:'#888', fontSize:'12px', marginTop:'5px' }}>
                      {r.crime_count} crimes
                    </p>
                    <p style={{ color:'#555', fontSize:'11px', marginTop:'3px' }}>
                      🌙 {r.night_crimes} at night
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TONIGHT'S PREDICTION */}
        {tab === 'prediction' && myPredictions && (
          <div>
            <div className="card" style={{ marginBottom:'15px' }}>
              <h3>🔮 Tonight's Risk Prediction</h3>
              <p style={{ color:'#888', fontSize:'13px', marginTop:'5px' }}>
                Generated at {myPredictions.generated_at} —
                {isAdmin
                  ? ' City-wide night risk forecast'
                  : ` Forecast for ${stationName} area`}
              </p>
            </div>
            <div className="grid-2">
              {myPredictions.predictions.map((p,i) => (
                <div key={i} className="card"
                  style={{ borderLeft:`4px solid ${riskColor(p.predicted_risk)}` }}>
                  <div style={{ display:'flex',
                    justifyContent:'space-between', alignItems:'center' }}>
                    <h4>{p.area}</h4>
                    <span className={`badge badge-${p.predicted_risk.toLowerCase()}`}>
                      {p.predicted_risk}
                    </span>
                  </div>
                  <div style={{ marginTop:'10px' }}>
                    <p style={{ color:'#888', fontSize:'13px' }}>
                      🌙 Night Crimes:{' '}
                      <b style={{ color:'#fff' }}>{p.night_crime_history}</b>
                    </p>
                    <p style={{ color:'#888', fontSize:'13px', marginTop:'4px' }}>
                      📊 Total:{' '}
                      <b style={{ color:'#fff' }}>{p.total_crimes}</b>
                    </p>
                  </div>
                  {p.alert && (
                    <div style={{ marginTop:'10px', padding:'6px 10px',
                      background:'#ef444415', borderRadius:'6px',
                      color:'#ef4444', fontSize:'12px' }}>
                      🚨 Deploy patrol tonight
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOS ALERTS */}
        {tab === 'sos' && (
          <div>
            <div className="card" style={{ marginBottom:'15px' }}>
              <h3>🚨 SOS Alerts —{' '}
                {isAdmin ? 'All Stations' : stationName}
              </h3>
              <p style={{ color:'#888', fontSize:'13px', marginTop:'5px' }}>
                {isAdmin
                  ? 'Showing SOS alerts from all stations'
                  : `Showing only SOS alerts assigned to ${stationName}`}
                {' '}— Auto-refreshes every 15 seconds
              </p>
            </div>

            {sosAlerts.length === 0 ? (
              <div className="card" style={{ textAlign:'center',
                padding:'40px' }}>
                <p style={{ fontSize:'2rem' }}>✅</p>
                <p style={{ color:'#888', marginTop:'10px' }}>
                  No SOS alerts for your station
                </p>
              </div>
            ) : sosAlerts.map((a,i) => (
              <div key={i} className="card" style={{ marginBottom:'15px',
                borderLeft:`4px solid ${a.status==='active'
                  ? '#ef4444' : '#22c55e'}` }}>

                <div style={{ display:'flex',
                  justifyContent:'space-between',
                  alignItems:'center', marginBottom:'15px' }}>
                  <div>
                    <span style={{
                      background: a.status==='active'
                        ? '#ef444420' : '#22c55e20',
                      color: a.status==='active' ? '#ef4444' : '#22c55e',
                      padding:'4px 12px', borderRadius:'20px',
                      fontSize:'12px', fontWeight:'bold' }}>
                      {a.status==='active'
                        ? '🚨 ACTIVE EMERGENCY' : '✅ RESOLVED'}
                    </span>
                    <h4 style={{ marginTop:'8px' }}>👤 {a.user_name}</h4>
                  </div>
                  {a.status === 'active' && (
                    <button className="btn btn-success"
                      onClick={() => resolveSOS(a.id)}>
                      ✅ Mark Resolved
                    </button>
                  )}
                </div>

                <div style={{ background:'#0f1117', borderRadius:'10px',
                  padding:'15px', marginBottom:'15px' }}>
                  <p style={{ color:'#888', fontSize:'12px',
                    marginBottom:'10px' }}>
                    📍 USER LOCATION
                  </p>
                  <div className="grid-2">
                    <div>
                      <p style={{ color:'#ccc', fontSize:'13px' }}>
                        🏘️ Area:{' '}
                        <b style={{ color:'#fff' }}>{a.area || 'Unknown'}</b>
                      </p>
                      <p style={{ color:'#ccc', fontSize:'13px',
                        marginTop:'5px' }}>
                        📌 Address:{' '}
                        <b style={{ color:'#fff' }}>{a.address}</b>
                      </p>
                      <p style={{ color:'#ccc', fontSize:'13px',
                        marginTop:'5px' }}>
                        🗺️ Coordinates:{' '}
                        <b style={{ color:'#4f46e5' }}>
                          {a.latitude?.toFixed(4)}, {a.longitude?.toFixed(4)}
                        </b>
                      </p>
                      <p style={{ color:'#ccc', fontSize:'13px',
                        marginTop:'5px' }}>
                        👮 Assigned:{' '}
                        <b style={{ color:'#22c55e' }}>
                          {a.assigned_station}
                        </b>
                      </p>
                      <p style={{ color:'#555', fontSize:'11px',
                        marginTop:'5px' }}>
                        🕐 {new Date(a.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <a href={`https://www.google.com/maps?q=${a.latitude},${a.longitude}`}
                        target="_blank" rel="noreferrer"
                        style={{ display:'inline-block', marginBottom:'10px',
                          background:'#4f46e5', color:'white',
                          padding:'6px 12px', borderRadius:'6px',
                          fontSize:'12px', textDecoration:'none' }}>
                        🗺️ Open in Google Maps
                      </a>
                      <div style={{ borderRadius:'8px', overflow:'hidden' }}>
                        <iframe
                          title={`sos-${i}`}
                          width="100%" height="180" frameBorder="0"
                          src={`https://maps.google.com/maps?q=${a.latitude},${a.longitude}&z=15&output=embed`}
                          style={{ border:'none' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* INCIDENTS */}
        {tab === 'incidents' && (
          <div>
            <div className="card" style={{ marginBottom:'15px' }}>
              <h3>📝 Incidents —{' '}
                {isAdmin ? 'All Stations' : stationName}
              </h3>
              <p style={{ color:'#888', fontSize:'13px', marginTop:'5px' }}>
                {isAdmin
                  ? 'Showing all reported incidents'
                  : `Only incidents assigned to ${stationName}`}
              </p>
            </div>

            {incidents.length === 0 ? (
              <div className="card" style={{ textAlign:'center',
                padding:'40px' }}>
                <p style={{ fontSize:'2rem' }}>📋</p>
                <p style={{ color:'#888', marginTop:'10px' }}>
                  No incidents for your station yet
                </p>
              </div>
            ) : incidents.map((inc,i) => (
              <div key={i} className="card" style={{ marginBottom:'15px',
                borderLeft:`3px solid ${riskColor(inc.severity)}` }}>

                <div style={{ display:'flex',
                  justifyContent:'space-between',
                  alignItems:'flex-start', marginBottom:'10px' }}>
                  <div>
                    <div style={{ display:'flex',
                      alignItems:'center', gap:'10px' }}>
                      <h4>{inc.crime_type}</h4>
                      <span className={`badge badge-${inc.severity?.toLowerCase()}`}>
                        {inc.severity}
                      </span>
                      <span style={{
                        color: inc.status==='pending' ? '#f59e0b' : '#22c55e',
                        fontSize:'12px', fontWeight:'bold' }}>
                        {inc.status?.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ color:'#888', fontSize:'13px',
                      marginTop:'5px' }}>
                      👤 Reported by:{' '}
                      <b style={{ color:'#fff' }}>{inc.user_name}</b>
                    </p>
                  </div>
                  <p style={{ color:'#555', fontSize:'11px' }}>
                    🕐 {new Date(inc.timestamp).toLocaleString()}
                  </p>
                </div>

                <div style={{ background:'#0f1117', borderRadius:'8px',
                  padding:'12px', marginBottom:'12px' }}>
                  <p style={{ color:'#ccc', fontSize:'13px' }}>
                    {inc.description}
                  </p>
                </div>

                <div style={{ background:'#0f1117', borderRadius:'10px',
                  padding:'15px' }}>
                  <p style={{ color:'#888', fontSize:'12px',
                    marginBottom:'10px' }}>
                    📍 INCIDENT LOCATION
                  </p>
                  <div className="grid-2">
                    <div>
                      <p style={{ color:'#ccc', fontSize:'13px' }}>
                        🏘️ Area:{' '}
                        <b style={{ color:'#fff' }}>{inc.area}</b>
                      </p>
                      <p style={{ color:'#ccc', fontSize:'13px',
                        marginTop:'5px' }}>
                        🗺️ Coordinates:{' '}
                        <b style={{ color:'#4f46e5' }}>
                          {inc.latitude?.toFixed(4)},{' '}
                          {inc.longitude?.toFixed(4)}
                        </b>
                      </p>
                      <p style={{ color:'#ccc', fontSize:'13px',
                        marginTop:'5px' }}>
                        👮 Assigned:{' '}
                        <b style={{ color:'#22c55e' }}>
                          {inc.assigned_station}
                        </b>
                      </p>
                      <a href={`https://www.google.com/maps?q=${inc.latitude},${inc.longitude}`}
                        target="_blank" rel="noreferrer"
                        style={{ display:'inline-block', marginTop:'10px',
                          background:'#4f46e5', color:'white',
                          padding:'6px 12px', borderRadius:'6px',
                          fontSize:'12px', textDecoration:'none' }}>
                        🗺️ Open in Google Maps
                      </a>
                    </div>
                    <div style={{ borderRadius:'8px', overflow:'hidden' }}>
                      <iframe
                        title={`inc-${i}`}
                        width="100%" height="180" frameBorder="0"
                        src={`https://maps.google.com/maps?q=${inc.latitude},${inc.longitude}&z=15&output=embed`}
                        style={{ border:'none' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}