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
  const [allProducts, setAllProducts] = useState([]); // Store all products for client-side pagination
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sort, setSort] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const { showSuccess, showError } = useAlert();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

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
          
          // Apply search filter
          const filteredProducts = searchQuery
            ? productsData.filter(product => 
                product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.category?.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : productsData;
          
          // Store all filtered products
          setAllProducts(filteredProducts);
          
          // Calculate total pages
          setTotalPages(Math.ceil(filteredProducts.length / productsPerPage));
          
          // Get current page of products
          const indexOfLastProduct = currentPage * productsPerPage;
          const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
          setProducts(filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct));
          
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
        
        // Store all filtered products
        setAllProducts(filteredProducts);
        
        // Calculate total pages
        setTotalPages(Math.ceil(filteredProducts.length / productsPerPage));
        
        // Get current page of products
        const indexOfLastProduct = currentPage * productsPerPage;
        const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
        setProducts(filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct));
        
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
  }, [selectedCategory, sort, searchQuery, currentPage, productsPerPage, showError]);
  
  // Handle page change
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Handle products per page change
  const handleProductsPerPageChange = (e) => {
    const newProductsPerPage = parseInt(e.target.value, 10);
    setProductsPerPage(newProductsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };
  
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
            <>
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
              
              {/* Pagination Controls */}
              <div className="mt-10 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <select
                    value={productsPerPage}
                    onChange={handleProductsPerPageChange}
                    className="h-8 px-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-gray-600">per page</span>
                </div>
                
                <div className="flex justify-center">
                  <nav className="relative z-0 inline-flex shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border ${
                        currentPage === 1 
                          ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      const isCurrentPage = pageNumber === currentPage;
                      
                      // Show only a window of page numbers around the current page
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => handlePageChange(pageNumber)}
                            className={`relative inline-flex items-center px-4 py-2 border ${
                              isCurrentPage 
                                ? 'z-10 bg-primary border-primary text-white' 
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      } else if (
                        (pageNumber === currentPage - 2 && currentPage > 3) ||
                        (pageNumber === currentPage + 2 && currentPage < totalPages - 2)
                      ) {
                        return (
                          <span 
                            key={pageNumber}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700"
                          >
                            ...
                          </span>
                        );
                      }
                      
                      return null;
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border ${
                        currentPage === totalPages || totalPages === 0
                          ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' 
                          : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
                
                <div className="text-sm text-gray-600">
                  Showing <span className="font-medium">{allProducts.length > 0 ? (currentPage - 1) * productsPerPage + 1 : 0}</span> to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * productsPerPage, allProducts.length)}
                  </span>{' '}
                  of <span className="font-medium">{allProducts.length}</span> products
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      {/*<Footer />*/}
    </>
  );
};

export default Products; 