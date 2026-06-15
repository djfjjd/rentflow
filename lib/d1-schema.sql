-- Cloudflare D1 Schema for RentFlow

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  plate_number TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  fuel_level REAL NOT NULL DEFAULT 0,
  mileage INTEGER NOT NULL DEFAULT 0,
  location TEXT DEFAULT '본사 주차장',
  status TEXT NOT NULL DEFAULT '대기중',
  sort_order INTEGER DEFAULT 0,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dispatches table
CREATE TABLE IF NOT EXISTS dispatches (
  id TEXT PRIMARY KEY,
  claim_number TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_car_number TEXT,
  customer_car_model TEXT,
  rental_car_number TEXT,
  ordered_by TEXT,
  repair_shop TEXT,
  repair_shop_partner_id TEXT,
  repair_shop_phone TEXT,
  repair_shop_manager_name TEXT,
  pickup_address TEXT,
  delivery_address TEXT,
  fuel_level REAL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT '배차등록',
  intake_type TEXT,
  uploaded_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Returns table
CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  rental_car_number TEXT NOT NULL,
  return_address TEXT,
  arrival_address TEXT,
  fuel_level REAL,
  mileage INTEGER,
  notes TEXT,
  status TEXT NOT NULL DEFAULT '회차등록',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  end_time TEXT,
  vehicle_number TEXT,
  rent_car_number TEXT,
  customer_name TEXT NOT NULL,
  customer_car_number TEXT,
  factory_name TEXT,
  pickup_location TEXT,
  delivery_location TEXT,
  order_person TEXT,
  memo TEXT,
  route TEXT,
  repair_shop_partner_id TEXT,
  status TEXT NOT NULL DEFAULT '예약',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance (Pending/Current) table
CREATE TABLE IF NOT EXISTS maintenance (
  id TEXT PRIMARY KEY,
  vehicle_number TEXT NOT NULL,
  title TEXT NOT NULL,
  requested_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '정비대기',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Uploaded Files table
CREATE TABLE IF NOT EXISTS uploaded_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  r2_url TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  drive_backup_status TEXT,
  drive_file_id TEXT,
  drive_url TEXT,
  drive_folder_id TEXT,
  drive_folder_url TEXT,
  vehicle_number TEXT,
  insurance_number TEXT,
  customer_name TEXT,
  intake_type TEXT,
  vehicle_folder_url TEXT,
  insurance_folder_url TEXT,
  customer_folder_url TEXT,
  uploaded_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Histories table
CREATE TABLE IF NOT EXISTS maintenance_histories (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT,
  plate_number TEXT NOT NULL,
  maintenance_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  repair_shop_id TEXT,
  repair_shop_name TEXT,
  found_date TEXT,
  scheduled_date TEXT,
  completed_date TEXT,
  mileage INTEGER,
  cost REAL DEFAULT 0,
  priority TEXT DEFAULT '보통',
  status TEXT DEFAULT '정비필요',
  photos TEXT, -- JSON string array
  videos TEXT, -- JSON string array
  documents TEXT, -- JSON string array
  linked_dispatch_id TEXT,
  linked_return_id TEXT,
  linked_smart_inbox_item_id TEXT,
  memo TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Accident Histories table
CREATE TABLE IF NOT EXISTS accident_histories (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT,
  plate_number TEXT NOT NULL,
  insurance_number TEXT,
  accident_date TEXT,
  accident_location TEXT,
  accident_type TEXT,
  accident_part TEXT,
  description TEXT,
  customer_name TEXT,
  customer_car_number TEXT,
  customer_car_model TEXT,
  insurance_company TEXT,
  repair_shop_id TEXT,
  repair_shop_name TEXT,
  repair_cost REAL DEFAULT 0,
  claim_amount REAL DEFAULT 0,
  photos TEXT, -- JSON string array
  videos TEXT, -- JSON string array
  documents TEXT, -- JSON string array
  status TEXT DEFAULT '접수',
  linked_dispatch_id TEXT,
  linked_return_id TEXT,
  linked_smart_inbox_item_id TEXT,
  memo TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create some indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_dispatches_rental_car_number ON dispatches(rental_car_number);
CREATE INDEX IF NOT EXISTS idx_returns_rental_car_number ON returns(rental_car_number);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_number ON maintenance(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_maintenance_histories_plate_number ON maintenance_histories(plate_number);
CREATE INDEX IF NOT EXISTS idx_accident_histories_plate_number ON accident_histories(plate_number);
