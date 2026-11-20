-- Allow plain-text and CSV reference materials in the existing private order-files bucket.
UPDATE storage.buckets
SET allowed_mime_types = (
  SELECT array_agg(DISTINCT allowed_type)
  FROM unnest(COALESCE(allowed_mime_types, ARRAY[]::text[]) || ARRAY['text/plain', 'text/csv']) AS allowed_type
)
WHERE id = 'campora-private';
