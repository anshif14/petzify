import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app, db } from '../../../firebase/config';
import jsPDF from 'jspdf/dist/jspdf.umd.min';
import logoImage from '../../../assets/images/logo_text.png';

const PrescriptionManager = ({ appointment, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState(null); // 'upload' or 'create'
  const [selectedFile, setSelectedFile] = useState(null);
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [medications, setMedications] = useState([{ name: '', dosage: '', frequency: '', duration: '' }]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchDoctorInfo = async () => {
      if (!appointment?.doctorId) return;
      
      try {
        const docRef = doc(db, 'doctors', appointment.doctorId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setDoctorInfo(docSnap.data());
        }
      } catch (error) {
        console.error('Error fetching doctor info:', error);
        setError('Failed to load doctor information');
      }
    };
    
    fetchDoctorInfo();
  }, [appointment]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size should be less than 5MB');
      return;
    }
    
    setSelectedFile(file);
    setError('');
  };

  const handleAddMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handleRemoveMedication = (index) => {
    if (medications.length === 1) return;
    const updatedMedications = [...medications];
    updatedMedications.splice(index, 1);
    setMedications(updatedMedications);
  };

  const handleMedicationChange = (index, field, value) => {
    const updatedMedications = [...medications];
    updatedMedications[index][field] = value;
    setMedications(updatedMedications);
  };

  const generatePDF = async () => {
    try {
      setLoading(true);
      setMessage('Generating PDF...');
      
      // Create a new jsPDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Add header
      pdf.setFontSize(22);
      pdf.setTextColor(65, 105, 225); // Blue color for header
      pdf.text('Dr. ' + (doctorInfo?.name || 'Doctor Name'), 105, 20, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.text(doctorInfo?.specialization || 'Qualification', 105, 28, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text('Certification: ' + (doctorInfo?.licenseNumber || 'License #'), 105, 35, { align: 'center' });
      
      // Add divider line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, 40, 190, 40);
      
      // Add patient info
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.text(`Patient Name: ${appointment.patientName}`, 20, 50);
      pdf.text(`Pet Name: ${appointment.petName || 'N/A'}`, 20, 58);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 150, 50);
      
      // Add Rx symbol
      pdf.setTextColor(65, 105, 225);
      pdf.setFontSize(18);
      pdf.text('Rx', 20, 75);
      
      // Add medications table header
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setDrawColor(220, 220, 220);
      
      const tableTop = 85;
      const columnWidths = [50, 40, 40, 40];
      const headerTexts = ['Medication', 'Dosage', 'Frequency', 'Duration'];
      
      // Draw header
      pdf.setFillColor(240, 240, 240);
      pdf.rect(20, tableTop - 6, 170, 8, 'F');
      
      let currentX = 20;
      for (let i = 0; i < headerTexts.length; i++) {
        pdf.text(headerTexts[i], currentX + 2, tableTop);
        currentX += columnWidths[i];
      }
      
      // Draw medication rows
      let currentY = tableTop + 10;
      medications.forEach((med, index) => {
        currentX = 20;
        
        pdf.text(med.name || '', currentX + 2, currentY);
        currentX += columnWidths[0];
        
        pdf.text(med.dosage || '', currentX + 2, currentY);
        currentX += columnWidths[1];
        
        pdf.text(med.frequency || '', currentX + 2, currentY);
        currentX += columnWidths[2];
        
        pdf.text(med.duration || '', currentX + 2, currentY);
        
        currentY += 10;
        pdf.line(20, currentY - 5, 190, currentY - 5);
      });
      
      // Add notes
      currentY += 5;
      pdf.setFontSize(14);
      pdf.text('Notes:', 20, currentY);
      
      pdf.setFontSize(11);
      currentY += 8;
      pdf.text('Take medications as prescribed. Contact for any concerns.', 20, currentY);
      
      // Add footer
      const footerY = 270;
      pdf.line(20, footerY - 15, 190, footerY - 15);
      
      pdf.setFontSize(10);
      pdf.text('Petzify', 20, footerY);
      pdf.text('Your trusted pet healthcare partner', 20, footerY + 5);
      pdf.text('www.petzify.com', 20, footerY + 10);
      
      // Add signature line
      pdf.line(140, footerY, 180, footerY);
      pdf.text("Doctor's Signature", 160, footerY + 5, { align: 'center' });
      
      // Convert PDF to blob
      const pdfOutput = pdf.output('arraybuffer');
      const pdfBlob = new Blob([pdfOutput], { type: 'application/pdf' });
      
      return pdfBlob;
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF');
      setLoading(false);
      return null;
    }
  };

  const handleUploadPrescription = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }
    
    try {
      setLoading(true);
      setMessage('Uploading prescription...');
      
      // Validate required appointment data
      if (!appointment.id) {
        setError('Invalid appointment data: missing appointment ID');
        setLoading(false);
        return;
      }
      
      const storage = getStorage(app);
      const timestamp = new Date().getTime();
      const fileName = `prescriptions/${appointment.id}_${timestamp}.pdf`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Prepare document data with safety checks
      const docData = {
        appointmentId: appointment.id,
        doctorId: appointment.doctorId || 'unknown',
        doctorName: doctorInfo?.name || 'Unknown Doctor',
        patientName: appointment.patientName || 'Unknown Patient',
        petName: appointment.petName || 'N/A',
        prescriptionURL: downloadURL,
        filePath: fileName,
        type: 'uploaded',
        createdAt: serverTimestamp()
      };
      
      // Add patientId only if it exists
      if (appointment.patientId) {
        docData.patientId = appointment.patientId;
      }
      
      // Add record to Firestore
      await addDoc(collection(db, 'doctorPrescriptions'), docData);
      
      setMessage('Prescription uploaded successfully');
      setLoading(false);
      if (onSuccess) onSuccess();
      
      // Close modal after short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Error uploading prescription:', error);
      setError('Failed to upload prescription');
      setLoading(false);
    }
  };

  const handleCreatePrescription = async () => {
    // Validate medications
    const isValid = medications.every(med => med.name && med.dosage && med.frequency && med.duration);
    if (!isValid) {
      setError('Please fill all medication details');
      return;
    }
    
    // Validate required appointment data
    if (!appointment.id) {
      setError('Invalid appointment data: missing appointment ID');
      return;
    }
    
    try {
      setLoading(true);
      
      // Generate PDF
      const pdfBlob = await generatePDF();
      if (!pdfBlob) {
        setError('Failed to generate prescription');
        setLoading(false);
        return;
      }
      
      // Upload PDF to storage
      const storage = getStorage(app);
      const timestamp = new Date().getTime();
      const fileName = `prescriptions/${appointment.id}_${timestamp}.pdf`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, pdfBlob);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Prepare document data with safety checks
      const docData = {
        appointmentId: appointment.id,
        doctorId: appointment.doctorId || 'unknown',
        doctorName: doctorInfo?.name || 'Unknown Doctor',
        patientName: appointment.patientName || 'Unknown Patient',
        petName: appointment.petName || 'N/A',
        prescriptionURL: downloadURL,
        filePath: fileName,
        medications: medications,
        type: 'generated',
        createdAt: serverTimestamp()
      };
      
      // Add patientId only if it exists
      if (appointment.patientId) {
        docData.patientId = appointment.patientId;
      }
      
      // Add record to Firestore
      await addDoc(collection(db, 'doctorPrescriptions'), docData);
      
      setMessage('Prescription created and saved successfully');
      setLoading(false);
      if (onSuccess) onSuccess();
      
      // Close modal after short delay
      setTimeout(() => {
        if (onClose) onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Error creating prescription:', error);
      setError('Failed to create prescription');
      setLoading(false);
    }
  };

  if (!appointment) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Prescription</h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {message && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
              {message}
            </div>
          )}
          
          {!uploadMode && (
            <div className="flex flex-col space-y-4">
              <div className="bg-blue-50 p-4 rounded mb-4">
                <h3 className="font-medium text-blue-800 mb-2">Appointment Information</h3>
                <p><span className="font-medium">Patient:</span> {appointment.patientName}</p>
                <p><span className="font-medium">Pet:</span> {appointment.petName || 'N/A'}</p>
                <p><span className="font-medium">Date:</span> {appointment.appointmentDate?.toLocaleDateString()}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setUploadMode('upload')}
                  className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Upload Prescription</h3>
                    <p className="mt-1 text-xs text-gray-500">Upload existing PDF prescription</p>
                  </div>
                </button>
                
                <button
                  onClick={() => setUploadMode('create')}
                  className="flex items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Create Prescription</h3>
                    <p className="mt-1 text-xs text-gray-500">Generate new prescription</p>
                  </div>
                </button>
              </div>
            </div>
          )}
          
          {uploadMode === 'upload' && (
            <div className="space-y-4">
              <button
                onClick={() => setUploadMode(null)}
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  id="prescription-file"
                  onChange={handleFileChange}
                  disabled={loading}
                />
                <label
                  htmlFor="prescription-file"
                  className="cursor-pointer block text-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    {selectedFile ? selectedFile.name : 'Select PDF file'}
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    PDF up to 5MB
                  </span>
                </label>
              </div>
              
              {selectedFile && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleUploadPrescription}
                    disabled={loading}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light disabled:bg-gray-400"
                  >
                    {loading ? 'Uploading...' : 'Upload Prescription'}
                  </button>
                </div>
              )}
            </div>
          )}
          
          {uploadMode === 'create' && (
            <div className="space-y-4">
              <button
                onClick={() => setUploadMode(null)}
                className="text-blue-600 hover:text-blue-800 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              
              <div className="bg-gray-100 p-4 rounded">
                <h3 className="font-medium mb-4">Medication Details</h3>
                
                {medications.map((med, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-3 bg-white rounded">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Medication</label>
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                        placeholder="Medicine name"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                        placeholder="e.g. 100mg"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                        placeholder="e.g. Twice daily"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                      <input
                        type="text"
                        value={med.duration}
                        onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)}
                        placeholder="e.g. 7 days"
                        className="w-full p-2 border rounded"
                      />
                    </div>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedication(index)}
                        className="md:col-span-4 text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={handleAddMedication}
                  className="mt-2 flex items-center text-primary hover:text-primary-dark"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Another Medication
                </button>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleCreatePrescription}
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light disabled:bg-gray-400"
                >
                  {loading ? 'Generating Prescription...' : 'Generate & Save Prescription'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrescriptionManager; 