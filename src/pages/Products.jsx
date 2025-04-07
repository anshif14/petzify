import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { app } from '../firebase/config';
import Footer from '../components/common/Footer';
import Navbar from '../components/common/Navbar';
import { useAlert } from '../context/AlertContext';

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sort, setSort] = useState('featured');
  const { showSuccess, showError } = useAlert();

  useEffect(() => {
    // Log current path to help debug
    console.log('Current URL:', window.location.href);
    
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const db = getFirestore(app);
        let productsQuery;
        
        // Base query
        if (selectedCategory === 'All') {
          productsQuery = collection(db, 'products');
        } else {
          productsQuery = query(
            collection(db, 'products'),
            where('category', '==', selectedCategory)
          );
        }
        
        // Add sorting
        if (sort === 'featured') {
          productsQuery = query(productsQuery, where('featured', '==', true), orderBy('createdAt', 'desc'));
        } else if (sort === 'priceAsc') {
          productsQuery = query(productsQuery, orderBy('price', 'asc'));
        } else if (sort === 'priceDesc') {
          productsQuery = query(productsQuery, orderBy('price', 'desc'));
        } else if (sort === 'newest') {
          productsQuery = query(productsQuery, orderBy('createdAt', 'desc'));
        }
        
        const querySnapshot = await getDocs(productsQuery);
        
        const productsData = [];
        querySnapshot.forEach((doc) => {
          productsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setProducts(productsData);
        
        // Extract unique categories
        const allCategories = productsData
          .map(product => product.category)
          .filter((category, index, self) => category && self.indexOf(category) === index);
        
        setCategories(['All', ...allCategories]);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load products. Please try again later.');
        showError('Failed to load products. Please try again later.', 'Error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [selectedCategory, sort, showError]);
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Function to handle adding product to cart
  const handleAddToCart = (e, product) => {
    e.preventDefault();
    
    try {
      let cart = JSON.parse(localStorage.getItem('cart')) || [];
      const existingProductIndex = cart.findIndex(item => item.id === product.id);
      
      if (existingProductIndex >= 0) {
        cart[existingProductIndex].quantity += 1;
        showSuccess(`Added another ${product.name} to your cart`, 'Product Added');
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: product.salePrice || product.price,
          image: product.images && product.images.length > 0 ? product.images[0] : null,
          quantity: 1
        });
        showSuccess(`${product.name} added to your cart!`, 'Product Added');
      }
      
      localStorage.setItem('cart', JSON.stringify(cart));
      
      // Dispatch the cartUpdated event to update the cart count in Navbar
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      console.error('Error adding to cart:', err);
      showError('Could not add product to cart', 'Error');
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Pet Products</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Browse our selection of high-quality products for your furry friends
            </p>
          </div>
          
          {/* Cart button (for mobile) */}
          <div className="md:hidden flex justify-end mb-4">
            <button
              onClick={() => navigate('/cart')}
              className="bg-primary text-white p-2 rounded-full shadow-md hover:bg-primary-dark transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          </div>
          
          {/* Filters and Sorting */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 space-y-4 md:space-y-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-700 font-medium">Categories:</span>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm ${
                    selectedCategory === category
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-gray-700 font-medium mr-2">Sort by:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="featured">Featured</option>
                  <option value="priceAsc">Price: Low to High</option>
                  <option value="priceDesc">Price: High to Low</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
              
              {/* Cart button (for desktop) */}
              <div className="hidden md:block">
                <button
                  onClick={() => navigate('/cart')}
                  className="bg-primary text-white p-2 rounded-full shadow-md hover:bg-primary-dark transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {/* Products Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600 py-8">{error}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-gray-600">No products found</h2>
              <p className="text-gray-500 mt-2">
                {selectedCategory !== 'All' 
                  ? `No products available in the ${selectedCategory} category.` 
                  : 'No products available at the moment.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <Link to={`/products/${product.id}`} className="block h-64 overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">No image available</span>
                      </div>
                    )}
                  </Link>
                  
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        <Link to={`/products/${product.id}`} className="hover:text-primary">
                          {product.name}
                        </Link>
                      </h3>
                      {product.featured && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Featured</span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                    
                    <div className="mb-3">
                      {product.salePrice ? (
                        <div className="flex items-center space-x-2">
                          <span className="text-lg font-bold text-primary">{formatPrice(product.salePrice)}</span>
                          <span className="text-sm text-gray-500 line-through">{formatPrice(product.price)}</span>
                        </div>
                      ) : (
                        <span className="text-lg font-bold text-primary">{formatPrice(product.price)}</span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                    
                    <div className="flex justify-between items-center">
                      <Link 
                        to={`/products/${product.id}`}
                        className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition-colors"
                      >
                        View Details
                      </Link>
                      <button 
                        className="p-2 text-primary hover:text-primary-dark"
                        onClick={(e) => handleAddToCart(e, product)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      {/*<Footer />*/}
    </>
  );
};

export default Products; 