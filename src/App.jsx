import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/admin/Dashboard';
import UsersAdmin from './pages/admin/UsersAdmin';
import ServicesAdmin from './pages/admin/ServicesAdmin';
import BlogAdmin from './pages/admin/BlogAdmin';
import SettingsAdmin from './pages/admin/SettingsAdmin';
import PetParentingManager from './components/admin/PetParentingManager';
import PetParentingDetails from './pages/admin/PetParentingDetails';
import PetBoardingAdmin from './pages/admin/PetBoardingAdmin';
import AdminRoute from './components/auth/AdminRoute';
import TailTalks from './pages/TailTalks';
import TailTalksPostDetail from './pages/TailTalksPostDetail';
import { NotificationProvider } from './context/NotificationContext';
import { UserProvider } from './context/UserContext';
import { BrowserRouter as Router } from 'react-router-dom';

const App = () => {
  return (
    <Router>
      <UserProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/admin" element={<Layout><Dashboard /></Layout>}>
              <Route path="users" element={<UsersAdmin />} />
              <Route path="services" element={<ServicesAdmin />} />
              <Route path="pet-parenting" element={<PetParentingManager />} />
              <Route path="pet-parenting/:id" element={<PetParentingDetails />} />
              <Route path="blog" element={<BlogAdmin />} />
              <Route path="settings" element={<SettingsAdmin />} />
              <Route path="pet-boarding" element={
                <AdminRoute>
                  <PetBoardingAdmin />
                </AdminRoute>
              } />
            </Route>
            <Route path="/tailtalk" element={<TailTalks />} />
            <Route path="/tailtalk/post/:postId" element={<TailTalksPostDetail />} />
          </Routes>
        </NotificationProvider>
      </UserProvider>
    </Router>
  );
};

export default App; 