const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// In-memory event store (replace with DB in production)
let events = [];
let nextId = 1;

app.use(cors());
app.use(bodyParser.json());

// GET all events
app.get('/api/events', (req, res) => {
    res.json(events);
});

// POST create event
app.post('/api/events', (req, res) => {
    const {
        title, category, organizerName, startDate, endDate,
        startTime, endTime, venue, description, capacity, image
    } = req.body;

    // Basic validation
    if (!title || !category || !organizerName || !startDate || !endDate ||
        !startTime || !endTime || !venue || !description || !capacity || !image) {
        return res.status(400).send('Missing required event fields.');
    }

    const event = {
        id: nextId++,
        title,
        category,
        organizerName,
        startDate,
        endDate,
        startTime,
        endTime,
        venue,
        description,
        capacity,
        image
    };
    events.push(event);
    res.status(201).json(event);
});

// DELETE event by id
app.delete('/api/events/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const idx = events.findIndex(e => e.id === id);
    if (idx === -1) {
        return res.status(404).send('Event not found.');
    }
    events.splice(idx, 1);
    res.status(204).send();
});

// Health check
app.get('/api/health', (req, res) => {
    res.send('OK');
});

// Optional: Add a root route for /
app.get('/', (req, res) => {
    res.send('CampusEvents API is running.');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});