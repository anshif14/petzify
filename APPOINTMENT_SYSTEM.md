# Petzify Doctor Appointment System

This document provides an overview of the doctor appointment booking system implemented in Petzify, explaining its components, flow, and how to use it.

## System Overview

The Petzify Doctor Appointment System allows:
- Patients to book appointments with veterinarians through a user-friendly interface
- Doctors to manage their availability by setting time slots
- Doctors to view and manage their appointments (confirm, complete, or cancel)
- The system maintains records in Firestore collections with appropriate security rules

## Database Schema

The system uses the following Firestore collections:

### admin
Stores user accounts, particularly doctors with their profile information.
- `username`: Unique identifier for the doctor
- `name`: Doctor's name
- `email`: Doctor's email
- `role`: Set to "doctor" for veterinarians
- `profileInfo`: Object containing doctor-specific fields like:
  - `specialization`: Doctor's specialization 
  - `experience`: Years of experience
  - `about`: Brief description
  - `consultationFee`: Fee per appointment
  - `workingDays`: Days of the week the doctor works

### doctorSlots
Stores availability slots created by doctors.
- `doctorId`: References the doctor's username
- `doctorName`: Doctor's display name
- `date`: Date of the slot (as Firestore Timestamp)
- `startTime`: Start time (e.g., "09:00")
- `endTime`: End time (e.g., "10:00")
- `isBooked`: Boolean indicating if the slot is booked
- `createdAt`: When the slot was created

### appointments
Stores appointment bookings made by patients.
- `doctorId`: References the doctor's username
- `doctorName`: Doctor's display name
- `slotId`: References the booked slot ID
- `patientName`: Patient's name
- `patientEmail`: Patient's email
- `patientPhone`: Patient's phone number
- `petName`: Name of the pet
- `petType`: Type of pet (e.g., Dog, Cat)
- `petBreed`: Breed of the pet
- `petAge`: Age of the pet
- `reason`: Reason for the appointment
- `notes`: Additional notes
- `appointmentDate`: Date of the appointment
- `startTime`: Start time
- `endTime`: End time
- `status`: Status of the appointment (pending, confirmed, completed, cancelled)
- `createdAt`: When the appointment was created
- `updatedAt`: When the appointment was last updated

## Components

### For Patients

#### DoctorBooking
Located at `/src/components/booking/DoctorBooking.jsx`

This component provides a 4-step booking process:
1. **Select Doctor**: Displays all available doctors with their details
2. **Choose Date & Time**: Calendar interface to select date and available time slots
3. **Fill Details**: Form to enter patient and pet information
4. **Confirmation**: Confirmation of the booking with details

Access this component at `/book-appointment` route.

### For Doctors

#### SlotManager
Located at `/src/components/admin/doctor/SlotManager.jsx`

This component allows doctors to:
- View their created time slots by date
- Add new availability slots with start and end times
- Delete slots that haven't been booked

#### AppointmentsList
Located at `/src/components/admin/doctor/AppointmentsList.jsx`

This component allows doctors to:
- View their appointments with filtering options (upcoming, today, past, all)
- Update appointment statuses (confirm, complete, cancel)
- See patient and pet details for each appointment

#### DoctorDashboard
Located at `/src/components/admin/doctor/DoctorDashboard.jsx`

This component provides:
- Statistics overview (total appointments, today's appointments, upcoming appointments, available slots)
- Tabs to access SlotManager and AppointmentsList components

## User Flow

### For Patients
1. Navigate to the "Book Appointment" page via the navbar
2. Select a doctor from the available list
3. Choose an available date and time slot
4. Fill in your details and your pet's information
5. Confirm the booking
6. Receive confirmation with appointment details

### For Doctors
1. Log in with doctor credentials at `/admin-login`
2. Upon successful login, you'll see the DoctorDashboard
3. Use the "Availability" tab to manage your time slots:
   - Add new slots for dates you're available
   - View and manage existing slots
4. Use the "Appointments" tab to:
   - View upcoming appointments
   - Confirm pending appointments
   - Mark appointments as completed after the visit
   - Cancel appointments if necessary

## Security

The system implements Firestore security rules to ensure:
- Doctors can only access their own appointments and slots
- Doctors can create and manage their availability slots
- Patients can book appointments but cannot modify doctor data
- Booked slots cannot be deleted

## Installation and Dependencies

The appointment system uses:
- React Calendar (`react-calendar` package) for date selection
- Firebase Firestore for data storage
- Tailwind CSS for styling

## Best Practices

1. **For Doctors**:
   - Create availability slots in advance to allow patients to book appointments
   - Regularly check for pending appointments and confirm them
   - Update appointment statuses promptly

2. **For Administrators**:
   - Create doctor accounts with the appropriate role and permissions
   - Ensure doctor profile information is complete and accurate
   - Monitor the system for any issues or improvements 