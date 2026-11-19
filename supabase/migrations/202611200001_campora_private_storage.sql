-- CAMPORA private file storage.
-- The backend uses the Supabase service key and issues short-lived signed URLs only
-- after checking the CAMPORA customer/admin session and order ownership.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'campora-private',
  'campora-private',
  false,
  5242880,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
