import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import StudyCoach from './pages/StudyCoach';
import NotesGen from './pages/NotesGen';
import DoubtSolver from './pages/DoubtSolver';
import ExamPrep from './pages/ExamPrep';
import CareerAI from './pages/CareerAI';
import Login from './pages/Login';
import StudyPlanner from './pages/StudyPlanner';
import { useAuth } from './context/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="study-coach" element={<StudyCoach />} />
          <Route path="notes-gen" element={<NotesGen />} />
          <Route path="doubt-solver" element={<DoubtSolver />} />
          <Route path="planner" element={<StudyPlanner />} />
          <Route path="exam-prep" element={<ExamPrep />} />
          <Route path="career-ai" element={<CareerAI />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;