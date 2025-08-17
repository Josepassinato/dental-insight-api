-- Fix the processing_status constraint issue
ALTER TABLE dental_images DROP CONSTRAINT IF EXISTS dental_images_processing_status_check;

-- Create a proper constraint that allows the statuses we need
ALTER TABLE dental_images ADD CONSTRAINT dental_images_processing_status_check 
CHECK (processing_status IN ('pending', 'uploaded', 'processing', 'completed', 'failed', 'analyzed'));

-- Update the edge function to implement Google Vision API integration
-- This will enable AI analysis of dental images using Google Cloud Vision API