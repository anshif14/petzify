import React, { useState, useEffect, useRef } from 'react';
import { getFirestore, collection, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '../../firebase/config';

const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formMode, setFormMode] = useState('add'); // 'add' or 'edit'
  const [currentProduct, setCurrentProduct] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(null);
  const [categories, setCategories] = useState([
    'Food', 'Toys', 'Accessories', 'Grooming', 'Health', 'Clothing', 'Beds', 'Carriers', 'Training'
  ]);
  
  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    salePrice: '',
    category: '',
    stock: '',
    featured: false,
    images: [],
    specifications: [{ key: '', value: '' }],
    tags: []
  });
  
  // File inputs
  const fileInputRef = useRef(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  
  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
  }, []);
  
  // Fetch products from Firestore
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const db = getFirestore(app);
      const productsCollection = collection(db, 'products');
      const snapshot = await getDocs(productsCollection);
      
      const productsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setProducts(productsList);
    } catch (error) {
      console.error('Error fetching products:', error);
      setMessage('Failed to load products. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked
      });
    } else if (name === 'price' || name === 'salePrice' || name === 'stock') {
      // Allow only numbers and a single decimal point for price fields
      const regex = /^[0-9]*\.?[0-9]*$/;
      if (value === '' || regex.test(value)) {
        setFormData({
          ...formData,
          [name]: value
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // Handle specification changes
  const handleSpecificationChange = (index, field, value) => {
    const newSpecifications = [...formData.specifications];
    newSpecifications[index][field] = value;
    
    setFormData({
      ...formData,
      specifications: newSpecifications
    });
  };
  
  // Add new specification field
  const addSpecification = () => {
    setFormData({
      ...formData,
      specifications: [...formData.specifications, { key: '', value: '' }]
    });
  };
  
  // Remove specification field
  const removeSpecification = (index) => {
    const newSpecifications = [...formData.specifications];
    newSpecifications.splice(index, 1);
    
    setFormData({
      ...formData,
      specifications: newSpecifications
    });
  };
  
  // Handle tags input
  const handleTagsInput = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = e.target.value.trim();
      
      if (tag && !formData.tags.includes(tag)) {
        setFormData({
          ...formData,
          tags: [...formData.tags, tag]
        });
        e.target.value = '';
      }
    }
  };
  
  // Remove tag
  const removeTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };
  
  // Handle image file selection
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Limit to 5 images max
    const totalImages = imageFiles.length + files.length;
    if (totalImages > 5) {
      setMessage('You can upload maximum 5 images per product');
      setMessageType('error');
      return;
    }
    
    // Create preview URLs
    const newImageFiles = [...imageFiles, ...files];
    setImageFiles(newImageFiles);
    
    const newPreviewUrls = [...imagePreviewUrls];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviewUrls.push(reader.result);
        setImagePreviewUrls([...newPreviewUrls]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  // Remove image
  const removeImage = (index) => {
    const newImageFiles = [...imageFiles];
    const newPreviewUrls = [...imagePreviewUrls];
    
    newImageFiles.splice(index, 1);
    newPreviewUrls.splice(index, 1);
    
    setImageFiles(newImageFiles);
    setImagePreviewUrls(newPreviewUrls);
  };
  
  // Upload images to Firebase Storage
  const uploadImages = async () => {
    const storage = getStorage(app);
    const imageUrls = [];
    
    for (const file of imageFiles) {
      const timestamp = new Date().getTime();
      const storageRef = ref(storage, `products/${timestamp}_${file.name}`);
      
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      imageUrls.push(downloadUrl);
    }
    
    return imageUrls;
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      salePrice: '',
      category: '',
      stock: '',
      featured: false,
      images: [],
      specifications: [{ key: '', value: '' }],
      tags: []
    });
    setImageFiles([]);
    setImagePreviewUrls([]);
    setFormMode('add');
    setCurrentProduct(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const db = getFirestore(app);
      
      // Basic validation
      if (!formData.name || !formData.description || !formData.price || !formData.category) {
        setMessage('Please fill out all required fields');
        setMessageType('error');
        setLoading(false);
        return;
      }
      
      // Upload images if there are any new ones
      let productImages = formData.images || [];
      if (imageFiles.length > 0) {
        const uploadedImageUrls = await uploadImages();
        productImages = [...productImages, ...uploadedImageUrls];
      }
      
      // Format price and salePrice as numbers
      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
        category: formData.category,
        stock: parseInt(formData.stock) || 0,
        featured: formData.featured,
        images: productImages,
        specifications: formData.specifications.filter(spec => spec.key.trim() !== '' && spec.value.trim() !== ''),
        tags: formData.tags,
        updatedAt: serverTimestamp()
      };
      
      if (formMode === 'add') {
        // Add new product
        productData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'products'), productData);
        setMessage('Product added successfully');
      } else if (formMode === 'edit' && currentProduct) {
        // Update existing product
        await updateDoc(doc(db, 'products', currentProduct.id), productData);
        setMessage('Product updated successfully');
      }
      
      setMessageType('success');
      resetForm();
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      setMessage('Failed to save product. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle edit product
  const handleEditProduct = (product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price ? product.price.toString() : '',
      salePrice: product.salePrice ? product.salePrice.toString() : '',
      category: product.category || '',
      stock: product.stock ? product.stock.toString() : '',
      featured: product.featured || false,
      images: product.images || [],
      specifications: product.specifications?.length > 0 ? product.specifications : [{ key: '', value: '' }],
      tags: product.tags || []
    });
    setImageFiles([]);
    setImagePreviewUrls([]);
    setFormMode('edit');
  };
  
  // Handle delete product
  const handleDeleteProduct = async (productId, images = []) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    setLoading(true);
    try {
      const db = getFirestore(app);
      const storage = getStorage(app);
      
      // Delete product from Firestore
      await deleteDoc(doc(db, 'products', productId));
      
      // Delete images from Storage
      for (const imageUrl of images) {
        try {
          // Extract storage path from URL
          const imagePath = imageUrl.split('products%2F')[1].split('?')[0];
          const imageRef = ref(storage, `products/${decodeURIComponent(imagePath)}`);
          await deleteObject(imageRef);
        } catch (imageError) {
          console.error('Error deleting image:', imageError);
        }
      }
      
      setMessage('Product deleted successfully');
      setMessageType('success');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      setMessage('Failed to delete product. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Product Management</h2>
      
      {messageType && (
        <div className={`p-4 mb-6 rounded ${messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">
              {formMode === 'add' ? 'Add New Product' : 'Edit Product'}
            </h3>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Basic Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name*
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description*
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  ></textarea>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price*
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                      <input
                        type="text"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sale Price
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
                      <input
                        type="text"
                        name="salePrice"
                        value={formData.salePrice}
                        onChange={handleInputChange}
                        className="w-full pl-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category*
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock
                    </label>
                    <input
                      type="text"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="featured"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <label htmlFor="featured" className="ml-2 block text-sm text-gray-700">
                    Featured Product
                  </label>
                </div>
                
                {/* Images */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Images (Max 5)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    ref={fileInputRef}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  
                  {/* Image Previews */}
                  {(formData.images.length > 0 || imagePreviewUrls.length > 0) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.images.map((imageUrl, index) => (
                        <div key={`existing-${index}`} className="relative w-20 h-20">
                          <img 
                            src={imageUrl} 
                            alt={`Product ${index + 1}`} 
                            className="w-full h-full object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = [...formData.images];
                              newImages.splice(index, 1);
                              setFormData({...formData, images: newImages});
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      
                      {imagePreviewUrls.map((previewUrl, index) => (
                        <div key={`new-${index}`} className="relative w-20 h-20">
                          <img 
                            src={previewUrl} 
                            alt={`New ${index + 1}`} 
                            className="w-full h-full object-cover rounded-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Specifications */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Specifications
                    </label>
                    <button
                      type="button"
                      onClick={addSpecification}
                      className="text-sm text-primary hover:text-primary-dark"
                    >
                      + Add Specification
                    </button>
                  </div>
                  
                  {formData.specifications.map((spec, index) => (
                    <div key={index} className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        value={spec.key}
                        onChange={(e) => handleSpecificationChange(index, 'key', e.target.value)}
                        placeholder="Name"
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="text"
                        value={spec.value}
                        onChange={(e) => handleSpecificationChange(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeSpecification(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (Press Enter or Comma to add)
                  </label>
                  <input
                    type="text"
                    onKeyDown={handleTagsInput}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.tags.map((tag, index) => (
                        <span 
                          key={index} 
                          className="bg-gray-100 px-2 py-1 rounded-full text-sm flex items-center"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-gray-500 hover:text-gray-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Submit Buttons */}
                <div className="flex justify-end space-x-2 pt-4">
                  {formMode === 'edit' && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  )}
                  
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : formMode === 'add' ? 'Add Product' : 'Update Product'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
        
        {/* Products List Section */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <h3 className="text-lg font-medium text-gray-800">Products List</h3>
            </div>
            
            {loading && products.length === 0 ? (
              <div className="p-6 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                <p className="text-gray-500">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No products found. Add your first product.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {product.images && product.images.length > 0 ? (
                                <img 
                                  src={product.images[0]} 
                                  alt={product.name} 
                                  className="h-10 w-10 object-cover rounded-md"
                                />
                              ) : (
                                <div className="h-10 w-10 bg-gray-200 rounded-md flex items-center justify-center text-gray-500">
                                  No img
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {product.name}
                              </div>
                              {product.featured && (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.category}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {product.salePrice ? (
                            <div>
                              <span className="text-sm line-through text-gray-500">${product.price.toFixed(2)}</span>
                              <span className="text-sm font-medium text-green-600 ml-2">${product.salePrice.toFixed(2)}</span>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-900">${product.price.toFixed(2)}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{product.stock || 0}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="text-primary hover:text-primary-dark mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.images)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductManager; 