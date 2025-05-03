# Doctor Appointment System Database Schema

This document outlines the Firestore database schema for the Petzify doctor appointment system. It describes the collections, documents, and fields used to manage doctor profiles, availability, and appointments.

## Collections

### 1. admin

This collection stores basic user accounts including those with the "doctor" role.

**Document Structure:**
```
admin/{adminId}
```

**Fields:**
- `name` (string): The doctor's full name
- `username` (string): Unique username for login
- `email` (string): Doctor's email address
- `password` (string): Password (hashed in a production environment)
- `role` (string): Set to "doctor" for veterinarians
- `phone` (string): Contact phone number
- `permissions` (map):
  - `canEditContacts` (boolean): Permission to edit contact information
  - `canManageMessages` (boolean): Permission to manage messages
  - `canManageUsers` (boolean): Permission to manage other users
  - `canEditProfile` (boolean): Permission to edit their own profile
- `createdAt` (timestamp): When the account was created
- `updatedAt` (timestamp): When the account was last updated

### 2. doctordetails

This collection stores detailed profile information for doctors.

**Document Structure:**
```
doctordetails/{username}
```

**Fields:**
- `username` (string): Reference to the doctor's username (same as in admin)
- `name` (string): The doctor's full name
- `specialization` (string): Veterinary specialization (e.g., "Surgery", "Dermatology")
- `experience` (string): Years of professional experience
- `qualifications` (string): Educational background and certifications
- `about` (string): Biographical information
- `consultationFee` (string): Fee charged for consultations
- `workingDays` (map): Days of the week the doctor is available
  - `monday` (boolean)
  - `tuesday` (boolean)
  - `wednesday` (boolean)
  - `thursday` (boolean)
  - `friday` (boolean)
  - `saturday` (boolean)
  - `sunday` (boolean)
- `photoURL` (string): URL to doctor's profile photo
- `photoStoragePath` (string): Firebase Storage path to the profile photo
- `certificates` (array): List of certificate objects
  - `url` (string): URL to the certificate
  - `storagePath` (string): Firebase Storage path to the certificate
  - `name` (string): Name of the certificate file
  - `type` (string): Type of certificate (e.g., "image", "pdf")
- `degrees` (array): List of degree strings (e.g., "DVM", "BVSc")
- `designations` (array): List of role/designation strings (e.g., "Chief Veterinarian")
- `averageRating` (number): Average rating from all reviews (calculated)
- `reviewCount` (number): Total number of reviews received
- `updatedAt` (timestamp): When the profile was last updated

### 3. doctorSlots

This collection stores the availability slots for each doctor.

**Document Structure:**
```
doctorSlots/{slotId}
```

**Fields:**
- `doctorId` (string): Reference to the doctor's username
- `doctorName` (string): Doctor's name for display purposes
- `date` (timestamp): Date of the availability slot
- `startTime` (string): Start time of the slot (e.g., "09:00")
- `endTime` (string): End time of the slot (e.g., "09:30")
- `isBooked` (boolean): Whether the slot is booked or available
- `createdAt` (timestamp): When the slot was created

### 4. appointments

This collection stores appointment bookings made by patients.

**Document Structure:**
```
appointments/{appointmentId}
```

**Fields:**
- `doctorId` (string): Reference to the doctor's username
- `doctorName` (string): Doctor's name
- `slotId` (string): Reference to the booked slot ID
- `patientId` (string): Reference to the patient's ID (if authenticated)
- `patientName` (string): Patient's name
- `patientEmail` (string): Patient's email address
- `patientPhone` (string): Patient's phone number
- `petName` (string): Name of the pet
- `petType` (string): Type of pet (e.g., dog, cat)
- `petBreed` (string): Breed of the pet
- `petAge` (string): Age of the pet
- `reason` (string): Reason for the appointment
- `notes` (string): Additional notes from the patient
- `appointmentDate` (timestamp): Date of the appointment
- `startTime` (string): Start time of the appointment
- `endTime` (string): End time of the appointment
- `status` (string): Status of the appointment (pending, confirmed, cancelled, completed)
- `isReviewed` (boolean): Whether the appointment has been reviewed
- `createdAt` (timestamp): When the appointment was created
- `updatedAt` (timestamp): When the appointment was last updated

### 5. doctorReviews

This collection stores reviews and ratings for doctors submitted by patients after appointments.

**Document Structure:**
```
doctorReviews/{reviewId}
```

**Fields:**
- `doctorId` (string): Reference to the doctor's username
- `doctorName` (string): Doctor's name
- `appointmentId` (string): Reference to the appointment
- `patientId` (string): Reference to the patient's email
- `patientName` (string): Patient's name 
- `petName` (string): Name of the pet that received care
- `petType` (string): Type of pet
- `rating` (number): Star rating from 1-5
- `review` (string): Text review content
- `reviewImageUrl` (string): URL to an image attached to the review (optional)
- `reviewDate` (timestamp): Date when the review was submitted
- `appointmentDate` (timestamp): Date of the appointment being reviewed
- `hidden` (boolean): Whether the review is hidden from public view (for moderation)

## Queries

### Common Queries for Doctor Dashboard

1. **Doctor's Upcoming Appointments**
   ```javascript
   query(
     collection(db, 'appointments'),
     where('doctorId', '==', doctorId),
     where('appointmentDate', '>=', Timestamp.fromDate(now)),
     orderBy('appointmentDate', 'asc')
   )
   ```

2. **Doctor's Availability Slots for a Specific Date**
   ```javascript
   query(
     collection(db, 'doctorSlots'),
     where('doctorId', '==', doctorId),
     where('date', '>=', startOfDay),
     where('date', '<=', endOfDay)
   )
   ```

3. **Get Doctor Details**
   ```javascript
   query(
     collection(db, 'doctordetails'),
     where('username', '==', doctorId)
   )
   ```

4. **Get Doctor Reviews**
   ```javascript
   query(
     collection(db, 'doctorReviews'),
     where('doctorId', '==', doctorId),
     where('hidden', '==', false),
     orderBy('reviewDate', 'desc')
   )
   ```

## Relationships

- Admin document with role="doctor" references a doctordetails document using the username field
- A doctor (identified by username) can have multiple availability slots (doctorSlots documents)
- Each availability slot (doctorSlots document) can be booked for one appointment (appointments document)
- A patient can have multiple appointments with different doctors
- An appointment can have one review in the doctorReviews collection

## Security Rules

```javascript
match /databases/{database}/documents {
  // Admin document rules
  match /admin/{adminId} {
    allow read: if true;
    allow write: if request.auth != null && 
                   (request.auth.uid == adminId || 
                    get(/databases/$(database)/documents/admin/$(request.auth.uid)).data.role == 'superadmin');
  }
  
  // Doctor details rules
  match /doctordetails/{username} {
    allow read: if true;
    allow write: if request.auth != null && 
                   (request.auth.uid == username || 
                    get(/databases/$(database)/documents/admin/$(request.auth.uid)).data.role == 'superadmin');
  }
  
  // Doctor slots rules
  match /doctorSlots/{slotId} {
    allow read: if true;
    allow create, update: if request.auth != null && 
                             (request.resource.data.doctorId == request.auth.uid || 
                              get(/databases/$(database)/documents/admin/$(request.auth.uid)).data.role == 'superadmin');
    allow delete: if request.auth != null && 
                     (resource.data.doctorId == request.auth.uid || 
                      get(/databases/$(database)/documents/admin/$(request.auth.uid)).data.role == 'superadmin');
  }
  
  // Appointments rules
  match /appointments/{appointmentId} {
    allow read: if request.auth != null && 
                   (resource.data.doctorId == request.auth.uid || 
                    resource.data.patientId == request.auth.uid || 
                    get(/databases/$(database)/documents/admin/$(request.auth.uid)).data.role == 'superadmin');
    allow create: if true; // Allow anyone to book an appointment
    allow update, delete: if request.auth != null && 
                             (resource.data.doctorId == request.auth.uid || 
                              resource.data.patientId == request.auth.uid || 
                              get(/databases/$(database)/documents/admin/$(request.auth.uid)).data.role == 'superadmin');
  }
  
  // Doctor reviews rules
  match /doctorReviews/{reviewId} {
    allow read: if true;
    allow create: if request.auth != null && request.resource.data.patientId == request.auth.uid;
    allow update, delete: if request.auth != null && 
                             (resource.data.patientId == request.auth.uid || 
                              get(/databases/$(database)/documents/admin/$(request.auth.uid)).data.role == 'superadmin');
  }
}
```

## Indexes

The following composite indexes should be created for efficient queries:

1. Collection: `appointments`
   - Fields: `doctorId` (Ascending), `appointmentDate` (Ascending)

2. Collection: `doctorSlots`
   - Fields: `doctorId` (Ascending), `date` (Ascending)

3. Collection: `appointments`
   - Fields: `patientId` (Ascending), `appointmentDate` (Ascending)
   
4. Collection: `doctorReviews`
   - Fields: `doctorId` (Ascending), `reviewDate` (Descending)

## Best Practices

1. Always update the `isBooked` field of a doctorSlot when an appointment is created or cancelled
2. Include proper error handling for slot conflicts (double bookings)
3. Implement transaction operations when creating appointments to ensure slot availability
4. Set up Cloud Functions to handle appointment notifications and reminders
5. Regularly audit and clean up expired slots 
6. Use Cloud Functions to update the doctor's average rating when a new review is submitted 