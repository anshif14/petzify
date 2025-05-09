import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { app } from '../../firebase/config';

const AdminSidebar = ({
  activeComponent,
  setActiveComponent,
  canManageUsers,
  canEditContacts,
  canManageMessages,
  canManageProducts,
  canManageBookings,
  canManagePetParenting,
  canManageOrders,
  canManageServices = true,
  canManageReviews = true,
  isGroomingAdmin = false
}) => {
  const navigate = useNavigate();
  const [pendingPetCount, setPendingPetCount] = useState(0);
  const [pendingProductCount, setPendingProductCount] = useState(0);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [pendingBoardingCount, setPendingBoardingCount] = useState(0);
  const [pendingGroomingCount, setPendingGroomingCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const db = getFirestore(app);

        // Fetch pending pet count
        if (canManagePetParenting) {
          console.log('Fetching pending pet count...');
          const petQuery = query(
            collection(db, 'rehomePets'),
            where('status', '==', 'pending')
          );
          const petSnapshot = await getDocs(petQuery);
          console.log('Pending pets count:', petSnapshot.size);
          setPendingPetCount(petSnapshot.size);
        }

        // Fetch pending product count
        if (canManageProducts) {
          console.log('Fetching pending product count...');
          const productQuery = query(
            collection(db, 'products'),
            where('status', '==', 'pending')
          );
          const productSnapshot = await getDocs(productQuery);
          console.log('Pending products count:', productSnapshot.size);
          setPendingProductCount(productSnapshot.size);
        }

        // Fetch pending order count
        if (canManageOrders) {
          console.log('Fetching pending order count...');
          const orderQuery = query(
            collection(db, 'orders'),
            where('status', '==', 'pending')
          );
          const orderSnapshot = await getDocs(orderQuery);
          console.log('Pending orders count:', orderSnapshot.size);
          setPendingOrderCount(orderSnapshot.size);
        }

        // Fetch pending boarding center count
        if (canManageServices) {
          console.log('Fetching pending boarding count...');
          const boardingQuery = query(
            collection(db, 'petBoardingCenters'),
            where('status', '==', 'pending')
          );
          const boardingSnapshot = await getDocs(boardingQuery);
          console.log('Pending boarding centers count:', boardingSnapshot.size);
          setPendingBoardingCount(boardingSnapshot.size);
        }

        // Fetch pending grooming count
        if (canManageServices) {
          console.log('Fetching pending grooming count...');
          const groomingQuery = query(
            collection(db, 'groomingCenters'),
            where('status', '==', 'pending')
          );
          const groomingSnapshot = await getDocs(groomingQuery);
          console.log('Pending grooming centers count:', groomingSnapshot.size);
          setPendingGroomingCount(groomingSnapshot.size);
        }
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };

    fetchCounts();

    // Set up real-time listener for changes
    const db = getFirestore(app);

    let unsubscribePets;
    let unsubscribeProducts;
    let unsubscribeOrders;
    let unsubscribeBoarding;
    let unsubscribeGrooming;

    if (canManagePetParenting) {
      const petsQuery = query(
        collection(db, 'rehomePets'),
        where('status', '==', 'pending')
      );
      unsubscribePets = onSnapshot(petsQuery, (snapshot) => {
        console.log('Real-time pets update:', snapshot.size);
        setPendingPetCount(snapshot.size);
      });
    }

    if (canManageProducts) {
      const productsQuery = query(
        collection(db, 'products'),
        where('status', '==', 'pending')
      );
      unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
        console.log('Real-time products update:', snapshot.size);
        setPendingProductCount(snapshot.size);
      });
    }

    if (canManageOrders) {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('status', '==', 'pending')
      );
      unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
        console.log('Real-time orders update:', snapshot.size);
        setPendingOrderCount(snapshot.size);
      });
    }

    // Add listener for pet boarding centers
    if (canManageServices) {
      const boardingQuery = query(
        collection(db, 'petBoardingCenters'),
        where('status', '==', 'pending')
      );
      unsubscribeBoarding = onSnapshot(boardingQuery, (snapshot) => {
        console.log('Real-time boarding centers update:', snapshot.size);
        setPendingBoardingCount(snapshot.size);
      });
    }

    // Add listener for grooming centers
    if (canManageServices) {
      const groomingQuery = query(
        collection(db, 'groomingCenters'),
        where('status', '==', 'pending')
      );
      unsubscribeGrooming = onSnapshot(groomingQuery, (snapshot) => {
        console.log('Real-time grooming centers update:', snapshot.size);
        setPendingGroomingCount(snapshot.size);
      });
    }

    // Cleanup listeners
    return () => {
      if (unsubscribePets) unsubscribePets();
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeOrders) unsubscribeOrders();
      if (unsubscribeBoarding) unsubscribeBoarding();
      if (unsubscribeGrooming) unsubscribeGrooming();
    };
  }, [canManagePetParenting, canManageProducts, canManageOrders, canManageServices]);

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    navigate('/admin-login');
  };

  return (
    <div className="w-64 bg-white shadow-lg min-h-screen">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-primary">Petzify Admin</h2>
      </div>

      <nav className="mt-6">
        <ul>
          <li>
            <button
              onClick={() => setActiveComponent('dashboard')}
              className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                activeComponent === 'dashboard'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
          </li>

          {canManageUsers && (
            <li>
              <button
                onClick={() => setActiveComponent('users')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'users'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                User Management
              </button>
            </li>
          )}

          {canEditContacts && (
            <li>
              <button
                onClick={() => setActiveComponent('contact-info')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'contact-info'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Information
              </button>
            </li>
          )}

          {canManageMessages && (
            <li>
              <button
                onClick={() => setActiveComponent('messages')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'messages'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Messages
              </button>
            </li>
          )}

          {canManageProducts && (
            <li>
              <button
                onClick={() => setActiveComponent('products')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'products'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Products
                {pendingProductCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {pendingProductCount}
                  </span>
                )}
              </button>
            </li>
          )}

          {canManageServices && (
            <li>
              <button
                onClick={() => setActiveComponent('pet-boarding')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'pet-boarding'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Pet Boarding
                {pendingBoardingCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {pendingBoardingCount}
                  </span>
                )}
              </button>
            </li>
          )}

          {canManageServices && (
            <li>
              <button
                onClick={() => setActiveComponent('services')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'services'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Grooming Management
                {(pendingBoardingCount > 0 || pendingGroomingCount > 0) && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {pendingBoardingCount + pendingGroomingCount}
                  </span>
                )}
              </button>
            </li>
          )}

          {canManageOrders && (
            <li>
              <button
                onClick={() => setActiveComponent('orders')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'orders'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Orders
                {pendingOrderCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {pendingOrderCount}
                  </span>
                )}
              </button>
            </li>
          )}

          {canManageBookings && (
            <li>
              <button
                onClick={() => setActiveComponent('bookings')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'bookings'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Bookings
              </button>
            </li>
          )}

          {canEditContacts && (
            <li>
              <button
                onClick={() => setActiveComponent('content')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'content'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Content Management
              </button>
            </li>
          )}

          {canEditContacts && (
            <li>
              <button
                onClick={() => setActiveComponent('testimonials')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'testimonials'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Testimonials
              </button>
            </li>
          )}

          {canManagePetParenting && (
            <li>
              <button
                onClick={() => setActiveComponent('pet-parenting')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'pet-parenting'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Pet Parenting
                {pendingPetCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                    {pendingPetCount}
                  </span>
                )}
              </button>
            </li>
          )}

          {canManageReviews && (
            <li>
              <button
                onClick={() => setActiveComponent('reviews')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'reviews'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                Reviews Management
              </button>
            </li>
          )}

          {isGroomingAdmin && (
            <li>
              <button
                onClick={() => setActiveComponent('services')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'services'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Services & Packages
              </button>
            </li>
          )}

          {isGroomingAdmin && (
            <li>
              <button
                onClick={() => setActiveComponent('schedule')}
                className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                  activeComponent === 'schedule'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Availability
              </button>
            </li>
          )}

          <li>
            <button
              onClick={() => setActiveComponent('profile')}
              className={`flex items-center w-full px-6 py-3 text-left transition-colors ${
                activeComponent === 'profile'
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </button>
          </li>

          <li>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-6 py-3 text-left text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default AdminSidebar;