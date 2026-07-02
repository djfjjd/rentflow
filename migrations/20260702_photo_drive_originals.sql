ALTER TABLE uploaded_files ADD COLUMN r2_thumbnail_key TEXT;
ALTER TABLE uploaded_files ADD COLUMN google_drive_file_id TEXT;
ALTER TABLE uploaded_files ADD COLUMN google_drive_view_url TEXT;
ALTER TABLE uploaded_files ADD COLUMN google_drive_download_url TEXT;
ALTER TABLE uploaded_files ADD COLUMN original_file_name TEXT;
ALTER TABLE uploaded_files ADD COLUMN original_file_size INTEGER;
