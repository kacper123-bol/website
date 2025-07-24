const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files from current directory

// Initialize SQLite database
const db = new sqlite3.Database('./reservations.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        
        // Create reservations table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT NOT NULL,
            checkin_date DATE NOT NULL,
            checkout_date DATE NOT NULL,
            guests INTEGER NOT NULL,
            houses INTEGER NOT NULL,
            special_requests TEXT,
            total_price REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'confirmed'
        )`, (err) => {
            if (err) {
                console.error('Error creating table:', err.message);
            } else {
                console.log('Reservations table ready');
            }
        });
    }
});

// Utility function to check date overlap
function datesOverlap(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2;
}

// API endpoint to check availability
app.post('/api/check-availability', (req, res) => {
    const { checkinDate, checkoutDate, houses, guests } = req.body;
    
    if (!checkinDate || !checkoutDate || !houses) {
        return res.status(400).json({
            available: false,
            error: 'Missing required fields'
        });
    }

    // Convert dates to Date objects for comparison
    const requestedCheckin = new Date(checkinDate);
    const requestedCheckout = new Date(checkoutDate);
    
    // Validate dates
    if (requestedCheckout <= requestedCheckin) {
        return res.status(400).json({
            available: false,
            error: 'Checkout date must be after checkin date'
        });
    }

    // Validate guest capacity (5 guests per house maximum)
    if (guests && guests > houses * 5) {
        return res.status(400).json({
            available: false,
            error: `Maximum ${houses * 5} guests allowed for ${houses} house${houses > 1 ? 's' : ''} (5 guests per house)`
        });
    }

    // Check for overlapping reservations
    const query = `
        SELECT SUM(houses) as total_houses_booked
        FROM reservations
        WHERE status = 'confirmed'
        AND (
            (checkin_date < ? AND checkout_date > ?) OR
            (checkin_date < ? AND checkout_date > ?) OR
            (checkin_date >= ? AND checkout_date <= ?)
        )
    `;
    
    db.get(query, [
        checkoutDate, checkinDate,  // Check if existing reservation starts before checkout and ends after checkin
        checkoutDate, checkoutDate, // Check if existing reservation starts before checkout and ends after checkout
        checkinDate, checkoutDate   // Check if existing reservation is completely within requested period
    ], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({
                available: false,
                error: 'Database error'
            });
        }

        const totalHousesBooked = row.total_houses_booked || 0;
        const maxAvailableHouses = 4; // We have exactly 4 houses
        const availableHouses = maxAvailableHouses - totalHousesBooked;
        const isAvailable = availableHouses >= houses;

        res.json({
            available: isAvailable,
            availableHouses: availableHouses,
            requestedHouses: houses,
            message: isAvailable
                ? `${houses} house${houses > 1 ? 's' : ''} available for the selected dates (capacity: ${houses * 5} guests)`
                : availableHouses === 0
                    ? `No houses available for the specified dates. All 4 houses are booked.`
                    : `Only ${availableHouses} house${availableHouses !== 1 ? 's' : ''} available for the selected dates (requested: ${houses})`
        });
    });
});

// API endpoint to create a reservation
app.post('/api/create-reservation', (req, res) => {
    const { 
        firstName, 
        lastName, 
        email, 
        checkinDate, 
        checkoutDate, 
        guests, 
        houses, 
        specialRequests,
        totalPrice 
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !checkinDate || !checkoutDate || !guests || !houses || totalPrice === undefined) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields'
        });
    }

    // Validate guest capacity (5 guests per house maximum)
    if (guests > houses * 5) {
        return res.status(400).json({
            success: false,
            error: `Maximum ${houses * 5} guests allowed for ${houses} house${houses > 1 ? 's' : ''} (5 guests per house)`
        });
    }

    // Validate date logic
    const checkinDate_obj = new Date(checkinDate);
    const checkoutDate_obj = new Date(checkoutDate);
    if (checkoutDate_obj <= checkinDate_obj) {
        return res.status(400).json({
            success: false,
            error: 'Checkout date must be after checkin date'
        });
    }

    // First check availability again before creating reservation
    const checkQuery = `
        SELECT SUM(houses) as total_houses_booked
        FROM reservations
        WHERE status = 'confirmed'
        AND (
            (checkin_date < ? AND checkout_date > ?) OR
            (checkin_date < ? AND checkout_date > ?) OR
            (checkin_date >= ? AND checkout_date <= ?)
        )
    `;
    
    db.get(checkQuery, [
        checkoutDate, checkinDate,
        checkoutDate, checkoutDate,
        checkinDate, checkoutDate
    ], (err, row) => {
        if (err) {
            console.error('Database error during availability check:', err.message);
            return res.status(500).json({ 
                success: false, 
                error: 'Database error' 
            });
        }

        const totalHousesBooked = row.total_houses_booked || 0;
        const maxAvailableHouses = 4;
        const availableHouses = maxAvailableHouses - totalHousesBooked;

        if (availableHouses < houses) {
            return res.status(409).json({ 
                success: false, 
                error: `Only ${availableHouses} house${availableHouses !== 1 ? 's' : ''} available for the selected dates` 
            });
        }

        // Create the reservation
        const insertQuery = `
            INSERT INTO reservations (
                first_name, last_name, email, checkin_date, checkout_date, 
                guests, houses, special_requests, total_price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(insertQuery, [
            firstName, lastName, email, checkinDate, checkoutDate,
            guests, houses, specialRequests || '', totalPrice
        ], function(err) {
            if (err) {
                console.error('Database error during reservation creation:', err.message);
                return res.status(500).json({ 
                    success: false, 
                    error: 'Failed to create reservation' 
                });
            }

            res.json({
                success: true,
                reservationId: this.lastID,
                message: 'Reservation created successfully'
            });
        });
    });
});

// API endpoint to get all reservations (for admin purposes)
app.get('/api/reservations', (req, res) => {
    const query = `
        SELECT * FROM reservations 
        ORDER BY created_at DESC
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        
        res.json(rows);
    });
});

// API endpoint to get reservation by ID
app.get('/api/reservations/:id', (req, res) => {
    const { id } = req.params;
    
    const query = `SELECT * FROM reservations WHERE id = ?`;
    
    db.get(query, [id], (err, row) => {
        if (err) {
            console.error('Database error:', err.message);
            return res.status(500).json({ error: 'Database error' });
        }
        
        if (!row) {
            return res.status(404).json({ error: 'Reservation not found' });
        }
        
        res.json(row);
    });
});

// Serve the booking page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'booking-enhanced.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Database: reservations.db');
    console.log('Available endpoints:');
    console.log('  GET  / - Booking form');
    console.log('  POST /api/check-availability - Check date availability');
    console.log('  POST /api/create-reservation - Create new reservation');
    console.log('  GET  /api/reservations - Get all reservations');
    console.log('  GET  /api/reservations/:id - Get specific reservation');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});