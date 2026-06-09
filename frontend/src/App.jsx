import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Finance from './pages/Finance';
import RoutePlanning from './pages/RoutePlanning';
import Tasks from './pages/Tasks';
import DutyRoster from './pages/DutyRoster';
import Attendance from './pages/Attendance';
import Meals from './pages/Meals';
import Announcements from './pages/Announcements';

const App = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/routes" element={<RoutePlanning />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/duties" element={<DutyRoster />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/meals" element={<Meals />} />
        <Route path="/announcements" element={<Announcements />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  );
};

export default App;
