import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { app } from '../firebase/config';
import Footer from '../components/common/Footer';
import Navbar from '../components/common/Navbar';
import MobileBottomNav from '../components/common/MobileBottomNav';
import { useAlert } from '../context/AlertContext';
import RatingDisplay from '../components/common/RatingDisplay';

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
  const [productReviews, setProductReviews] = useState({});
  
  // Hover carousel state
  const [hoverProductId, setHoverProductId] = useState(null);
  const [carouselImageIndexes, setCarouselImageIndexes] = useState({});
  const carouselInterval = useRef(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  
  // Fetch all product reviews once
  useEffect(() => {
    const fetchProductReviews = async () => {
      try {
        const db = getFirestore(app);
        const reviewsSnapshot = await getDocs(collection(db, 'productReviews'));
        
        const reviewsByProduct = {};
        
        reviewsSnapshot.forEach(doc => {
          const reviewData = doc.data();
          const productId = reviewData.productId;
          
          if (!productId) return;
          
          if (!reviewsByProduct[productId]) {
            reviewsByProduct[productId] = {
              count: 0,
              totalRating: 0,
              reviews: []
            };
          }
          
          reviewsByProduct[productId].count++;
          reviewsByProduct[productId].totalRating += reviewData.rating || 0;
          reviewsByProduct[productId].reviews.push({
            id: doc.id,
            ...reviewData
          });
        });
        
        // Calculate average ratings
        Object.keys(reviewsByProduct).forEach(productId => {
          const productReview = reviewsByProduct[productId];
          productReview.averageRating = productReview.count > 0 ? 
            productReview.totalRating / productReview.count : 0;
        });
        
        setProductReviews(reviewsByProduct);
      } catch (error) {
        console.error('Error fetching product reviews:', error);
      }
    };
    
    fetchProductReviews();
  }, []);
  
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
          
          // Sort products: featured products first, then sort by rating, then by createdAt
          productsData.sort((a, b) => {
            // First sort by featured status
            if (a.featured !== b.featured) {
              return a.featured ? -1 : 1;
            }
            
            // Then sort by rating
            const aRating = productReviews[a.id]?.averageRating || 0;
            const bRating = productReviews[b.id]?.averageRating || 0;
            
            if (aRating !== bRating) {
              return bRating - aRating; // Higher rating first
            }
            
            // If ratings are equal, sort by createdAt
            return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
          });
          
          // Apply search filter for featured sort
          const filteredProducts = searchQuery
            ? productsData.filter(product => {
                const query = searchQuery.toLowerCase().trim();
                const nameMatch = product.name?.toLowerCase().includes(query) || false;
                const descMatch = product.description?.toLowerCase().includes(query) || false;
                const catMatch = product.category?.toLowerCase().includes(query) || false;
                const tagMatch = product.tags && Array.isArray(product.tags) && 
                  product.tags.some(tag => tag.toLowerCase().includes(query));
                const specMatch = product.specifications && Array.isArray(product.specifications) && 
                  product.specifications.some(spec => 
                    (spec.key?.toLowerCase().includes(query)) || 
                    (spec.value?.toLowerCase().includes(query))
                  );
                
                return nameMatch || descMatch || catMatch || tagMatch || specMatch;
              })
            : productsData;
          
          console.log('Search query:', searchQuery);
          console.log('Total products:', productsData.length);
          console.log('Filtered products:', filteredProducts.length);
          
          setProducts(filteredProducts);
          
          // Extract unique categories
          const allCategories = productsData
            .map(product => product.category)
            .filter((category, index, self) => category && self.indexOf(category) === index);
          
          setCategories(['All', ...allCategories]);
          setLoading(false);
          // Reset to first page when filters change
          setCurrentPage(1);
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
          ? productsData.filter(product => {
              const query = searchQuery.toLowerCase().trim();
              const nameMatch = product.name?.toLowerCase().includes(query) || false;
              const descMatch = product.description?.toLowerCase().includes(query) || false;
              const catMatch = product.category?.toLowerCase().includes(query) || false;
              const tagMatch = product.tags && Array.isArray(product.tags) && 
                product.tags.some(tag => tag.toLowerCase().includes(query));
              const specMatch = product.specifications && Array.isArray(product.specifications) && 
                product.specifications.some(spec => 
                  (spec.key?.toLowerCase().includes(query)) || 
                  (spec.value?.toLowerCase().includes(query))
                );
              
              return nameMatch || descMatch || catMatch || tagMatch || specMatch;
            })
          : productsData;
        
        console.log('Search query:', searchQuery);
        console.log('Total products:', productsData.length);
        console.log('Filtered products:', filteredProducts.length);
        
        setProducts(filteredProducts);
        
        // Extract unique categories
        const allCategories = productsData
          .map(product => product.category)
          .filter((category, index, self) => category && self.indexOf(category) === index);
        
        setCategories(['All', ...allCategories]);
        
        // Reset to first page when filters change
        setCurrentPage(1);
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
  
  // Clean up carousel interval on unmount
  useEffect(() => {
    return () => {
      if (carouselInterval.current) {
        clearInterval(carouselInterval.current);
      }
    };
  }, []);
  
  // Handle product image carousel on hover
  const handleProductHover = (productId, images) => {
    if (!images || images.length <= 1) return;
    
    setHoverProductId(productId);
    
    // Initialize carousel index if not already set
    if (!carouselImageIndexes[productId]) {
      setCarouselImageIndexes(prev => ({...prev, [productId]: 0}));
    }
    
    // Clear any existing interval
    if (carouselInterval.current) {
      clearInterval(carouselInterval.current);
      carouselInterval.current = null;
    }
    
    // Start carousel interval
    carouselInterval.current = setInterval(() => {
      setCarouselImageIndexes(prev => {
        const currentIndex = prev[productId] || 0;
        const nextIndex = (currentIndex + 1) % images.length;
        return {...prev, [productId]: nextIndex};
      });
    }, 1500); // Change image every 1.5 seconds
  };
  
  // Handle product mouse leave
  const handleProductLeave = () => {
    setHoverProductId(null);
    
    // Clear carousel interval
    if (carouselInterval.current) {
      clearInterval(carouselInterval.current);
      carouselInterval.current = null;
    }
  };
  
  // Calculate pagination info
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = products.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(products.length / itemsPerPage);
  
  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
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

  // Function to get product rating information
  const getProductRating = (productId) => {
    if (!productReviews[productId]) {
      return { rating: 0, count: 0 };
    }
    
    return {
      rating: productReviews[productId].averageRating || 0,
      count: productReviews[productId].count || 0
    };
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-8 md:pt-8 pt-4 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Pet Products</h1>
          </div>
          
          {/* Search Bar at Top */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log('Setting search query:', value);
                  setSearchQuery(value);
                }}
                placeholder="Search products by name, description, or category..."
                className="w-full h-12 pl-10 pr-4 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Mobile Cart Button */}
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
          
          <div className="flex flex-col md:flex-row">
            {/* Filter Sidebar - Left Side */}
            <div className="w-full md:w-64 mb-6 md:mb-0 md:mr-6">
              <div className="bg-white rounded-xl shadow-md p-4 sticky top-24">
                <h2 className="font-semibold text-lg text-gray-900 mb-4">Filters</h2>
                
                {/* Category Filter */}
                <div className="mb-5">
                  <h3 className="font-medium text-gray-700 mb-2">Category</h3>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-gray-600"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                {/* Sort Options */}
                <div className="mb-5">
                  <h3 className="font-medium text-gray-700 mb-2">Sort By</h3>
                  <div className="flex flex-col space-y-2">
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="radio" 
                        name="sort" 
                        value="featured" 
                        checked={sort === 'featured'} 
                        onChange={() => setSort('featured')}
                        className="form-radio h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="ml-2 text-gray-700">Featured</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="radio" 
                        name="sort" 
                        value="priceAsc" 
                        checked={sort === 'priceAsc'} 
                        onChange={() => setSort('priceAsc')}
                        className="form-radio h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="ml-2 text-gray-700">Price: Low to High</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="radio" 
                        name="sort" 
                        value="priceDesc" 
                        checked={sort === 'priceDesc'} 
                        onChange={() => setSort('priceDesc')}
                        className="form-radio h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="ml-2 text-gray-700">Price: High to Low</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                      <input 
                        type="radio" 
                        name="sort" 
                        value="newest" 
                        checked={sort === 'newest'} 
                        onChange={() => setSort('newest')}
                        className="form-radio h-4 w-4 text-primary border-gray-300 focus:ring-primary"
                      />
                      <span className="ml-2 text-gray-700">Newest First</span>
                    </label>
                  </div>
                </div>
                
                {/* Reset Filters */}
                {(searchQuery || selectedCategory !== 'All' || sort !== 'featured') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All');
                      setSort('featured');
                    }}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-md transition-colors font-medium text-sm"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>
            
            {/* Products Grid - Right Side */}
            <div className="flex-1">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-center text-red-600 py-8">{error}</div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-md">
                  <h2 className="text-2xl font-semibold text-gray-600">No products found</h2>
                  <p className="text-gray-500 mt-2">
                    {selectedCategory !== 'All' 
                      ? `No products available in the ${selectedCategory} category.` 
                      : 'No products available at the moment.'}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-md p-4 mb-6">
                  <div className="mb-4 flex justify-between items-center">
                    <p className="text-gray-600">
                      Showing {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, products.length)} of {products.length} products
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {currentItems.map((product) => {
                      const productRating = getProductRating(product.id);
                      
                      return (
                        <Link 
                          to={`/products/${product.id}`} 
                          key={product.id} 
                          className="group relative bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300"
                          onMouseEnter={() => handleProductHover(product.id, product.images)}
                          onMouseLeave={handleProductLeave}
                        >
                          {/* Product Image */}
                          <div className="aspect-square overflow-hidden relative">
                            {product.images && product.images.length > 0 ? (
                              product.images.length > 1 ? (
                                <div className="w-full h-full relative">
                                  <div 
                                    className="absolute top-0 left-0 flex transition-transform duration-500 ease-in-out h-full"
                                    style={{ 
                                      width: `${product.images.length * 100}%`,
                                      transform: `translateX(-${(carouselImageIndexes[product.id] || 0) * (100 / product.images.length)}%)` 
                                    }}
                                  >
                                    {product.images.map((image, index) => (
                                      <div 
                                        key={index} 
                                        className="h-full" 
                                        style={{ width: `${100 / product.images.length}%` }}
                                      >
                                        <img 
                                          src={image} 
                                          alt={`${product.name} ${index + 1}`} 
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <img 
                                  src={product.images[0]} 
                                  alt={product.name} 
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                              )
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <span className="text-gray-500 text-sm">No image</span>
                              </div>
                            )}
                            
                            {/* Carousel Indicators (show only when hovering and multiple images) */}
                            {hoverProductId === product.id && product.images && product.images.length > 1 && (
                              <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1 z-10">
                                {product.images.map((_, index) => (
                                  <div 
                                    key={index}
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      (carouselImageIndexes[product.id] || 0) === index 
                                        ? 'bg-white' 
                                        : 'bg-white/50'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                            
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
                          </div>
                          
                          {/* Product Info */}
                          <div className="p-3">
                            <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
                              {product.name}
                            </h3>
                            
                            <div className="mt-1 flex items-center">
                              <RatingDisplay rating={productRating.rating} size="small" />
                              {productRating.count > 0 && (
                                <span className="ml-1 text-xs text-gray-500">
                                  ({productRating.count})
                                </span>
                              )}
                            </div>
                            
                            <div className="mb-2">
                              {product.salePrice ? (
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-primary">{formatPrice(product.salePrice)}</span>
                                  <span className="text-xs text-gray-500 line-through">{formatPrice(product.price)}</span>
                                  <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                                    {Math.round((1 - product.salePrice / product.price) * 100)}% off
                                  </span>
                                </div>
                              ) : (
                                <span className="font-bold text-primary">{formatPrice(product.price)}</span>
                              )}
                            </div>
                            
                            {product.stock !== undefined && (
                              <p className={`text-xs ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-orange-500' : 'text-red-600'}`}>
                                {product.stock > 10 ? 'In Stock' : product.stock > 0 ? `Only ${product.stock} left` : 'Out of Stock'}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-8">
                      <nav className="flex items-center">
                        <button 
                          onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                          disabled={currentPage === 1}
                          className={`mx-1 px-3 py-1 rounded ${
                            currentPage === 1 
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                              : 'bg-white text-primary hover:bg-primary hover:text-white'
                          } border border-gray-300 transition-colors`}
                        >
                          <span className="sr-only">Previous</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        {/* Show page numbers */}
                        {[...Array(totalPages)].map((_, index) => {
                          const pageNumber = index + 1;
                          
                          // Display page numbers with limits for better UI
                          if (
                            pageNumber === 1 || 
                            pageNumber === totalPages || 
                            (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={pageNumber}
                                onClick={() => paginate(pageNumber)}
                                className={`mx-1 px-3 py-1 rounded ${
                                  currentPage === pageNumber
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-primary hover:bg-gray-100'
                                } border border-gray-300 transition-colors`}
                              >
                                {pageNumber}
                              </button>
                            );
                          }
                          
                          // Add ellipsis but avoid duplicates
                          if (
                            (pageNumber === currentPage - 2 && currentPage > 3) ||
                            (pageNumber === currentPage + 2 && currentPage < totalPages - 2)
                          ) {
                            return <span key={pageNumber} className="mx-1">...</span>;
                          }
                          
                          return null;
                        })}
                        
                        <button 
                          onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                          disabled={currentPage === totalPages}
                          className={`mx-1 px-3 py-1 rounded ${
                            currentPage === totalPages 
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                              : 'bg-white text-primary hover:bg-primary hover:text-white'
                          } border border-gray-300 transition-colors`}
                        >
                          <span className="sr-only">Next</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </>
  );
};

export default Products; 