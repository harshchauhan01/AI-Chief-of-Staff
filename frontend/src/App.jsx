import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layout/AppLayout'
import DashboardPage from './pages/DashboardPage'
import DailyPlanPage from './pages/DailyPlanPage'
import DecisionHelperPage from './pages/DecisionHelperPage'
import GoalsPage from './pages/GoalsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import RoutineProgressPage from './pages/RoutineProgressPage'
import RoutineTrackerPage from './pages/RoutineTrackerPage'
import TasksPage from './pages/TasksPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/routine" element={<RoutineTrackerPage />} />
          <Route path="/routine-progress" element={<RoutineProgressPage />} />
          <Route path="/daily-plan" element={<DailyPlanPage />} />
          <Route path="/decision-helper" element={<DecisionHelperPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
