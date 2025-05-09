import React, { useState, useEffect } from 'react';
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { toast } from 'react-toastify';

const GroomingServiceManager = ({ adminData }) => {
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newService, setNewService] = useState({ name: '', description: '', price: '', duration: 30 });
  const [newPackage, setNewPackage] = useState({ 
    name: '', 
    description: '', 
    price: '',
    services: [],
    discountPercentage: 0
  });
  const [editingService, setEditingService] = useState(null);
  const [editingPackage, setEditingPackage] = useState(null);
  const [addingService, setAddingService] = useState(false);
  const [addingPackage, setAddingPackage] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);

  useEffect(() => {
    if (adminData) {
      console.log("Admin data available for fetching services:", adminData);
      fetchServicesAndPackages();
    }
  }, [adminData]);

  const createDefaultServices = async (centerId) => {
    try {
      console.log("Creating default grooming services for center:", centerId);
      
      // Define default services
      const defaultServices = [
        {
          name: "Bathing",
          description: "Full bath with premium shampoo, conditioner and blow dry",
          price: 800,
          duration: 60,
          centerId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: "Haircut",
          description: "Professional haircut based on breed standard or owner preference",
          price: 1200,
          duration: 90,
          centerId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: "Nail Trimming",
          description: "Careful nail trimming to appropriate length",
          price: 400,
          duration: 30,
          centerId,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: "Nail Cutting",
          description: "Professional nail cutting with smooth finishing",
          price: 500,
          duration: 35,
          centerId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      // Add services to Firestore
      const addedServices = [];
      
      for (const service of defaultServices) {
        const serviceRef = await addDoc(collection(db, 'groomingServices'), service);
        addedServices.push({
          id: serviceRef.id,
          ...service
        });
      }
      
      console.log("Created default services:", addedServices);
      toast.success('Default services have been created');
      
      // Set services in state
      setServices(addedServices);
      
      // Create a default package
      const packageData = {
        name: "Complete Grooming Package",
        description: "Full grooming service including bath, haircut and nail trimming",
        price: 2000,
        originalValue: 2400, // Sum of individual services
        discountPercentage: 17,
        services: addedServices.map(service => ({
          id: service.id,
          name: service.name,
          price: service.price
        })),
        centerId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const packageRef = await addDoc(collection(db, 'groomingPackages'), packageData);
      
      const newPackage = {
        id: packageRef.id,
        ...packageData
      };
      
      console.log("Created default package:", newPackage);
      
      // Set package in state
      setPackages([newPackage]);
      
    } catch (error) {
      console.error('Error creating default services:', error);
      toast.error('Failed to create default services');
    }
  };

  const fetchServicesAndPackages = async () => {
    try {
      setLoading(true);
      
      if (!adminData || (!adminData.centerId && !adminData.groomingCenterId)) {
        console.error('Cannot find grooming center ID in admin data:', adminData);
        toast.error('Cannot find grooming center ID');
        setLoading(false);
        return;
      }
      
      const centerId = adminData.centerId || adminData.groomingCenterId;
      console.log("Using centerId for service query:", centerId);
      
      try {
        // First attempt - check if center exists
        const centerRef = doc(db, 'groomingCenters', centerId);
        const centerDoc = await getDoc(centerRef);
        console.log("Center exists:", centerDoc.exists(), centerDoc.data ? centerDoc.data() : null);
      } catch (error) {
        console.error("Error checking center:", error);
      }
      
      // Fetch services
      const servicesQuery = query(
        collection(db, 'groomingServices'),
        where('centerId', '==', centerId)
      );
      
      console.log("Executing services query...");
      const servicesSnapshot = await getDocs(servicesQuery);
      console.log("Services query result:", servicesSnapshot.size, "documents found");
      
      // If no services found, try fetching from global services
      if (servicesSnapshot.empty) {
        console.log("No center-specific services found, checking for default services...");
        // Try to fetch default services that might be globally available
        const defaultServicesQuery = query(
          collection(db, 'services'),
          where('type', '==', 'grooming')
        );
        
        const defaultSnapshot = await getDocs(defaultServicesQuery);
        console.log("Default services query result:", defaultSnapshot.size, "documents found");
        
        if (!defaultSnapshot.empty) {
          const servicesList = defaultSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            centerId: centerId  // Assign the current center ID
          }));
          console.log("Using default services:", servicesList);
          setServices(servicesList);
        } else {
          // No services found anywhere, show a prompt to create default services
          setServices([]);
          const shouldCreateDefault = window.confirm(
            "No services found for your grooming center. Would you like to create default services?"
          );
          
          if (shouldCreateDefault) {
            await createDefaultServices(centerId);
          }
        }
      } else {
        const servicesList = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log("Loaded center-specific services:", servicesList);
        setServices(servicesList);
      }
      
      // Fetch packages
      const packagesQuery = query(
        collection(db, 'groomingPackages'),
        where('centerId', '==', centerId)
      );
      
      console.log("Executing packages query...");
      const packagesSnapshot = await getDocs(packagesQuery);
      console.log("Packages query result:", packagesSnapshot.size, "documents found");
      
      const packagesList = packagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setPackages(packagesList);
      
    } catch (error) {
      console.error('Error fetching services and packages:', error);
      toast.error('Failed to load services and packages');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceChange = (e) => {
    const { name, value } = e.target;
    setNewService(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'duration' ? Number(value) || 0 : value
    }));
  };

  const handlePackageChange = (e) => {
    const { name, value } = e.target;
    setNewPackage(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'discountPercentage' ? Number(value) || 0 : value
    }));
  };

  const handleServiceSelection = (serviceId) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const addService = async (e) => {
    e.preventDefault();
    
    if (!newService.name || !newService.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const centerId = adminData.centerId || adminData.groomingCenterId;
      
      const serviceData = {
        name: newService.name,
        description: newService.description,
        price: Number(newService.price),
        duration: Number(newService.duration) || 30,
        centerId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const serviceRef = await addDoc(collection(db, 'groomingServices'), serviceData);
      
      setServices(prev => [...prev, { id: serviceRef.id, ...serviceData }]);
      setNewService({ name: '', description: '', price: '', duration: 30 });
      setAddingService(false);
      
      toast.success('Service added successfully');
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Failed to add service');
    }
  };

  const addPackage = async (e) => {
    e.preventDefault();
    
    if (!newPackage.name || !newPackage.price || selectedServices.length === 0) {
      toast.error('Please fill in all required fields and select at least one service');
      return;
    }
    
    try {
      const centerId = adminData.centerId || adminData.groomingCenterId;
      
      // Calculate total value of included services
      let totalServiceValue = 0;
      const includedServices = [];
      
      for (const serviceId of selectedServices) {
        const service = services.find(s => s.id === serviceId);
        if (service) {
          includedServices.push({
            id: service.id,
            name: service.name,
            price: service.price
          });
          totalServiceValue += service.price;
        }
      }
      
      const packageData = {
        name: newPackage.name,
        description: newPackage.description,
        price: Number(newPackage.price),
        originalValue: totalServiceValue,
        discountPercentage: Math.round(((totalServiceValue - newPackage.price) / totalServiceValue) * 100),
        services: includedServices,
        centerId,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const packageRef = await addDoc(collection(db, 'groomingPackages'), packageData);
      
      setPackages(prev => [...prev, { id: packageRef.id, ...packageData }]);
      setNewPackage({ name: '', description: '', price: '', services: [], discountPercentage: 0 });
      setSelectedServices([]);
      setAddingPackage(false);
      
      toast.success('Package added successfully');
    } catch (error) {
      console.error('Error adding package:', error);
      toast.error('Failed to add package');
    }
  };

  const startEditingService = (service) => {
    setEditingService(service);
    setNewService({
      name: service.name,
      description: service.description || '',
      price: service.price,
      duration: service.duration || 30
    });
    setAddingService(true);
  };

  const startEditingPackage = (packageItem) => {
    setEditingPackage(packageItem);
    setNewPackage({
      name: packageItem.name,
      description: packageItem.description || '',
      price: packageItem.price,
      discountPercentage: packageItem.discountPercentage || 0
    });
    setSelectedServices(packageItem.services.map(s => s.id));
    setAddingPackage(true);
  };

  const updateService = async (e) => {
    e.preventDefault();
    
    if (!newService.name || !newService.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const serviceRef = doc(db, 'groomingServices', editingService.id);
      
      const serviceData = {
        name: newService.name,
        description: newService.description,
        price: Number(newService.price),
        duration: Number(newService.duration) || 30,
        updatedAt: new Date()
      };
      
      await updateDoc(serviceRef, serviceData);
      
      setServices(prev => prev.map(service => 
        service.id === editingService.id 
          ? { ...service, ...serviceData } 
          : service
      ));
      
      setNewService({ name: '', description: '', price: '', duration: 30 });
      setEditingService(null);
      setAddingService(false);
      
      toast.success('Service updated successfully');
    } catch (error) {
      console.error('Error updating service:', error);
      toast.error('Failed to update service');
    }
  };

  const updatePackage = async (e) => {
    e.preventDefault();
    
    if (!newPackage.name || !newPackage.price || selectedServices.length === 0) {
      toast.error('Please fill in all required fields and select at least one service');
      return;
    }
    
    try {
      const packageRef = doc(db, 'groomingPackages', editingPackage.id);
      
      // Calculate total value of included services
      let totalServiceValue = 0;
      const includedServices = [];
      
      for (const serviceId of selectedServices) {
        const service = services.find(s => s.id === serviceId);
        if (service) {
          includedServices.push({
            id: service.id,
            name: service.name,
            price: service.price
          });
          totalServiceValue += service.price;
        }
      }
      
      const packageData = {
        name: newPackage.name,
        description: newPackage.description,
        price: Number(newPackage.price),
        originalValue: totalServiceValue,
        discountPercentage: Math.round(((totalServiceValue - newPackage.price) / totalServiceValue) * 100),
        services: includedServices,
        updatedAt: new Date()
      };
      
      await updateDoc(packageRef, packageData);
      
      setPackages(prev => prev.map(packageItem => 
        packageItem.id === editingPackage.id 
          ? { ...packageItem, ...packageData } 
          : packageItem
      ));
      
      setNewPackage({ name: '', description: '', price: '', services: [], discountPercentage: 0 });
      setSelectedServices([]);
      setEditingPackage(null);
      setAddingPackage(false);
      
      toast.success('Package updated successfully');
    } catch (error) {
      console.error('Error updating package:', error);
      toast.error('Failed to update package');
    }
  };

  const deleteService = async (serviceId) => {
    if (window.confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      try {
        // Check if service is used in any packages
        const serviceInPackages = packages.some(pkg => 
          pkg.services.some(s => s.id === serviceId)
        );
        
        if (serviceInPackages) {
          toast.error('Cannot delete this service as it is included in one or more packages');
          return;
        }
        
        await deleteDoc(doc(db, 'groomingServices', serviceId));
        setServices(prev => prev.filter(service => service.id !== serviceId));
        toast.success('Service deleted successfully');
      } catch (error) {
        console.error('Error deleting service:', error);
        toast.error('Failed to delete service');
      }
    }
  };

  const deletePackage = async (packageId) => {
    if (window.confirm('Are you sure you want to delete this package? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'groomingPackages', packageId));
        setPackages(prev => prev.filter(pkg => pkg.id !== packageId));
        toast.success('Package deleted successfully');
      } catch (error) {
        console.error('Error deleting package:', error);
        toast.error('Failed to delete package');
      }
    }
  };

  const cancelEdit = () => {
    setNewService({ name: '', description: '', price: '', duration: 30 });
    setNewPackage({ name: '', description: '', price: '', services: [], discountPercentage: 0 });
    setSelectedServices([]);
    setEditingService(null);
    setEditingPackage(null);
    setAddingService(false);
    setAddingPackage(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Services</h3>
          {!addingService && !addingPackage && (
            <button
              onClick={() => {
                setAddingService(true);
                setAddingPackage(false);
              }}
              className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Add Service
            </button>
          )}
        </div>
        
        {addingService && (
          <div className="bg-gray-50 rounded-md p-4 mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">
              {editingService ? 'Edit Service' : 'Add New Service'}
            </h4>
            <form onSubmit={editingService ? updateService : addService} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newService.name}
                    onChange={handleServiceChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (INR)
                  </label>
                  <input
                    type="number"
                    name="price"
                    min="0"
                    value={newService.price}
                    onChange={handleServiceChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    name="duration"
                    min="5"
                    value={newService.duration}
                    onChange={handleServiceChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={newService.description}
                    onChange={handleServiceChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  ></textarea>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  {editingService ? 'Update Service' : 'Add Service'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Services List */}
        {!addingService && !addingPackage && services.length > 0 && (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">
                    Service
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Description
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Duration
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">
                    Price
                  </th>
                  <th scope="col" className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {services.map(service => (
                  <tr key={service.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                      {service.name}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {service.description || 'No description'}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {service.duration || 30} minutes
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 text-right">
                      ₹{service.price}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium">
                      <button
                        onClick={() => startEditingService(service)}
                        className="text-primary hover:text-primary-dark mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteService(service.id)}
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
        
        {!addingService && !addingPackage && services.length === 0 && (
          <div className="bg-white rounded-md border border-gray-200 p-6">
            <p className="text-gray-500 text-center mb-4">No services added yet. You can add services manually or use our default services.</p>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setAddingService(true);
                  setAddingPackage(false);
                }}
                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
              >
                Add Service Manually
              </button>
              
              <button
                onClick={() => createDefaultServices(adminData.centerId || adminData.groomingCenterId)}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Create Default Services
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Packages Section */}
      <div className="mt-12">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Service Packages</h3>
          {!addingService && !addingPackage && (
            <button
              onClick={() => {
                setAddingPackage(true);
                setAddingService(false);
                setSelectedServices([]);
              }}
              className="px-3 py-1 text-sm bg-primary text-white rounded-md hover:bg-primary-dark"
              disabled={services.length === 0}
            >
              Create Package
            </button>
          )}
        </div>
        
        {services.length === 0 && !addingService && !addingPackage && (
          <div className="bg-white rounded-md border border-gray-200 p-6 text-center">
            <p className="text-gray-500">You need to add services before creating packages.</p>
          </div>
        )}
        
        {addingPackage && (
          <div className="bg-gray-50 rounded-md p-4 mb-6">
            <h4 className="text-md font-medium text-gray-800 mb-3">
              {editingPackage ? 'Edit Package' : 'Create New Package'}
            </h4>
            <form onSubmit={editingPackage ? updatePackage : addPackage} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Package Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newPackage.name}
                    onChange={handlePackageChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Package Price (INR)
                  </label>
                  <input
                    type="number"
                    name="price"
                    min="0"
                    value={newPackage.price}
                    onChange={handlePackageChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={newPackage.description}
                    onChange={handlePackageChange}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  ></textarea>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Services to Include
                </label>
                <div className="bg-white p-3 border border-gray-300 rounded-md max-h-48 overflow-y-auto">
                  {services.map(service => (
                    <div key={service.id} className="flex items-center py-1">
                      <input
                        type="checkbox"
                        id={`service-${service.id}`}
                        checked={selectedServices.includes(service.id)}
                        onChange={() => handleServiceSelection(service.id)}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      />
                      <label htmlFor={`service-${service.id}`} className="ml-2 block text-sm text-gray-900">
                        {service.name} - ₹{service.price}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedServices.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between text-sm">
                    <span>Total value of selected services:</span>
                    <span className="font-medium">
                      ₹{services
                        .filter(s => selectedServices.includes(s.id))
                        .reduce((total, service) => total + service.price, 0)}
                    </span>
                  </div>
                  {newPackage.price && (
                    <div className="flex justify-between text-sm mt-1">
                      <span>Discount:</span>
                      <span className="font-medium text-green-600">
                        {Math.round(((services
                          .filter(s => selectedServices.includes(s.id))
                          .reduce((total, service) => total + service.price, 0) - newPackage.price) / 
                          services
                            .filter(s => selectedServices.includes(s.id))
                            .reduce((total, service) => total + service.price, 0)) * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  disabled={selectedServices.length === 0}
                >
                  {editingPackage ? 'Update Package' : 'Create Package'}
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Packages List */}
        {!addingService && !addingPackage && packages.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map(pkg => (
              <div key={pkg.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h4 className="text-md font-medium text-gray-900">{pkg.name}</h4>
                    <div className="font-semibold text-primary text-lg">₹{pkg.price}</div>
                  </div>
                  {pkg.discountPercentage > 0 && (
                    <div className="mt-1 text-xs text-green-600">
                      Save {pkg.discountPercentage}% (₹{pkg.originalValue - pkg.price})
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {pkg.description && (
                    <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>
                  )}
                  <div className="mb-3">
                    <div className="text-xs text-gray-500 font-medium mb-1">Included Services:</div>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {pkg.services.map(service => (
                        <li key={service.id} className="flex justify-between">
                          <span>{service.name}</span>
                          <span className="text-gray-500">₹{service.price}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEditingPackage(pkg)}
                        className="text-primary hover:text-primary-dark"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deletePackage(pkg.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                    <div>
                      Total Value: ₹{pkg.originalValue}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!addingService && !addingPackage && services.length > 0 && packages.length === 0 && (
          <div className="bg-white rounded-md border border-gray-200 p-6 text-center">
            <p className="text-gray-500">No packages created yet. Click the "Create Package" button to bundle your services at special prices.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroomingServiceManager; 