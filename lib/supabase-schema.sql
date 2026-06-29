-- Supabase schema draft for shared mobile PWA and admin web ERP.
-- Auth users are stored in auth.users. app_profiles links roles and employee metadata.

create type app_role as enum ('admin', 'staff', 'driver');
create type vehicle_status as enum ('대기중', '배차중', '회차중', '고객이용중', '정비필요', '정비예약', '정비중', '사고', '휴차');
create type report_type as enum ('배차보고', '출발보고', '도착보고', '회차보고');
create type document_status as enum ('작성중', '검토중', '완료');
create type partner_type as enum ('정비공장', '공업사', '보험사', '렌터카업체', '탁송거점', '거래처', '기타');
create type partner_status as enum ('사용중', '사용중지');

create table app_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'driver',
  name text not null,
  phone text,
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table vehicles (
  id uuid primary key default gen_random_uuid(),
  plate_number text not null unique,
  model text not null,
  fuel_type text not null,
  fuel_level numeric not null default 0,
  mileage integer not null default 0,
  current_location text,
  status vehicle_status not null default '대기중',
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table partners (
  id uuid primary key default gen_random_uuid(),
  type partner_type not null default '거래처',
  name text not null,
  business_number text,
  manager_name text,
  phone text,
  mobile text,
  fax text,
  email text,
  address text,
  detail_address text,
  region text,
  memo text,
  tags text[] not null default '{}',
  status partner_status not null default '사용중',
  favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partners_type_idx on partners(type);
create index partners_region_idx on partners(region);
create index partners_name_idx on partners(name);

create table dispatches (
  id uuid primary key default gen_random_uuid(),
  claim_number text,
  customer_name text not null,
  customer_phone text,
  customer_car_number text,
  customer_car_model text,
  rental_vehicle_id uuid references vehicles(id),
  repair_shop_partner_id uuid references partners(id),
  ordered_by text,
  repair_shop text,
  pickup_address text,
  delivery_address text,
  fuel_level numeric,
  notes text,
  assigned_staff_id uuid references app_profiles(id),
  status text not null default '배차등록',
  created_at timestamptz not null default now()
);

create table returns (
  id uuid primary key default gen_random_uuid(),
  rental_vehicle_id uuid references vehicles(id),
  return_address text,
  arrival_address text,
  fuel_level numeric,
  mileage integer,
  notes text,
  assigned_staff_id uuid references app_profiles(id),
  status text not null default '회차등록',
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  report_type report_type not null,
  dispatch_id uuid references dispatches(id) on delete cascade,
  return_id uuid references returns(id) on delete cascade,
  body text not null,
  copied_at timestamptz,
  created_by uuid references app_profiles(id),
  created_at timestamptz not null default now()
);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id),
  repair_shop_partner_id uuid references partners(id),
  customer_name text not null,
  start_date date,
  end_date date,
  duration_days integer default 1,
  starts_at timestamptz not null,
  ends_at timestamptz,
  route text,
  status text not null default '예약',
  created_at timestamptz not null default now()
);

create table maintenance_jobs (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references vehicles(id),
  title text not null,
  requested_at date not null default current_date,
  scheduled_at timestamptz,
  status text not null default '정비대기',
  notes text,
  created_at timestamptz not null default now()
);

create table maintenance_histories (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id),
  plate_number text not null,
  maintenance_type text not null,
  title text not null,
  description text,
  repair_shop_id uuid references partners(id),
  repair_shop_name text,
  found_date date,
  scheduled_date date,
  completed_date date,
  mileage integer,
  cost numeric not null default 0,
  priority text not null default '보통',
  status text not null default '정비필요',
  photos text[] not null default '{}',
  videos text[] not null default '{}',
  documents text[] not null default '{}',
  linked_dispatch_id uuid references dispatches(id),
  linked_return_id uuid references returns(id),
  linked_smart_inbox_item_id uuid,
  memo text,
  created_by uuid references app_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table accident_histories (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id),
  plate_number text not null,
  insurance_number text,
  accident_date date,
  accident_location text,
  accident_type text,
  accident_part text,
  description text,
  customer_name text,
  customer_car_number text,
  customer_car_model text,
  insurance_company text,
  repair_shop_id uuid references partners(id),
  repair_shop_name text,
  repair_cost numeric not null default 0,
  claim_amount numeric not null default 0,
  photos text[] not null default '{}',
  videos text[] not null default '{}',
  documents text[] not null default '{}',
  status text not null default '접수',
  linked_dispatch_id uuid references dispatches(id),
  linked_return_id uuid references returns(id),
  linked_smart_inbox_item_id uuid,
  memo text,
  created_by uuid references app_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_profiles(id),
  title text not null,
  message text not null,
  type text not null,
  related_entity_type text,
  related_entity_id uuid,
  scheduled_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  status text not null default '예정',
  created_at timestamptz not null default now()
);

create table vehicle_revenues (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references vehicles(id),
  plate_number text not null,
  period text not null,
  rental_revenue numeric not null default 0,
  claim_revenue numeric not null default 0,
  extra_revenue numeric not null default 0,
  total_revenue numeric not null default 0,
  maintenance_cost numeric not null default 0,
  fuel_cost numeric not null default 0,
  toll_cost numeric not null default 0,
  parking_cost numeric not null default 0,
  penalty_cost numeric not null default 0,
  insurance_cost numeric not null default 0,
  tax_cost numeric not null default 0,
  other_cost numeric not null default 0,
  total_cost numeric not null default 0,
  net_profit numeric not null default 0,
  profit_rate numeric not null default 0,
  dispatch_count integer not null default 0,
  rental_days integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table corporate_cards (
  id uuid primary key default gen_random_uuid(),
  card_name text not null,
  card_number_masked text not null,
  card_company text,
  owner_name text,
  status text not null default '사용중',
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table card_transactions (
  id uuid primary key default gen_random_uuid(),
  card_id uuid references corporate_cards(id) on delete cascade,
  approved_at timestamptz not null,
  merchant_name text not null,
  amount numeric not null default 0,
  vat_amount numeric not null default 0,
  total_amount numeric not null default 0,
  category text not null default '기타',
  payment_type text,
  approval_number text,
  memo text,
  linked_vehicle_id uuid references vehicles(id),
  linked_plate_number text,
  linked_partner_id uuid references partners(id),
  linked_maintenance_history_id uuid references maintenance_histories(id),
  linked_accident_history_id uuid references accident_histories(id),
  receipt_image_url text,
  source text not null default '수동등록',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table driver_assignments (
  id uuid primary key default gen_random_uuid(),
  dispatch_id uuid references dispatches(id),
  return_id uuid references returns(id),
  vehicle_id uuid references vehicles(id),
  plate_number text not null,
  driver_id uuid references app_profiles(id),
  driver_name text not null,
  assignment_type text not null,
  pickup_location text,
  destination text,
  assigned_at timestamptz,
  started_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  status text not null default '출발전',
  handover_to_customer_name text,
  handover_memo text,
  photos text[] not null default '{}',
  videos text[] not null default '{}',
  signature_data text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table receivables (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid,
  claim_number text,
  customer_name text,
  buyer_name text,
  insurance_company text,
  insurance_number text,
  plate_number text,
  total_billing_amount numeric not null default 0,
  paid_amount numeric not null default 0,
  remaining_amount numeric not null default 0,
  due_date date,
  last_payment_date date,
  status text not null default '입금대기',
  overdue_days integer not null default 0,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  receivable_id uuid references receivables(id) on delete cascade,
  payment_date date not null,
  payment_amount numeric not null default 0,
  payment_method text not null default '계좌이체',
  depositor_name text,
  memo text,
  receipt_file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table billing_calculators (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid,
  rent_start_date date not null,
  rent_end_date date not null,
  rental_days integer not null default 1,
  daily_rate numeric not null default 0,
  rental_amount numeric not null default 0,
  discount_amount numeric not null default 0,
  supply_amount numeric not null default 0,
  vat_amount numeric not null default 0,
  total_amount numeric not null default 0,
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table extra_billing_items (
  id uuid primary key default gen_random_uuid(),
  billing_calculator_id uuid references billing_calculators(id) on delete cascade,
  item_name text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  amount numeric not null default 0,
  memo text
);

create index card_transactions_card_id_idx on card_transactions(card_id);
create index card_transactions_approved_at_idx on card_transactions(approved_at);
create index card_transactions_plate_number_idx on card_transactions(linked_plate_number);
create index card_transactions_category_idx on card_transactions(category);

create table documents (
  id uuid primary key default gen_random_uuid(),
  document_type text not null,
  title text not null,
  target text,
  partner_id uuid references partners(id),
  content jsonb not null default '{}',
  status document_status not null default '작성중',
  created_by uuid references app_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  bucket text,
  object_path text,
  drive_file_id text not null,
  drive_url text not null,
  folder_path text not null,
  stored_file_name text not null,
  original_file_name text not null,
  vehicle_number text,
  claim_number text,
  business_folder text,
  file_kind text,
  mime_type text,
  size bigint,
  dispatch_id uuid references dispatches(id) on delete cascade,
  return_id uuid references returns(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  uploaded_by uuid references app_profiles(id),
  created_at timestamptz not null default now()
);

create index attachments_vehicle_number_idx on attachments(vehicle_number);
create index attachments_claim_number_idx on attachments(claim_number);
create index attachments_drive_file_id_idx on attachments(drive_file_id);

alter table app_profiles enable row level security;
alter table vehicles enable row level security;
alter table partners enable row level security;
alter table dispatches enable row level security;
alter table returns enable row level security;
alter table reports enable row level security;
alter table reservations enable row level security;
alter table maintenance_jobs enable row level security;
alter table maintenance_histories enable row level security;
alter table accident_histories enable row level security;
alter table notifications enable row level security;
alter table vehicle_revenues enable row level security;
alter table corporate_cards enable row level security;
alter table card_transactions enable row level security;
alter table driver_assignments enable row level security;
alter table receivables enable row level security;
alter table payments enable row level security;
alter table billing_calculators enable row level security;
alter table extra_billing_items enable row level security;
alter table documents enable row level security;
alter table attachments enable row level security;

-- Policy direction:
-- admin can select/insert/update/delete all business tables.
-- staff can access mobile app tables and limited admin views.
-- driver can access assigned dispatches, returns, reports, and attachments.
