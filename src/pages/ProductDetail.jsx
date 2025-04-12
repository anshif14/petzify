import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '../firebase/config';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { useAlert } from '../context/AlertContext';

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useAlert();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const db = getFirestore(app);
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        
        if (productSnap.exists()) {
          setProduct({
            id: productSnap.id,
            ...productSnap.data()
          });
        } else {
          setError('Product not found');
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError('Failed to load product details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (productId) {
      fetchProduct();
    }
  }, [productId]);
  
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };
  
  const addToCart = () => {
    try {
      let cart = JSON.parse(localStorage.getItem('cart')) || [];
      const existingProductIndex = cart.findIndex(item => item.id === product.id);
      
      if (existingProductIndex >= 0) {
        cart[existingProductIndex].quantity += quantity;
        showSuccess(`Added ${quantity} more ${product.name} to your cart`, 'Product Added');
      } else {
        cart.push({
          id: product.id,
          productId: product.id,
          name: product.name,
          price: product.salePrice || product.price,
          image: product.images && product.images.length > 0 ? product.images[0] : null,
          quantity: quantity
        });
        showSuccess(`${product.name} added to your cart!`, 'Product Added');
      }
      
      localStorage.setItem('cart', JSON.stringify(cart));
      
      // Dispatch the cartUpdated event for the Navbar
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      console.error('Error adding to cart:', err);
      showError('Could not add product to cart', 'Error');
    }
  };
  
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value > 0) {
      setQuantity(value);
    }
  };
  
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }
  
  if (error || !product) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">{error || 'Product not found'}</h2>
          <button 
            onClick={() => navigate('/products')}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
          >
            Back to Products
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex mb-8 text-sm text-gray-500">
            <button onClick={() => navigate('/')} className="hover:text-primary">Home</button>
            <span className="mx-2">/</span>
            <button onClick={() => navigate('/products')} className="hover:text-primary">Products</button>
            <span className="mx-2">/</span>
            <span className="text-gray-700">{product.name}</span>
          </nav>
          
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
              {/* Product Images */}
              <div>
                <div className="aspect-w-1 aspect-h-1 mb-4 bg-gray-100 rounded-lg overflow-hidden">
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={product.images[activeImage]} 
                      alt={product.name} 
                      className="w-full h-full object-center object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <span className="text-gray-500">No image available</span>
                    </div>
                  )}
                </div>
                
                {/* Thumbnail Images */}
                {product.images && product.images.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {product.images.map((image, index) => (
                      <button 
                        key={index} 
                        onClick={() => setActiveImage(index)}
                        className={`w-20 h-20 flex-shrink-0 border-2 rounded-md overflow-hidden ${
                          activeImage === index ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <img 
                          src={image} 
                          alt={`${product.name} ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Product Info */}
              <div className="flex flex-col">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{product.name}</h1>
                <p className="text-sm text-gray-500 mb-4">{product.category}</p>
                
                <div className="mb-4">
                  {product.salePrice ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-primary">{formatPrice(product.salePrice)}</span>
                      <span className="text-lg text-gray-500 line-through">{formatPrice(product.price)}</span>
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        {Math.round((1 - product.salePrice / product.price) * 100)}% OFF
                      </span>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-primary">{formatPrice(product.price)}</span>
                  )}
                </div>
                
                <div className="prose prose-sm text-gray-700 mb-6">
                  <p>{product.description}</p>
                </div>
                
                {/* Specifications */}
                {product.specifications && product.specifications.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Specifications</h3>
                    <div className="bg-gray-50 rounded-md p-4">
                      <dl className="divide-y divide-gray-200">
                        {product.specifications.map((spec, index) => (
                          <div key={index} className="py-2 grid grid-cols-3 gap-4">
                            <dt className="text-sm font-medium text-gray-500">{spec.key}</dt>
                            <dd className="text-sm text-gray-900 col-span-2">{spec.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>
                )}
                
                {/* Stock */}
                {product.stock !== undefined && (
                  <div className="mb-4">
                    <p className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
                    </p>
                  </div>
                )}
                
                {/* Add to Cart */}
                <div className="mt-auto">
                  <div className="flex items-center space-x-4 mb-4">
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                      Quantity
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      min="1"
                      value={quantity}
                      onChange={handleQuantityChange}
                      className="w-20 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                    />
                  </div>
                  
                  <button
                    onClick={addToCart}
                    disabled={product.stock <= 0}
                    className="w-full bg-primary text-white py-3 px-6 rounded-md hover:bg-primary-dark transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

    </>
  );
};

export default ProductDetail; 