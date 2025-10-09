-- Add letter_viewed_at column to track when borrower views the approved letter
ALTER TABLE borrow_requests 
ADD COLUMN letter_viewed_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN borrow_requests.letter_viewed_at IS 'Timestamp when borrower viewed the approved letter';