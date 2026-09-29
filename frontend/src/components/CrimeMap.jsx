import { useEffect } from 'react'
import {
  MapContainer, TileLayer, CircleMarker,
  Popup, Marker, Polyline, useMap
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const policeIcon = L.divIcon({
  html: `<div style="
    background:#4f46e5;color:white;border-radius:50%;
    width:32px;height:32px;display:flex;align-items:center;
    justify-content:center;font-size:16px;
    border:2px solid white;box-shadow:0 0 10px #4f46e580;">👮</div>`,
  className: '',
  iconSize:   [32, 32],
  iconAnchor: [16, 16],
})

const riskColor = (level) => {
  if (level === 'High')   return '#ef4444'
  if (level === 'Medium') return '#f59e0b'
  return '#22c55e'
}

function MapController({ center, zoom, routeLine }) {
  const map = useMap()

  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize()
    }, 100)
  }, [])

  useEffect(() => {
    if (!center || isNaN(center[0]) || isNaN(center[1])) return
    setTimeout(() => {
      map.invalidateSize()
      map.setView(center, zoom || 12)
    }, 150)
  }, [center, zoom])

  useEffect(() => {
  if (!routeLine || routeLine.length < 2) return
  setTimeout(() => {
    try {
      map.invalidateSize()
      const midLat = (routeLine[0][0] + routeLine[routeLine.length - 1][0]) / 2
      const midLon = (routeLine[0][1] + routeLine[routeLine.length - 1][1]) / 2
      map.setView([midLat, midLon], 13)
    } catch (e) {}
  }, 200)
}, [routeLine])

  return null
}

export default function CrimeMap({
  hotspots  = [],
  stations  = [],
  sosPoints = [],
  routeLine = null,
  height    = '400px',
  center    = [17.4065, 78.4772],
  zoom      = 11
}) {
  const validCenter = (
    center && !isNaN(center[0]) && !isNaN(center[1])
  ) ? center : [17.4065, 78.4772]

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); }
          70%  { box-shadow: 0 0 0 15px rgba(239,68,68,0); }
          100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
        }
        .leaflet-popup-content-wrapper {
          background: #1a1d2e !important;
          color: white !important;
          border: 1px solid #2a2d3e !important;
          border-radius: 10px !important;
        }
        .leaflet-popup-tip { background: #1a1d2e !important; }
        .leaflet-popup-close-button { color: white !important; }
      `}</style>

      <MapContainer
        center={validCenter}
        zoom={zoom}
        style={{ height, width: '100%', borderRadius: '12px' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; OpenStreetMap &copy; CARTO'
          subdomains="abcd"
          maxZoom={19}
        />

        <MapController
          center={validCenter}
          zoom={zoom}
          routeLine={routeLine}
        />

        {routeLine && routeLine.length >= 2 && (
          <Polyline
            positions={routeLine}
            color="#4f46e5"
            weight={5}
            opacity={0.85}
            dashArray="10, 6"
          />
        )}

        {hotspots.map((h, i) => (
          <CircleMarker
            key={`h-${i}`}
            center={[h.latitude, h.longitude]}
            radius={Math.min(8 + h.crime_count / 4, 30)}
            fillColor={riskColor(h.risk_level)}
            color={riskColor(h.risk_level)}
            fillOpacity={0.35}
            weight={2}
          >
            <Popup>
              <div style={{ minWidth: '180px', padding: '5px' }}>
                <b style={{ fontSize: '14px' }}>📍 {h.area}</b>
                <div style={{ background: '#0f1117', borderRadius: '6px',
                  padding: '8px', margin: '6px 0' }}>
                  <p style={{ color: riskColor(h.risk_level),
                    fontWeight: 'bold', fontSize: '13px' }}>
                    {h.risk_level} Risk Zone
                  </p>
                </div>
                <p style={{ color: '#ccc', fontSize: '12px' }}>
                  🔢 Crimes: <b>{h.crime_count}</b>
                </p>
                <p style={{ color: '#ccc', fontSize: '12px' }}>
                  🦹 Top: <b>{h.top_crime}</b>
                </p>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {stations.map((s, i) => (
          <Marker
            key={`s-${i}`}
            position={[s.latitude, s.longitude]}
            icon={policeIcon}
          >
            <Popup>
              <div style={{ minWidth: '170px', padding: '5px' }}>
                <b style={{ fontSize: '14px' }}>👮 {s.name}</b>
                <p style={{ color: '#ccc', fontSize: '12px', marginTop: '5px' }}>
                  📍 {s.area}
                </p>
                {s.phone && (
                  <p style={{ color: '#4f46e5', fontSize: '12px' }}>
                    📞 <a href={`tel:${s.phone}`}
                      style={{ color: '#4f46e5' }}>{s.phone}</a>
                  </p>
                )}
                {s.distance && (
                  <p style={{ color: '#22c55e', fontSize: '12px' }}>
                    📏 {s.distance} km away
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {sosPoints.map((p, i) => (
          <Marker
            key={`sos-${i}`}
            position={[p.latitude, p.longitude]}
          >
            <Popup>
              <div style={{ minWidth: '170px', padding: '5px' }}>
                <p style={{ color: '#ef4444', fontWeight: 'bold' }}>
                  🚨 {p.type === 'sos' ? 'SOS Alert' : 'Incident'}
                </p>
                <p style={{ color: '#ccc', fontSize: '12px' }}>
                  👤 {p.user_name}
                </p>
                <p style={{ color: '#ccc', fontSize: '12px' }}>
                  📍 {p.area || p.address}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>
    </>
  )
}