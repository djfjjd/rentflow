ALTER TABLE dispatches ADD COLUMN created_by_id TEXT;
ALTER TABLE dispatches ADD COLUMN created_by_name TEXT;
ALTER TABLE dispatches ADD COLUMN created_by_role TEXT;
ALTER TABLE dispatches ADD COLUMN updated_by_id TEXT;
ALTER TABLE dispatches ADD COLUMN updated_by_name TEXT;

ALTER TABLE returns ADD COLUMN created_by_id TEXT;
ALTER TABLE returns ADD COLUMN created_by_name TEXT;
ALTER TABLE returns ADD COLUMN created_by_role TEXT;
ALTER TABLE returns ADD COLUMN updated_by_id TEXT;
ALTER TABLE returns ADD COLUMN updated_by_name TEXT;

ALTER TABLE reservations ADD COLUMN created_by_id TEXT;
ALTER TABLE reservations ADD COLUMN created_by_name TEXT;
ALTER TABLE reservations ADD COLUMN created_by_role TEXT;
ALTER TABLE reservations ADD COLUMN updated_by_id TEXT;
ALTER TABLE reservations ADD COLUMN updated_by_name TEXT;

ALTER TABLE lost_items ADD COLUMN created_by_id TEXT;
ALTER TABLE lost_items ADD COLUMN created_by_name TEXT;
ALTER TABLE lost_items ADD COLUMN created_by_role TEXT;
ALTER TABLE lost_items ADD COLUMN updated_by_id TEXT;
ALTER TABLE lost_items ADD COLUMN updated_by_name TEXT;

ALTER TABLE accident_histories ADD COLUMN created_by_id TEXT;
ALTER TABLE accident_histories ADD COLUMN created_by_name TEXT;
ALTER TABLE accident_histories ADD COLUMN created_by_role TEXT;
ALTER TABLE accident_histories ADD COLUMN updated_by_id TEXT;
ALTER TABLE accident_histories ADD COLUMN updated_by_name TEXT;

ALTER TABLE maintenance_histories ADD COLUMN created_by_id TEXT;
ALTER TABLE maintenance_histories ADD COLUMN created_by_name TEXT;
ALTER TABLE maintenance_histories ADD COLUMN created_by_role TEXT;
ALTER TABLE maintenance_histories ADD COLUMN updated_by_id TEXT;
ALTER TABLE maintenance_histories ADD COLUMN updated_by_name TEXT;

ALTER TABLE vehicles ADD COLUMN created_by_id TEXT;
ALTER TABLE vehicles ADD COLUMN created_by_name TEXT;
ALTER TABLE vehicles ADD COLUMN created_by_role TEXT;
ALTER TABLE vehicles ADD COLUMN updated_by_id TEXT;
ALTER TABLE vehicles ADD COLUMN updated_by_name TEXT;
