import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute } from './routes/ProtectedRoute';
import Navbar from './components/Navbar';

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
import Profile from './pages/Profile/Profile';

// Admin
import AdminDashboard from './pages/Admin/AdminDashboard';

import Sidebar from './components/Sidebar';

// Layout wrapper with Sidebar
const Layout = ({ children }) => (
  <div className="min-h-screen bg-[#F7F8F7] text-gray-850 flex">
    <Sidebar />
    <main className="flex-1 overflow-y-auto p-4 md:p-8">
      {children}
    </main>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected user routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/diet-plan" element={<ProtectedRoute><Layout><DietPlan /></Layout></ProtectedRoute>} />
          <Route path="/meal-log" element={<ProtectedRoute><Layout><MealLog /></Layout></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Layout><Progress /></Layout></ProtectedRoute>} />
          <Route path="/challenges" element={<ProtectedRoute><Layout><Challenges /></Layout></ProtectedRoute>} />
          <Route path="/shopping-list" element={<ProtectedRoute><Layout><ShoppingList /></Layout></ProtectedRoute>} />
          <Route path="/medical-report" element={<ProtectedRoute><Layout><MedicalReport /></Layout></ProtectedRoute>} />
          <Route path="/bookmarks" element={<ProtectedRoute><Layout><Bookmarks /></Layout></ProtectedRoute>} />
          <Route path="/subscription" element={<ProtectedRoute><Layout><Subscription /></Layout></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />

          {/* Admin-only routes */}
          <Route path="/admin" element={<AdminRoute><Layout><AdminDashboard /></Layout></AdminRoute>} />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

