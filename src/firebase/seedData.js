import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';
import { app } from './config';

// Function to seed sample slots data for testing
export const seedDoctorSlots = async () => {
  try {
    const db = getFirestore(app);
    
    // Get logged in doctor info
    const adminAuth = localStorage.getItem('adminAuth');
    if (!adminAuth) {
      console.error('No doctor logged in. Cannot seed data.');
      return false;
    }
    
    const admin = JSON.parse(adminAuth);
    const doctorId = admin.username;
    const doctorName = admin.name || admin.username;
    
    if (!doctorId) {
      console.error('No doctor ID found. Cannot seed data.');
      return false;
    }
    
    console.log('Starting to seed slot data for doctor:', doctorId);
    
    // Create dates for the next 7 days
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
    }
    
    // Create sample slots
    const slots = [];
    
    // For each date, create 3 slots
    for (const date of dates) {
      // Morning slot
      slots.push({
        doctorId,
        doctorName,
        date: Timestamp.fromDate(date),
        startTime: '09:00',
        endTime: '10:00',
        isBooked: false,
        createdAt: Timestamp.now()
      });
      
      // Afternoon slot
      slots.push({
        doctorId,
        doctorName,
        date: Timestamp.fromDate(date),
        startTime: '13:00',
        endTime: '14:00',
        isBooked: false,
        createdAt: Timestamp.now()
      });
      
      // Evening slot
      slots.push({
        doctorId,
        doctorName,
        date: Timestamp.fromDate(date),
        startTime: '16:00',
        endTime: '17:00',
        isBooked: false,
        createdAt: Timestamp.now()
      });
    }
    
    // Add slots to Firestore
    const results = await Promise.all(
      slots.map(slot => addDoc(collection(db, 'doctorSlots'), slot))
    );
    
    console.log(`Successfully seeded ${results.length} slots for doctor ${doctorId}`);
    return true;
  } catch (error) {
    console.error('Error seeding slots data:', error);
    return false;
  }
};

// Function to seed sample appointment data
export const seedAppointments = async () => {
  try {
    const db = getFirestore(app);
    
    // Get logged in doctor info
    const adminAuth = localStorage.getItem('adminAuth');
    if (!adminAuth) {
      console.error('No doctor logged in. Cannot seed appointment data.');
      return false;
    }
    
    const admin = JSON.parse(adminAuth);
    const doctorId = admin.username;
    const doctorName = admin.name || admin.username;
    
    if (!doctorId) {
      console.error('No doctor ID found. Cannot seed appointment data.');
      return false;
    }
    
    console.log('Starting to seed appointment data for doctor:', doctorId);
    
    // Create dates for today and tomorrow
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Create sample appointments
    const appointments = [
      {
        doctorId,
        doctorName,
        appointmentDate: Timestamp.fromDate(today),
        startTime: '11:00',
        endTime: '12:00',
        patientName: 'John Smith',
        patientEmail: 'john@example.com',
        patientPhone: '123-456-7890',
        petName: 'Max',
        petType: 'Dog',
        petBreed: 'Golden Retriever',
        petAge: '5 years',
        reason: 'Annual checkup',
        notes: 'No special concerns',
        status: 'confirmed',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      },
      {
        doctorId,
        doctorName,
        appointmentDate: Timestamp.fromDate(tomorrow),
        startTime: '14:00',
        endTime: '15:00',
        patientName: 'Sarah Johnson',
        patientEmail: 'sarah@example.com',
        patientPhone: '987-654-3210',
        petName: 'Whiskers',
        petType: 'Cat',
        petBreed: 'Siamese',
        petAge: '3 years',
        reason: 'Vaccination',
        notes: 'Cat is nervous around strangers',
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
    ];
    
    // Add appointments to Firestore
    const results = await Promise.all(
      appointments.map(appointment => addDoc(collection(db, 'appointments'), appointment))
    );
    
    console.log(`Successfully seeded ${results.length} appointments for doctor ${doctorId}`);
    return true;
  } catch (error) {
    console.error('Error seeding appointment data:', error);
    return false;
  }
}; 