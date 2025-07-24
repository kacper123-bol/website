# Aristoteles Apartments - Reservation System

## Overview

This is a complete reservation system for Aristoteles Apartments that includes:

- **Database Storage**: SQLite database to store all reservations
- **Date Conflict Checking**: Prevents double-booking by checking date overlaps
- **Enhanced Booking Form**: Includes personal information fields (first name, last name, email)
- **Real-time Availability**: Checks availability before allowing bookings
- **REST API**: Backend endpoints for managing reservations

## Features

### Database Schema
The system uses SQLite with the following reservation table structure:
- `id`: Primary key (auto-increment)
- `first_name`: Customer's first name
- `last_name`: Customer's last name
- `email`: Customer's email address
- `checkin_date`: Check-in date
- `checkout_date`: Check-out date
- `guests`: Number of guests
- `houses`: Number of houses booked
- `special_requests`: Additional requests
- `total_price`: Total booking price
- `created_at`: Timestamp of reservation creation
- `status`: Reservation status (default: 'confirmed')

### Date Conflict Logic
The system prevents double-booking by:
1. Checking for overlapping date ranges
2. Calculating total houses booked for requested dates
3. Ensuring available houses ≥ requested houses (max 4 houses total)
4. Returns `true` when dates are available, `false` when conflicts exist

### Enhanced Booking Form
The booking form (`booking-enhanced.html`) includes:
- **Personal Information**: First name, last name, email (all required)
- **Booking Details**: Check-in/out dates, guests, houses, special requests
- **Real-time Validation**: Date validation and availability checking
- **Price Calculation**: Automatic total calculation (€80 per house per night)
- **Two-step Process**: Check availability first, then book

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Server**:
   ```bash
   npm start
   # or
   node server.js
   ```

3. **Access the Booking Form**:
   Open your browser and go to: `http://localhost:3000`

## API Endpoints

### POST `/api/check-availability`
Check if dates are available for booking.

**Request Body**:
```json
{
  "checkinDate": "2024-07-15",
  "checkoutDate": "2024-07-20",
  "houses": 2
}
```

**Response**:
```json
{
  "available": true,
  "availableHouses": 4,
  "requestedHouses": 2,
  "message": "2 houses available for the selected dates"
}
```

### POST `/api/create-reservation`
Create a new reservation.

**Request Body**:
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "checkinDate": "2024-07-15",
  "checkoutDate": "2024-07-20",
  "guests": 4,
  "houses": 2,
  "specialRequests": "Ocean view preferred",
  "totalPrice": 800
}
```

**Response**:
```json
{
  "success": true,
  "reservationId": 1,
  "message": "Reservation created successfully"
}
```

### GET `/api/reservations`
Retrieve all reservations (for admin purposes).

### GET `/api/reservations/:id`
Retrieve specific reservation by ID.

## How It Works

1. **Customer fills out the form** with personal information and booking details
2. **System validates dates** and calculates pricing
3. **Customer clicks "Check Availability"** to verify dates are free
4. **System checks database** for conflicting reservations
5. **If available**, customer can proceed to "Book Now"
6. **System creates reservation** and stores in database
7. **Confirmation displayed** with reservation ID

## Database File
- The SQLite database file `reservations.db` is automatically created when the server starts
- All reservation data is stored locally in this file
- The database persists between server restarts

## Technical Details

- **Backend**: Node.js with Express.js
- **Database**: SQLite3
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Matches the original website design
- **Responsive**: Mobile-friendly design
- **Error Handling**: Comprehensive validation and error messages

## Testing the System

1. Start the server
2. Open `http://localhost:3000` in your browser
3. Fill out the booking form with:
   - Personal information (required)
   - Check-in and check-out dates
   - Number of guests and houses
4. Click "Check Availability"
5. If available, click "Book Now"
6. Verify the reservation was created successfully

## Conflict Resolution

The system handles booking conflicts by:
- Checking for date overlaps using SQL queries
- Summing total houses booked for overlapping periods
- Comparing against maximum capacity (4 houses)
- Providing clear feedback to users about availability

This ensures no double-booking can occur while maximizing booking opportunities.