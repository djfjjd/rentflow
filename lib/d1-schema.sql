-- Cloudflare D1 Schema for RentFlow

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  role TEXT NOT NULL,
  login_id TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '재직',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT,
  device_alias TEXT,
  device_model TEXT,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  device_owner_type TEXT NOT NULL DEFAULT 'personal',
  office_pc_type TEXT,
  location TEXT,
  os TEXT,
  browser TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT '승인대기',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_seen_at TEXT,
  trusted INTEGER NOT NULL DEFAULT 0,
  auto_login INTEGER NOT NULL DEFAULT 0,
  approved_by TEXT,
  approved_at TEXT,
  deleted_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (device_id) REFERENCES devices(id)
);

CREATE TABLE IF NOT EXISTS login_logs (
  id TEXT PRIMARY KEY,
  email TEXT,
  login_id TEXT,
  role TEXT,
  device_id TEXT,
  ip TEXT,
  user_agent TEXT,
  status TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  device_id TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  plate_number TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  color TEXT,
  fuel_type TEXT NOT NULL,
  fuel_level REAL NOT NULL DEFAULT 0,
  fuel_display TEXT,
  mileage INTEGER NOT NULL DEFAULT 0,
  purchase_date TEXT,
  company_type TEXT,
  location TEXT DEFAULT '본사 주차장',
  status TEXT NOT NULL DEFAULT '대기중',
  damage_vehicle TEXT,
  active_summary TEXT,
  sort_order INTEGER DEFAULT 0,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Dispatches table
CREATE TABLE IF NOT EXISTS dispatches (
  id TEXT PRIMARY KEY,
  date TEXT,
  start_date TEXT,
  end_date TEXT,
  duration_days INTEGER DEFAULT 1,
  time TEXT,
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
  fuel_display TEXT,
  fuel_level_text TEXT,
  vehicle_color TEXT,
  business_type TEXT,
  corporate_vehicle INTEGER DEFAULT 0,
  is_corporate INTEGER DEFAULT 0,
  notes TEXT,
  memo TEXT,
  status TEXT NOT NULL DEFAULT '배차등록',
  intake_type TEXT,
  uploaded_at DATETIME,
  is_completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Returns table
CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  date TEXT,
  time TEXT,
  vehicle_number TEXT,
  rental_car_number TEXT,
  return_address TEXT,
  arrival_address TEXT,
  parking_zone TEXT,
  fuel_level REAL,
  fuel_display TEXT,
  fuel_level_text TEXT,
  vehicle_color TEXT,
  mileage INTEGER,
  notes TEXT,
  memo TEXT,
  status TEXT NOT NULL DEFAULT '회차등록',
  is_completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  date TEXT,
  time TEXT,
  end_time TEXT,
  vehicle_number TEXT,
  rent_car_number TEXT,
  customer_name TEXT,
  reserver_name TEXT,
  reservation_text TEXT,
  customer_car_number TEXT,
  customer_car_model TEXT,
  factory_name TEXT,
  pickup_location TEXT,
  delivery_location TEXT,
  order_person TEXT,
  memo TEXT,
  route TEXT,
  repair_shop_partner_id TEXT,
  status TEXT NOT NULL DEFAULT '예약',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  file_type TEXT,
  record_type TEXT,
  record_id TEXT,
  vehicle_folder_url TEXT,
  insurance_folder_url TEXT,
  customer_folder_url TEXT,
  uploaded_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Maintenance Histories table
CREATE TABLE IF NOT EXISTS maintenance_histories (
  id TEXT PRIMARY KEY,
  date TEXT,
  vehicle_number TEXT,
  maintenance_content TEXT,
  vehicle_id TEXT,
  plate_number TEXT,
  maintenance_type TEXT,
  title TEXT,
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
  is_completed INTEGER DEFAULT 0,
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
  date TEXT,
  vehicle_number TEXT,
  vehicle_id TEXT,
  plate_number TEXT,
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
  is_completed INTEGER DEFAULT 0,
  linked_dispatch_id TEXT,
  linked_return_id TEXT,
  linked_smart_inbox_item_id TEXT,
  memo TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Partner Addresses table
CREATE TABLE IF NOT EXISTS partner_addresses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  manager_name TEXT,
  phone TEXT,
  address TEXT NOT NULL,
  detail_address TEXT,
  naver_map_url TEXT,
  latitude REAL,
  longitude REAL,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  dispatch_id TEXT,
  title TEXT,
  customer_name TEXT,
  vehicle_number TEXT,
  document_url TEXT,
  status TEXT DEFAULT '작성중',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Billings table
CREATE TABLE IF NOT EXISTS billings (
  id TEXT PRIMARY KEY,
  dispatch_id TEXT,
  contract_title TEXT,
  amount REAL DEFAULT 0,
  fault_rate TEXT,
  tax_invoice_status TEXT,
  receivable_status TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Receivables table
CREATE TABLE IF NOT EXISTS receivables (
  id TEXT PRIMARY KEY,
  billing_id TEXT,
  customer_name TEXT,
  amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  status TEXT DEFAULT '입금대기',
  due_date TEXT,
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lost Items table
CREATE TABLE IF NOT EXISTS lost_items (
  id TEXT PRIMARY KEY,
  date TEXT,
  vehicle_number TEXT,
  item_name TEXT,
  customer_name TEXT,
  found_date TEXT,
  found_location TEXT,
  storage_location TEXT,
  photo_url TEXT,
  memo TEXT,
  status TEXT DEFAULT '보관중',
  is_completed INTEGER DEFAULT 0,
  is_resolved INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Repair Shops table
CREATE TABLE IF NOT EXISTS repair_shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat REAL,
  lng REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create some indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_dispatches_rental_car_number ON dispatches(rental_car_number);
CREATE INDEX IF NOT EXISTS idx_returns_rental_car_number ON returns(rental_car_number);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(date);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_number ON maintenance(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_maintenance_histories_plate_number ON maintenance_histories(plate_number);
CREATE INDEX IF NOT EXISTS idx_accident_histories_plate_number ON accident_histories(plate_number);
CREATE INDEX IF NOT EXISTS idx_partner_addresses_name ON partner_addresses(name);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_vehicle_number ON uploaded_files(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_insurance_number ON uploaded_files(insurance_number);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_record ON uploaded_files(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_lost_items_vehicle_number ON lost_items(vehicle_number);
CREATE INDEX IF NOT EXISTS idx_repair_shops_name ON repair_shops(name);
