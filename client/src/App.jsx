import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute } from './routes/ProtectedRoute';

// Auth
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';

// User pages
import Dashboard from './pages/Dashboard/Dashboard';
import DietPlan from './pages/DietPlan/DietPlan';
import MealLog from './pages/MealLog/MealLog';
import Progress from './pages/Progress/Progress';
import Challenges from './pages/Challenges/Challenges';
import ShoppingList from './pages/ShoppingList/ShoppingList';
import MedicalReport from './pages/MedicalReport/MedicalReport';
import Bookmarks from './pages/Bookmarks/Bookmarks';
import Subscription from './pages/Subscription/Subscription';

// Admin
import AdminDashboard from './pages/Admin/AdminDashboard';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected user routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/diet-plan" element={<ProtectedRoute><DietPlan /></ProtectedRoute>} />
          <Route path="/meal-log" element={<ProtectedRoute><MealLog /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
          <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
          <Route path="/shopping-list" element={<ProtectedRoute><ShoppingList /></ProtectedRoute>} />
          <Route path="/medical-report" element={<ProtectedRoute><MedicalReport /></ProtectedRoute>} />
          <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />

          {/* Admin-only routes */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
