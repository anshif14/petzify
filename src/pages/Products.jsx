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
  const [searchQuery, setSearchQuery] = useState('');
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
          // Get all products first
          const querySnapshot = await getDocs(productsQuery);
          
          const productsData = [];
          querySnapshot.forEach((doc) => {
            productsData.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          // Sort products: featured products first, then sort by createdAt
          productsData.sort((a, b) => {
            if (a.featured === b.featured) {
              // If both have same featured status, sort by createdAt (newest first)
              return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
            }
            // Featured products come first
            return a.featured ? -1 : 1;
          });
          
          setProducts(productsData);
          
          // Extract unique categories
          const allCategories = productsData
            .map(product => product.category)
            .filter((category, index, self) => category && self.indexOf(category) === index);
          
          setCategories(['All', ...allCategories]);
          setLoading(false);
          return;
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
        
        // Apply search filter
        const filteredProducts = searchQuery
          ? productsData.filter(product => 
              product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              product.category?.toLowerCase().includes(searchQuery.toLowerCase())
            )
          : productsData;
        
        setProducts(filteredProducts);
        
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
  }, [selectedCategory, sort, searchQuery, showError]);
  
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
    e.stopPropagation();
    
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
          
          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-8">
            <div className="flex items-center gap-4">
              {/* Main Search - 60% width */}
              <div className="w-[60%]">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products by name, description, or category..."
                    className="w-full h-10 pl-10 pr-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="w-[20%]">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-10 px-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-600"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Sort Options */}
              <div className="w-[20%] flex items-center gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full h-10 px-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-600"
                >
                  <option value="featured">Featured</option>
                  <option value="priceAsc">Price: Low to High</option>
                  <option value="priceDesc">Price: High to Low</option>
                  <option value="newest">Newest First</option>
                </select>

                {(searchQuery || selectedCategory !== 'All' || sort !== 'featured') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setSort('featured');
                    }}
                    className="h-10 w-10 flex items-center justify-center text-primary hover:text-primary-dark"
                    title="Clear All"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {products.map((product) => (
                <Link 
                  to={`/products/${product.id}`} 
                  key={product.id} 
                  className="group relative bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"
                >
                  {/* Product Image */}
                  <div className="aspect-square overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img 
                        src={product.images[0]} 
                        alt={product.name} 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-sm">No image</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Featured Badge */}
                  {product.featured && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Featured</span>
                    </div>
                  )}
                  
                  {/* Quick Add to Cart */}
                  <button 
                    className="absolute right-2 bottom-2 p-2 bg-white rounded-full shadow hover:shadow-md text-primary hover:text-primary-dark transition-all z-10"
                    onClick={(e) => handleAddToCart(e, product)}
                    aria-label="Add to cart"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                  
                  {/* Product Info */}
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 mb-1 line-clamp-1 text-sm">
                      {product.name}
                    </h3>
                    
                    <div>
                      {product.salePrice ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-primary">{formatPrice(product.salePrice)}</span>
                          <span className="text-xs text-gray-500 line-through">{formatPrice(product.price)}</span>
                        </div>
                      ) : (
                        <span className="font-bold text-primary">{formatPrice(product.price)}</span>
                      )}
                    </div>
                  </div>
                </Link>
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