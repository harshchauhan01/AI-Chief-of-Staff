import { Link, Outlet, useLocation } from 'react-router-dom'
import TopNav from '../components/TopNav'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/goals', label: 'Goals' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/routine', label: 'Routine Tracker' },
  { to: '/daily-plan', label: 'Daily Plan' },
  { to: '/decision-helper', label: 'Decision Helper' },
]

function AppLayout() {
  const location = useLocation()

  return (
    <>
      <TopNav />
      <div className="app-shell">
        <aside className="sidebar">
          <h1>Command Hub</h1>
          <p className="sidebar-copy">Plan decisively, execute consistently, and review progress daily.</p>
          <nav>
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={location.pathname === item.to ? 'nav-link active' : 'nav-link'}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </>
  )
}

export default AppLayout
