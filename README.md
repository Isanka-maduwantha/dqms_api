# DQMS appointment-system fixes

These files replace the old 30-minute slot assumption with date + period + appointment-number booking.

## Periods
- MORNING: 09:00-12:00, capacity 10
- AFTERNOON: 12:00-17:00, capacity 6
- EVENING: 17:00-22:00, capacity 20

Appointment numbers restart at 1 for every date + period and are never recycled after cancellation. Queue token numbers are separate and are assigned when a receptionist checks a booked patient in. Queue tokens are also sequential per date.

Emergency priority does not change appointment numbers or tokens. Receptionist priority is stored with `isPriority`, `priorityType`, `priorityMarkedAt`, and `priorityMarkedBy`, and the dentist queue calls priority arrivals first.

## Important fix for the reported Postman error
The canonical appointment-period helper is `helpers/appointmentPeriods.js`. Do not create or restore a singular `appointmentPeriod.js` helper.

## Postman
After replacing the files and restarting Node, use an authenticated request:

GET http://localhost:3000/api/appointments/available-slots?date=2026-09-02

Header:
Authorization: Bearer <PATIENT_JWT>

The response contains `periods`, each with `capacity`, `booked`, `remaining`, `nextAppointmentNumber`, `availableNumbers`, and `available`.

## Database indexes
The existing Appointment unique indexes must be present in MongoDB. Mongoose will normally create them when autoIndex is enabled. If this is a production database, review/synchronize indexes before deployment. The new `QueueTokenCounter` collection is created automatically when the first token is allocated.

## Frontend
No frontend RepoMix file was available as a readable upload in the working files at the time this package was created. Therefore this package deliberately does not invent or overwrite frontend files. The patient booking API expects `appointmentDate`, `appointmentPeriod`, `appointmentCategory`, and `visitPurpose`. `treatmentTypeId` is not required and patients do not select a specific DentalTreatment.

# Dental Queue / Appointment Logic Update

This package contains complete replacement files for the current project version supplied as:
- repomix backend(8).txt
- repomix frontend(5).txt

## New workflow

1. Patient books an appointment with only date and clinic period.
2. Patient booking no longer asks for Appointment Category or Visit Purpose.
3. The appointment is saved as BOOKED with appointmentCategory = null, visitPurpose = null and tokenNumber = null.
4. Receptionist clicks Check In and selects Visit Purpose.
5. The backend stores the purpose and generates the queue token.
6. No invoice is created during check-in.
7. Dentist end-treatment uses the existing billing flow:
   - NEW_TREATMENT -> invoice created after dentist completes treatment.
   - FOLLOW_UP -> no new invoice.
   - CHECKUP_SCREENING -> no new invoice.

## Backend changed
- controllers/appointmentController.js
- controllers/receptionistController.js
- controllers/billingService.js
- helpers/generateAppointmentSlipPdf.js
- models/Appointments.js

## Frontend changed
- src/features/patient/FindSlots.jsx
- src/features/patient/PatientDashboard.jsx
- src/features/receptionist/pages/QueuePage.jsx
- src/features/receptionist/services/receptionistApi.js
- src/features/extra/HelpSupportPage.jsx
- src/features/extra/MainPage.jsx

The receptionist appointment-booking page was intentionally left unchanged because the requested patient-side category/purpose selection is moved to receptionist check-in.
The existing dentist end-treatment billing implementation was preserved because it already creates invoices after treatment completion based on appointment.visitPurpose.
