import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import AdminRoute from './components/auth/AdminRoute';
import AppDownloadComing from './components/common/AppDownloadComing';

// Import pages
import Home from './pages/Home';
import LaunchPage from './pages/LaunchPage';
import About from './pages/About';
import Services from './pages/Services';
import Blog from './pages/Blog';
import Contact from './pages/Contact';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import DoctorBooking from './components/booking/DoctorBooking';
import UserOrders from './pages/UserOrders';
import UserBookings from './pages/UserBookings';
import UserProfile from './pages/UserProfile';
import MobileProfile from './pages/MobileProfile';
import NotFound from './pages/NotFound';
import PetTransportation from './pages/PetTransportation';
import PetRehoming from './pages/PetRehoming';
import FindFurrySoulmate from './pages/FindFurrySoulmate';
import PetDetails from './pages/PetDetails';
import PetBoarding from './pages/PetBoarding';
import BoardingDetail from './pages/BoardingDetail';
import PetBoardingAdmin from './pages/admin/PetBoardingAdmin';
import PetGrooming from './pages/PetGrooming';
import GroomingDashboard from './pages/GroomingDashboard';
import GroomingDetail from './pages/GroomingDetail';
import GroomingBooking from './pages/GroomingBooking';
import BookingConfirmation from './pages/BookingConfirmation';
import GroomingAdmin from './pages/admin/GroomingAdmin';
import GroomingAdminDashboard from './pages/admin/GroomingAdminDashboard';
import MyPets from './pages/MyPets';
// TailTalks Community pages
import TailTalks from './pages/TailTalks';
import CommunityDetail from './pages/CommunityDetail';
import CreateCommunity from './pages/CreateCommunity';
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
import TailTalksPostDetail from './pages/TailTalksPostDetail';
import TailTalksAdmin from './pages/admin/TailTalksAdmin';
import MyPosts from './pages/MyPosts';
import TailTalksManagementDebug from './pages/admin/TailTalksManagementDebug';

// Import context providers
import { AlertProvider } from './context/AlertContext';
import { UserProvider } from './context/UserContext';

// Layout component to conditionally render Navbar and Footer
const Layout = ({ children }) => {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');
  
  return (
    <div className="App min-h-screen bg-secondary-light text-primary-dark flex flex-col">
      {!isAdminPage && <Navbar />}
      <main className={`flex-grow ${!isAdminPage ? 'pt-24 md:pt-28' : ''}`}>
        {children}
      </main>
      {!isAdminPage && <Footer />}
    </div>
  );
};

function App() {
  useEffect(() => {
    console.log('App component mounted');
  }, []);

  return (
    <AlertProvider>
      <UserProvider>
        <Router>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
          <Routes>
            {/* Landing Page with Countdown Timer */}
            <Route path="/" element={<LaunchPage />} />
            
            {/* Main Website Routes */}
            <Route path="/home" element={<Layout><Home /></Layout>} />
            <Route path="/about" element={<Layout><About /></Layout>} />
            <Route path="/services" element={<Layout><Services /></Layout>} />
            <Route path="/blog" element={<Layout><Blog /></Layout>} />
            <Route path="/contact" element={<Layout><Contact /></Layout>} />
            <Route path="/products" element={<Layout><Products /></Layout>} />
            <Route path="/products/:productId" element={<Layout><ProductDetail /></Layout>} />
            <Route path="/cart" element={<Layout><Cart /></Layout>} />
            <Route path="/book-appointment" element={<Layout><DoctorBooking /></Layout>} />
            <Route path="/my-orders" element={<Layout><UserOrders /></Layout>} />
            <Route path="/my-bookings" element={<Layout><UserBookings /></Layout>} />
            <Route path="/my-pets" element={<Layout><MyPets /></Layout>} />
            <Route path="/profile" element={<Layout>
              <div className="md:block hidden"><UserProfile /></div>
              <div className="md:hidden block"><MobileProfile /></div>
            </Layout>} />
            <Route path="/admin" element={<Layout><AdminLogin /></Layout>} />

            {/* Admin Dashboard Route */}
            <Route path="/admin/dashboard" element={
              <Layout>
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              </Layout>
            } />

            <Route path="/admin/tailtalk" element={<Layout><AdminRoute><TailTalksAdmin /></AdminRoute></Layout>} />

            <Route path="/admin/tailtalk-management" element={<Layout><AdminRoute><TailTalksAdmin /></AdminRoute></Layout>} />

            <Route path="/admin/dashboard/tailtalk-management" element={<Layout><AdminRoute><TailTalksAdmin /></AdminRoute></Layout>} />

            <Route path="/admin/pet-boarding" element={
              <Layout>
                <AdminRoute>
                  <PetBoardingAdmin />
                </AdminRoute>
              </Layout>
            } />

            <Route path="/admin/grooming" element={
              <Layout>
                <AdminRoute>
                  <GroomingAdmin />
                </AdminRoute>
              </Layout>
            } />

            <Route path="/admin/grooming-dashboard" element={
              <Layout>
                <AdminRoute>
                  <GroomingAdminDashboard />
                </AdminRoute>
              </Layout>
            } />

            <Route path="/admin/pet-parenting/:id" element={<Layout><PetDetails /></Layout>} />

            <Route path="/download/ios" element={<Layout><AppDownloadComing storeType="ios" /></Layout>} />
            <Route path="/download/android" element={<Layout><AppDownloadComing storeType="android" /></Layout>} />
            <Route path="/services/transportation" element={<Layout><PetTransportation /></Layout>} />
            <Route path="/services/boarding" element={<Layout><PetBoarding /></Layout>} />
            <Route path="/services/boarding/:id" element={<Layout><BoardingDetail /></Layout>} />
            <Route path="/services/grooming" element={<Layout><PetGrooming /></Layout>} />
            <Route path="/services/grooming/dashboard" element={<Layout><GroomingDashboard /></Layout>} />
            <Route path="/services/grooming/:id" element={<Layout><GroomingDetail /></Layout>} />
            <Route path="/services/grooming/:id/booking" element={<Layout><GroomingBooking /></Layout>} />
            <Route path="/booking-confirmation/:id" element={<Layout><BookingConfirmation /></Layout>} />
            <Route path="/rehome" element={<Layout><PetRehoming /></Layout>} />
            <Route path="/find-furry-soulmate" element={<Layout><FindFurrySoulmate /></Layout>} />
            <Route path="/pets/:petId" element={<Layout><PetDetails /></Layout>} />
            
            {/* TailTalks Community Routes */}
            <Route path="/tailtalk" element={<Layout><TailTalks /></Layout>} />
            <Route path="/tailtalk/post/:postId" element={<Layout><TailTalksPostDetail /></Layout>} />
            <Route path="/tailtalk/myposts" element={<Layout><MyPosts /></Layout>} />
            
            {/* Debug Routes */}
            <Route path="/admin/tailtalk-debug" element={<Layout><TailTalksManagementDebug /></Layout>} />
            
            {/* Legacy TailTalks Routes - Will be deprecated */}
            <Route path="/tailtalk/community/:communityId" element={<Layout><CommunityDetail /></Layout>} />
            <Route path="/tailtalk/create-community" element={<Layout><CreateCommunity /></Layout>} />
            <Route path="/tailtalk/community/:communityId/create-post" element={<Layout><CreatePost /></Layout>} />
            <Route path="/tailtalk/community/:communityId/post/:postId" element={<Layout><PostDetail /></Layout>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </UserProvider>
    </AlertProvider>
  );
}

export default App; 