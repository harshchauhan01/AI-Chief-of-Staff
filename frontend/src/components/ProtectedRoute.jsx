import { Navigate, Outlet, useLocation } from 'react-router-dom'

function ProtectedRoute() {
  const location = useLocation()
  const isAuthenticated = Boolean(localStorage.getItem('accessToken'))

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}

export default ProtectedRoute