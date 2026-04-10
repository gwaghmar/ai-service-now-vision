CREATE UNIQUE INDEX IF NOT EXISTS approval_request_terminal_unique
ON approval (request_id)
WHERE decision IN ('approved', 'denied');

CREATE UNIQUE INDEX IF NOT EXISTS fulfillment_job_request_open_unique
ON fulfillment_job (request_id)
WHERE status IN ('pending', 'processing');
