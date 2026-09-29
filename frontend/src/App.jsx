import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import PublicDashboard from './pages/PublicDashboard'
import PoliceDashboard from './pages/PoliceDashboard'

function App() {
  const [user, setUser] = useState(null)

  const handleLogin = (userData) => setUser(userData)
  const handleLogout = () => setUser(null)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={
          !user
            ? <Login onLogin={handleLogin} />
            : user.role === 'police'
              ? <Navigate to="/police" />
              : <Navigate to="/dashboard" />
        } />
        <Route path="/dashboard" element={
          user ? <PublicDashboard user={user} onLogout={handleLogout} />
                : <Navigate to="/" />
        } />
        <Route path="/police" element={
          user && user.role === 'police'
            ? <PoliceDashboard user={user} onLogout={handleLogout} />
            : <Navigate to="/" />
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App