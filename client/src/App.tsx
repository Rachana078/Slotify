import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/coach/DashboardPage';
import AddAvailabilityPage from './pages/coach/AddAvailabilityPage';
import HistoryPage from './pages/coach/HistoryPage';
import SlotListPage from './pages/parent/SlotListPage';
import BookingConfirmPage from './pages/parent/BookingConfirmPage';
import MyBookingsPage from './pages/parent/MyBookingsPage';
import JoinPage from './pages/parent/JoinPage';
import ComposeMessagePage from './pages/coach/ComposeMessagePage';
import SentMessagesPage from './pages/coach/SentMessagesPage';

export default function App() {
  const { role } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Coach routes (auth required) */}
        <Route
          path="/coach/dashboard"
          element={
            <ProtectedRoute role="coach" currentRole={role}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach/availability/new"
          element={
            <ProtectedRoute role="coach" currentRole={role}>
              <AddAvailabilityPage />
            </ProtectedRoute>
          }
        />
        <Route path="/coach/messages" element={<ProtectedRoute role="coach" currentRole={role}><SentMessagesPage /></ProtectedRoute>} />
        <Route path="/coach/messages/new" element={<ProtectedRoute role="coach" currentRole={role}><ComposeMessagePage /></ProtectedRoute>} />
        <Route path="/coach/history" element={<ProtectedRoute role="coach" currentRole={role}><HistoryPage /></ProtectedRoute>} />

        {/* Parent routes (no auth — parentId from localStorage) */}
        <Route path="/join/:coachId" element={<JoinPage />} />
        <Route path="/slots" element={<SlotListPage />} />
        <Route path="/book/:sessionId" element={<BookingConfirmPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />

        {/* Root redirect based on role */}
        <Route
          path="/"
          element={
            role === 'loading' ? null :
            role === 'coach' ? <Navigate to="/coach/dashboard" replace /> :
            <Navigate to="/slots" replace />
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
