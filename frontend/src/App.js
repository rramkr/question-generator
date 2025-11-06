import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import './App.css';

// Authentication bypassed - all users access the app without login
function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
