-- Enable realtime for dental_images table
ALTER TABLE public.dental_images REPLICA IDENTITY FULL;

-- Add dental_images to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.dental_images;