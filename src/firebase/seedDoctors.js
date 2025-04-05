import { getFirestore, collection, getDocs, setDoc, doc, Timestamp } from 'firebase/firestore';
import { app } from './config';

// Function to seed doctor data for testing the booking system
export const seedDoctors = async () => {
  try {
    const db = getFirestore(app);
    
    // Check if we already have doctors
    const adminCollection = collection(db, 'admin');
    const querySnapshot = await getDocs(adminCollection);
    
    // Check if we have any doctors already in the database
    let hasDoctors = false;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.role === 'doctor') {
        hasDoctors = true;
      }
    });
    
    if (hasDoctors) {
      console.log('Doctors already exist in the database. Skipping seed operation.');
      return { success: true, message: 'Doctors already exist' };
    }
    
    // Define sample doctors
    const doctors = [
      {
        username: 'drsmith',
        name: 'John Smith',
        password: 'password123', // In a real app, never store plain text passwords
        role: 'doctor',
        permissions: {
          canViewAppointments: true,
          canManageSlots: true
        },
        profileInfo: {
          specialization: 'Small Animal Veterinarian',
          experience: '8 years',
          about: 'Dr. Smith specializes in the care of dogs, cats, and small pets. With 8 years of experience, he provides compassionate care for your beloved companions.',
          consultationFee: '₹1,500',
          workingDays: {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: false,
            sunday: false
          }
        }
      },
      {
        username: 'drpatel',
        name: 'Neha Patel',
        password: 'password123', // In a real app, never store plain text passwords
        role: 'doctor',
        permissions: {
          canViewAppointments: true,
          canManageSlots: true
        },
        profileInfo: {
          specialization: 'Feline Specialist',
          experience: '6 years',
          about: 'Dr. Patel has a special interest in feline medicine and behavior. She is dedicated to providing stress-free veterinary care for cats.',
          consultationFee: '₹1,200',
          workingDays: {
            monday: true,
            tuesday: true,
            wednesday: false,
            thursday: true,
            friday: true,
            saturday: true,
            sunday: false
          }
        }
      },
      {
        username: 'drsingh',
        name: 'Raj Singh',
        password: 'password123', // In a real app, never store plain text passwords
        role: 'doctor',
        permissions: {
          canViewAppointments: true,
          canManageSlots: true
        },
        profileInfo: {
          specialization: 'Exotic Pet Specialist',
          experience: '10 years',
          about: 'Dr. Singh specializes in exotic pet care including birds, reptiles, and small mammals. He has over a decade of experience working with unique pets.',
          consultationFee: '₹1,800',
          workingDays: {
            monday: false,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
            sunday: false
          }
        }
      }
    ];
    
    // Add doctors to Firestore
    for (const doctor of doctors) {
      await setDoc(doc(db, 'admin', doctor.username), doctor);
    }
    
    console.log(`Successfully seeded ${doctors.length} doctors`);
    return { success: true, message: `Added ${doctors.length} doctors` };
  } catch (error) {
    console.error('Error seeding doctor data:', error);
    return { success: false, message: error.message };
  }
};

// Function to seed time slots for all doctors
export const seedAllDoctorSlots = async () => {
  try {
    const db = getFirestore(app);
    
    // Get all doctors
    const adminCollection = collection(db, 'admin');
    const querySnapshot = await getDocs(adminCollection);
    
    const doctors = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.role === 'doctor') {
        doctors.push({
          username: data.username,
          name: data.name
        });
      }
    });
    
    if (doctors.length === 0) {
      console.log('No doctors found. Cannot seed slots.');
      return { success: false, message: 'No doctors found' };
    }
    
    // Create dates for the next 14 days
    const dates = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
    }
    
    let slotCount = 0;
    
    // For each doctor, create slots
    for (const doctor of doctors) {
      // Define time slots
      const timeSlots = [
        { startTime: '09:00', endTime: '09:30' },
        { startTime: '09:30', endTime: '10:00' },
        { startTime: '10:00', endTime: '10:30' },
        { startTime: '10:30', endTime: '11:00' },
        { startTime: '11:00', endTime: '11:30' },
        { startTime: '11:30', endTime: '12:00' },
        { startTime: '14:00', endTime: '14:30' },
        { startTime: '14:30', endTime: '15:00' },
        { startTime: '15:00', endTime: '15:30' },
        { startTime: '15:30', endTime: '16:00' },
        { startTime: '16:00', endTime: '16:30' },
        { startTime: '16:30', endTime: '17:00' }
      ];
      
      // For each date, create slots
      for (const date of dates) {
        for (const slot of timeSlots) {
          const slotDoc = {
            doctorId: doctor.username,
            doctorName: doctor.name,
            date: Timestamp.fromDate(date),
            startTime: slot.startTime,
            endTime: slot.endTime,
            isBooked: false,
            createdAt: Timestamp.now()
          };
          
          // Generate a unique ID for the slot
          const slotId = `${doctor.username}_${date.toISOString().split('T')[0]}_${slot.startTime}`;
          
          // Add the slot to Firestore
          await setDoc(doc(db, 'doctorSlots', slotId), slotDoc);
          slotCount++;
        }
      }
    }
    
    console.log(`Successfully seeded ${slotCount} slots for ${doctors.length} doctors`);
    return { success: true, message: `Added ${slotCount} slots for ${doctors.length} doctors` };
  } catch (error) {
    console.error('Error seeding slots data:', error);
    return { success: false, message: error.message };
  }
}; 