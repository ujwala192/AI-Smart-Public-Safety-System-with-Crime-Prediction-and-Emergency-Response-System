import { useState, useEffect } from 'react'
import axios from 'axios'

const API = 'http://127.0.0.1:5000/api'

export default function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm]             = useState({
    name: '', email: '', password: '',
    role: 'public', station_id: '', station_name: ''
  })
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [stations, setStations] = useState([])

  useEffect(() => {
    axios.get(`${API}/police-stations-list`)
      .then(r => setStations(r.data.stations))
  }, [])

  const handle = (e) => {
    const { name, value } = e.target
    if (name === 'station_id') {
      const st = stations.find(s => s.id === parseInt(value))
      setForm({ ...form, station_id: value,
                station_name: st ? st.name : '' })
    } else {
      setForm({ ...form, [name]: value })
    }
  }

  const submit = async () => {
    setLoading(true)
    setError('')
    try {
      const url = isRegister ? `${API}/register` : `${API}/login`
      const res = await axios.post(url, form)
      if (res.data.success) {
        if (isRegister) {
          setIsRegister(false)
          setError('✅ Registered! Please login.')
        } else {
          onLogin(res.data.user)
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex',
      alignItems:'center', justifyContent:'center',
      background:'#0f1117' }}>
      <div className="card" style={{ width:'100%',
        maxWidth:'420px', padding:'40px' }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'30px' }}>
          <div style={{ fontSize:'3rem' }}>🛡️</div>
          <h2 style={{ color:'#4f46e5', marginTop:'10px' }}>
            Crime Safety System
          </h2>
          <p style={{ color:'#888', marginTop:'5px' }}>
            Hyderabad Safe Route Finder
          </p>
        </div>

        {/* Toggle */}
        <div style={{ display:'flex', marginBottom:'20px',
          background:'#0f1117', borderRadius:'8px', padding:'4px' }}>
          <button className="btn" onClick={() => setIsRegister(false)}
            style={{ flex:1, background: !isRegister ? '#4f46e5' : 'transparent',
              color:'white' }}>
            Login
          </button>
          <button className="btn" onClick={() => setIsRegister(true)}
            style={{ flex:1, background: isRegister ? '#4f46e5' : 'transparent',
              color:'white' }}>
            Register
          </button>
        </div>

        {/* Register Fields */}
        {isRegister && (
          <input name="name" placeholder="Full Name" onChange={handle} />
        )}

        <input name="email" type="email"
          placeholder="Email" onChange={handle} />
        <input name="password" type="password"
          placeholder="Password" onChange={handle} />

        {isRegister && (
          <>
            <label style={{ color:'#888', fontSize:'13px',
              marginTop:'10px', display:'block' }}>
              Register As
            </label>
            <select name="role" onChange={handle} value={form.role}>
              <option value="public">👤 Public User</option>
              <option value="police">👮 Police Officer</option>
            </select>

            {/* Show station selector only for police */}
            {form.role === 'police' && (
              <>
                <label style={{ color:'#888', fontSize:'13px',
                  marginTop:'10px', display:'block' }}>
                  Select Your Police Station
                </label>
                <select name="station_id" onChange={handle}
                  value={form.station_id}>
                  <option value="">-- Select Station --</option>
                  {stations.map(s => (
                    <option key={s.id} value={s.id}>
                      👮 {s.name} — {s.area}
                    </option>
                  ))}
                </select>
                {form.station_name && (
                  <div style={{ marginTop:'8px', padding:'8px 12px',
                    background:'#22c55e15', borderRadius:'6px',
                    color:'#22c55e', fontSize:'13px' }}>
                    ✅ Assigned to: {form.station_name}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {error && (
          <p style={{ color: error.startsWith('✅') ? '#22c55e' : '#ef4444',
            margin:'10px 0', fontSize:'14px' }}>
            {error}
          </p>
        )}

        <button className="btn btn-primary" onClick={submit}
          style={{ width:'100%', marginTop:'15px', padding:'12px' }}
          disabled={loading}>
          {loading ? 'Please wait...'
           : isRegister ? 'Create Account' : 'Login'}
        </button>

        {/* Demo accounts */}
        <div style={{ marginTop:'20px', padding:'15px',
          background:'#0f1117', borderRadius:'8px' }}>
          <p style={{ color:'#888', fontSize:'12px', marginBottom:'8px' }}>
            Demo Accounts:
          </p>
          <p style={{ color:'#888', fontSize:'12px' }}>
            👤 Public: user@demo.com / 123456
          </p>
          <p style={{ color:'#888', fontSize:'12px' }}>
            👮 Police: police@demo.com / 123456
          </p>
          <p style={{ color:'#555', fontSize:'11px', marginTop:'5px' }}>
            (Demo police sees all stations)
          </p>
        </div>

      </div>
    </div>
  )
}