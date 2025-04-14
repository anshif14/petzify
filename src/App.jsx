import PetParentingAdmin from './pages/admin/PetParentingAdmin';
import PetBoardingAdmin from './pages/admin/PetBoardingAdmin';

<Route path="/admin" element={<Layout><Dashboard /></Layout>}>
  <Route path="users" element={<UsersAdmin />} />
  <Route path="services" element={<ServicesAdmin />} />
  <Route path="pet-parenting" element={<PetParentingAdmin />} />
  <Route path="blog" element={<BlogAdmin />} />
  <Route path="settings" element={<SettingsAdmin />} />
  <Route path="pet-boarding" element={
    <AdminRoute>
      <PetBoardingAdmin />
    </AdminRoute>
  } />
</Route> 