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

const App = () => {
  return (
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
    </Routes>
  );
};

export default App; 