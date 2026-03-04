-- Setup script to connect a client to their VAPI assistant
-- Run this in Supabase SQL Editor after creating your VAPI assistant

-- Example: Add a new client with their VAPI assistant ID
-- Replace the values below with your actual client info

INSERT INTO clients (
  business_name,
  contact_name,
  email,
  phone,
  notification_phone,  -- Where to send SMS summaries
  vapi_assistant_id,   -- The VAPI assistant ID (found in VAPI dashboard)
  vapi_phone_number,   -- The phone number assigned to this VAPI assistant
  plan,
  status,
  timezone,
  sms_notifications_enabled
) VALUES (
  'Mike\'s Plumbing',           -- Client's business name
  'Mike Johnson',               -- Contact person name
  'mike@mikesplumbing.com',     -- Client's email (used for login)
  '+15551234567',               -- Client's business phone
  '+15551234567',               -- Where to send SMS summaries (can be same as phone)
  'your-vapi-assistant-id-here', -- VAPI Assistant ID (from VAPI dashboard)
  '+15559876543',               -- VAPI Phone Number assigned to this client
  'starter',                    -- Plan: starter, growth, or pro
  'active',                     -- Status: active, paused, cancelled
  'America/New_York',           -- Timezone
  true                          -- Enable SMS notifications
);

-- How to find your VAPI Assistant ID:
-- 1. Go to https://dashboard.vapi.ai
-- 2. Click on your assistant
-- 3. Look at the URL or the assistant settings
-- 4. The ID looks like: "abc123-def456-ghi789"

-- How to verify the connection is working:
-- 1. Add the client with their VAPI assistant ID above
-- 2. Make a test call to the VAPI phone number
-- 3. Check the dashboard - the call should appear under this client
-- 4. The client should receive an SMS summary

-- Query to see all clients and their VAPI connections:
-- SELECT business_name, email, vapi_assistant_id, vapi_phone_number, status FROM clients;

-- Query to see recent calls for a specific client:
-- SELECT * FROM calls 
-- WHERE client_id = (SELECT id FROM clients WHERE email = 'mike@mikesplumbing.com')
-- ORDER BY created_at DESC
-- LIMIT 10;
