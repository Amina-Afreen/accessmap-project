-- Create places table
CREATE TABLE places (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  address TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  accessibilityFeatures TEXT NOT NULL,
  rating REAL,
  placeType TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  userId TEXT
);

-- Create reviews table
CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  placeId INTEGER NOT NULL,
  userId TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  accessibilityFeatures TEXT NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (placeId) REFERENCES places (id)
);

-- Create user preferences table
CREATE TABLE userPreferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT NOT NULL UNIQUE,
  mobilityAid TEXT,
  visualNeeds BOOLEAN DEFAULT 0,
  hearingNeeds BOOLEAN DEFAULT 0,
  cognitiveNeeds BOOLEAN DEFAULT 0,
  preferredRouteType TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert some sample data for places
INSERT INTO places (name, lat, lng, address, phone, website, accessibilityFeatures, rating, placeType)
VALUES 
  ('Loyola Academy', 13.0412, 80.2339, 'Near Kishkintha, Raja Gopala Kandigai, Tharkas (Post) Erumaiyur, West Tambaram, Chennai - 600 044.', '+919145604423', 'www.loyola.edu.in', '["Ramp", "Automatic Doors", "Handrails"]', 4.5, 'education'),
  ('Bistrograph', 13.0382, 80.2321, 'Shastri Nagar, Adyar, Chennai, Tamil Nadu', '+919876543210', 'www.bistrograph.com', '["Accessible Washroom", "Ramp"]', 4.2, 'restaurant'),
  ('Nirmal Eye Hospital', 13.0501, 80.2183, 'Gandhi Road, Tambaram, Chennai, Tamil Nadu', '+919123456789', 'www.nirmaleyehospital.com', '["Elevator", "Wheelchair Access"]', 4.0, 'hospital'),
  ('Hindu Mission Hospital', 13.0456, 80.2167, 'Tambaram, Chennai, Tamil Nadu', '+919234567890', 'www.hindumissionhospital.org', '["Elevator", "Ramp", "Accessible Washroom"]', 4.3, 'hospital'),
  ('Tambaram Railway Station', 13.0478, 80.2198, 'Tambaram, Chennai, Tamil Nadu', null, null, '["Ramp", "Handrails"]', 3.8, 'transport');