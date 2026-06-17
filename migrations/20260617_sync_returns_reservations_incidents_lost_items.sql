CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  date TEXT,
  time TEXT,
  vehicle_number TEXT,
  return_address TEXT,
  mileage INTEGER,
  fuel_level_text TEXT,
  parking_zone TEXT,
  memo TEXT,
  is_completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE returns ADD COLUMN date TEXT;
ALTER TABLE returns ADD COLUMN time TEXT;
ALTER TABLE returns ADD COLUMN vehicle_number TEXT;
ALTER TABLE returns ADD COLUMN return_address TEXT;
ALTER TABLE returns ADD COLUMN mileage INTEGER;
ALTER TABLE returns ADD COLUMN fuel_level_text TEXT;
ALTER TABLE returns ADD COLUMN parking_zone TEXT;
ALTER TABLE returns ADD COLUMN memo TEXT;
ALTER TABLE returns ADD COLUMN is_completed INTEGER DEFAULT 0;
ALTER TABLE returns ADD COLUMN updated_at DATETIME;

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  date TEXT,
  reservation_text TEXT,
  reserver_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accident_histories (
  id TEXT PRIMARY KEY,
  date TEXT,
  vehicle_number TEXT,
  accident_part TEXT,
  memo TEXT,
  is_completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_histories (
  id TEXT PRIMARY KEY,
  date TEXT,
  vehicle_number TEXT,
  maintenance_content TEXT,
  memo TEXT,
  is_completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lost_items (
  id TEXT PRIMARY KEY,
  date TEXT,
  vehicle_number TEXT,
  customer_name TEXT,
  memo TEXT,
  is_resolved INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE uploaded_files ADD COLUMN record_type TEXT;
ALTER TABLE uploaded_files ADD COLUMN record_id TEXT;
ALTER TABLE uploaded_files ADD COLUMN vehicle_number TEXT;
