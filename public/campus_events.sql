CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  organizerName TEXT NOT NULL,
  category TEXT NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  venue TEXT NOT NULL,
  image TEXT, -- This can store the image filename or URL
  description TEXT NOT NULL,
  capacity INTEGER NOT NULL
);
CREATE TABLE registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eventId INTEGER NOT NULL,
  userName TEXT NOT NULL,
  userEmail TEXT NOT NULL,
  FOREIGN KEY (eventId) REFERENCES events(id)
);
