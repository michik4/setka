-- Add width and height columns to photos table
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER;

-- Create function to extract dimensions from path
CREATE OR REPLACE FUNCTION extract_dimensions_from_path(path VARCHAR)
RETURNS TABLE (width INTEGER, height INTEGER) AS $$
DECLARE
    dimensions TEXT[];
    matches TEXT;
BEGIN
    -- Extract dimensions in format 000x000 from path
    SELECT regexp_matches(path, '(\d+)x(\d+)') INTO dimensions;
    IF dimensions IS NOT NULL THEN
        width := dimensions[1]::INTEGER;
        height := dimensions[2]::INTEGER;
        RETURN NEXT;
    ELSE
        width := NULL;
        height := NULL;
        RETURN NEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update existing photos with dimensions from their paths
UPDATE photos
SET width = subquery.width, height = subquery.height
FROM (
    SELECT id, (extract_dimensions_from_path(path)).width as width, 
                (extract_dimensions_from_path(path)).height as height
    FROM photos
    WHERE path ~ '\d+x\d+'
) AS subquery
WHERE photos.id = subquery.id
  AND photos.width IS NULL 
  AND photos.height IS NULL;

-- Create script to run on photo updates
CREATE OR REPLACE FUNCTION update_photo_dimensions()
RETURNS TRIGGER AS $$
DECLARE
    dims RECORD;
BEGIN
    -- Extract dimensions from path only if not provided explicitly
    IF (NEW.width IS NULL OR NEW.height IS NULL) AND NEW.path ~ '\d+x\d+' THEN
        SELECT * FROM extract_dimensions_from_path(NEW.path) INTO dims;
        NEW.width := dims.width;
        NEW.height := dims.height;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update dimensions when path contains them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_photo_dimensions_trigger'
    ) THEN
        CREATE TRIGGER update_photo_dimensions_trigger
        BEFORE INSERT OR UPDATE ON photos
        FOR EACH ROW
        EXECUTE FUNCTION update_photo_dimensions();
    END IF;
END $$; 