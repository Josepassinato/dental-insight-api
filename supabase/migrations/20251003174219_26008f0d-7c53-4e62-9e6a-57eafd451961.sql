-- Enable realtime for exams table
ALTER TABLE public.exams REPLICA IDENTITY FULL;

-- Add exams table to realtime publication if not already added
DO $$
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'exams'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.exams;
  END IF;
END $$;