import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isAuthenticatedSession } from '../services/guestSession'

function ProtectedRoute() {
  const location = useLocation()
  const isAuthenticated = isAuthenticatedSession()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export default ProtectedRoute