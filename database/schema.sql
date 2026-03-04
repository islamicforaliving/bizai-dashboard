-- Database Schema for BIZ AI Dashboard
-- Run this in Supabase SQL Editor

-- Enable RLS (Row Level Security)
alter table if exists calls enable row level security;
alter table if exists clients enable row level security;
alter table if exists transcripts enable row level security;

-- Clients table (your customers)
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  
  -- Business info
  business_name text not null,
  contact_name text,
  email text not null unique,
  phone text,
  
  -- Vapi configuration
  vapi_assistant_id text,
  vapi_phone_number text,
  
  -- SMS notifications
  sms_notifications_enabled boolean default true,
  notification_phone text, -- where to send SMS summaries
  
  -- Subscription
  plan text default 'starter', -- starter, growth, pro
  status text default 'active', -- active, paused, cancelled
  monthly_minutes integer default 100,
  price_per_month decimal(10,2) default 297.00,
  
  -- Settings
  timezone text default 'America/New_York',
  business_hours jsonb default '{"mon":"9-17","tue":"9-17","wed":"9-17","thu":"9-17","fri":"9-17","sat":"closed","sun":"closed"}',
  
  -- Branding (for white-label)
  logo_url text,
  primary_color text default '#3B82F6',
  
  -- Meta
  notes text,
  tags text[] default '{}'
);

-- Calls table (all call records)
create table if not exists calls (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  
  -- Link to client
  client_id uuid references clients(id) on delete cascade,
  
  -- Vapi data
  vapi_call_id text unique not null,
  phone_number text,
  
  -- Timing
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  duration_seconds integer default 0,
  
  -- Call details
  status text default 'completed', -- started, completed, failed
  outcome text default 'completed', -- completed, appointment_booked, lead_captured, voicemail, hangup, no_answer
  
  -- Content
  transcript text,
  transcript_summary text,
  recording_url text,
  
  -- AI Analysis
  lead_score integer default 50, -- 0-100
  sentiment text default 'neutral', -- positive, neutral, negative
  key_topics text[] default '{}',
  
  -- Cost
  cost decimal(10,4) default 0,
  
  -- Meta
  metadata jsonb default '{}',
  notes text
);

-- Transcript analysis table (detailed AI analysis)
create table if not exists transcript_analysis (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  
  call_id uuid references calls(id) on delete cascade,
  
  -- AI-generated insights
  summary text,
  customer_intent text, -- booking_info, pricing_question, general_inquiry, complaint
  objections text[],
  next_steps text[],
  
  -- Sentiment breakdown
  sentiment_score decimal(3,2), -- -1.0 to 1.0
  confidence_score decimal(3,2), -- 0.0 to 1.0
  
  -- Action items
  follow_up_required boolean default false,
  follow_up_message text,
  
  -- Raw analysis
  raw_analysis jsonb
);

-- Daily summaries (aggregated stats)
create table if not exists daily_summaries (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  
  client_id uuid references clients(id) on delete cascade,
  date date not null,
  
  -- Call stats
  total_calls integer default 0,
  answered_calls integer default 0,
  missed_calls integer default 0,
  avg_duration_seconds integer default 0,
  
  -- Outcomes
  appointments_booked integer default 0,
  leads_captured integer default 0,
  voicemails_left integer default 0,
  
  -- Lead quality
  hot_leads integer default 0,
  warm_leads integer default 0,
  cold_leads integer default 0,
  
  -- Financial
  total_cost decimal(10,2) default 0,
  estimated_revenue decimal(10,2) default 0, -- based on appointments × avg job value
  
  unique(client_id, date)
);

-- SMS interactions (track client replies)
create table if not exists sms_interactions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  
  client_id uuid references clients(id) on delete cascade,
  phone_number text not null,
  
  incoming_message text,
  outgoing_message text,
  command text,
  
  metadata jsonb default '{}'
);

-- Automations log (track what automations ran)
create table if not exists automation_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  
  client_id uuid references clients(id) on delete cascade,
  call_id uuid references calls(id) on delete set null,
  
  automation_type text not null, -- sms_followup, email_alert, telegram_alert, etc.
  status text default 'pending', -- pending, sent, failed
  recipient text,
  content text,
  error_message text,
  
  metadata jsonb default '{}'
);

-- Indexes for performance
create index if not exists idx_calls_client_id on calls(client_id);
create index if not exists idx_calls_created_at on calls(created_at);
create index if not exists idx_calls_outcome on calls(outcome);
create index if not exists idx_calls_lead_score on calls(lead_score);
create index if not exists idx_daily_summaries_client_date on daily_summaries(client_id, date);

-- RLS Policies (security)
-- Clients can only see their own data
create policy "Clients can view own calls"
  on calls for select
  using (client_id in (
    select id from clients where email = auth.email()
  ));

create policy "Clients can view own daily summaries"
  on daily_summaries for select
  using (client_id in (
    select id from clients where email = auth.email()
  ));

-- Function to update daily summary (run after each call)
create or replace function update_daily_summary()
returns trigger as $$
begin
  insert into daily_summaries (
    client_id, 
    date,
    total_calls,
    answered_calls,
    appointments_booked,
    leads_captured,
    voicemails_left,
    hot_leads,
    total_cost
  )
  values (
    new.client_id,
    date(new.created_at),
    1,
    case when new.duration_seconds > 30 then 1 else 0 end,
    case when new.outcome = 'appointment_booked' then 1 else 0 end,
    case when new.outcome = 'lead_captured' then 1 else 0 end,
    case when new.outcome = 'voicemail' then 1 else 0 end,
    case when new.lead_score >= 70 then 1 else 0 end,
    new.cost
  )
  on conflict (client_id, date)
  do update set
    total_calls = daily_summaries.total_calls + 1,
    answered_calls = daily_summaries.answered_calls + case when new.duration_seconds > 30 then 1 else 0 end,
    appointments_booked = daily_summaries.appointments_booked + case when new.outcome = 'appointment_booked' then 1 else 0 end,
    leads_captured = daily_summaries.leads_captured + case when new.outcome = 'lead_captured' then 1 else 0 end,
    voicemails_left = daily_summaries.voicemails_left + case when new.outcome = 'voicemail' then 1 else 0 end,
    hot_leads = daily_summaries.hot_leads + case when new.lead_score >= 70 then 1 else 0 end,
    total_cost = daily_summaries.total_cost + new.cost;
    
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update daily summaries
drop trigger if exists trigger_update_daily_summary on calls;
create trigger trigger_update_daily_summary
  after insert on calls
  for each row
  execute function update_daily_summary();
