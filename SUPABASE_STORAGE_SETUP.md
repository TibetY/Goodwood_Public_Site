# Supabase Storage Setup for Officer Images

Before you can upload officer images, you need to create a storage bucket in Supabase.

## Setup Steps:

1. **Go to Supabase Dashboard**
   - Navigate to your project at https://supabase.com/dashboard

2. **Create Storage Bucket**
   - Click on **Storage** in the left sidebar
   - Click **New bucket**
   - Name: `officer-images`
   - Set **Public bucket** to **ON** (so images can be displayed publicly)
   - Click **Create bucket**

3. **Configure Bucket Policies (Optional but Recommended)**

   Go to Storage → officer-images → Policies and add these policies:

   **Allow authenticated uploads:**
   ```sql
   CREATE POLICY "Allow authenticated uploads"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'officer-images');
   ```

   **Allow public reads:**
   ```sql
   CREATE POLICY "Allow public reads"
   ON storage.objects FOR SELECT
   TO public
   USING (bucket_id = 'officer-images');
   ```

   **Allow authenticated deletes:**
   ```sql
   CREATE POLICY "Allow authenticated deletes"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (bucket_id = 'officer-images');
   ```

## Testing

Once the bucket is created:
1. Navigate to `/portal/officers` in your app
2. Click edit on an officer
3. Click "Choose Image" and select a photo (max 5MB)
4. Click "Upload" to upload to Supabase
5. The image URL will be automatically populated
6. Click "Update" to save the officer with the new image

## File Specifications

- **Max size:** 5MB
- **Accepted formats:** JPG, JPEG, PNG, WebP
- **MIME type:** image/*
- **Storage path:** `officer-images/officer-{timestamp}.{ext}`

## Troubleshooting

If uploads fail:
- Verify the `officer-images` bucket exists in Supabase Storage
- Check that the bucket is set to **public**
- Ensure `VITE_SUPABASE_SERVICE_ROLE_KEY` is set in your `.env` file
- Check browser console for specific error messages
