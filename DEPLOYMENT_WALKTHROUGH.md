# 🚀 BIZ AI Dashboard - Complete Deployment Walkthrough

Follow this step-by-step to deploy your dashboard with SMS summaries, daily digests, and reply commands.

---

## 📋 Prerequisites

Before starting, you'll need:
- [ ] GitHub account (free)
- [ ] Vercel account (free)
- [ ] Supabase account (free)
- [ ] Twilio account (free + $1 for phone number)
- [ ] Vapi account (you already have this)

**Estimated time:** 30-45 minutes  
**Estimated cost:** $1/month (Twilio phone number)

---

## STEP 1: Create Supabase Project (5 min)

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Organization: Your name or business
4. Project name: `bizai-dashboard`
5. Database password: **Save this somewhere safe!**
6. Region: Choose closest to you (US East for Detroit)
7. Click "Create new project"

### 1.2 Get Credentials
1. Wait for project to finish setting up (~2 min)
2. Go to Project Settings (gear icon) → API
3. Copy these values:
   - `Project URL` → Save as: **SUPABASE_URL**
   - `anon public` key → Save as: **SUPABASE_ANON_KEY**

### 1.3 Run Database Schema
1. In Supabase, click "SQL Editor" (left sidebar)
2. Click "New query"
3. Copy entire contents of `database/schema.sql` from this repo
4. Paste into SQL Editor
5. Click "Run"
6. You should see: "Success. No rows returned"

**✅ Step 1 Complete** - Database is ready

---

## STEP 2: Set Up Twilio (5 min)

### 2.1 Create Account
1. Go to [twilio.com/try-twilio](https://twilio.com/try-twilio)
2. Sign up with your email
3. Verify your phone number
4. Answer the survey (any answers work)

### 2.2 Get Credentials
1. In Twilio Console, you'll see:
   - **Account SID** (starts with AC...) → Save this
   - **Auth Token** (click "Show") → Save this

### 2.3 Buy Phone Number
1. Click "Get a trial number" (or "Buy a number")
2. Choose a local number with SMS capability
3. Click "Buy" ($1/month charged to your account)
4. Save the phone number (format: +15551234567)

### 2.4 Enable SMS (Important!)
1. Go to Phone Numbers → Manage → Active Numbers
2. Click your phone number
3. Scroll to "Messaging"
4. Under "A Message Comes In":
   - Set to: Webhook
   - URL: `https://YOUR-APP-URL.vercel.app/api/sms-reply`
   - HTTP Method: POST
5. Click "Save"

**✅ Step 2 Complete** - SMS is ready

---

## STEP 3: Deploy to Vercel (10 min)

### 3.1 Push to GitHub
1. Create new GitHub repo: `bizai-dashboard`
2. In your local terminal:
```bash
cd bizai-dashboard
git init
git add .
git commit -m "Initial dashboard"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/bizai-dashboard.git
git push -u origin main
```

### 3.2 Deploy on Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import from GitHub → Select `bizai-dashboard`
4. Click "Import"
5. Framework preset: Next.js (should auto-detect)
6. Click "Deploy"
7. Wait for build (~2 min)
8. Save the deployed URL (e.g., `https://bizai-dashboard-xyz.vercel.app`)

### 3.3 Add Environment Variables
1. In Vercel dashboard, go to your project
2. Click "Settings" → "Environment Variables"
3. Add these one by one:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
DEFAULT_CLIENT_PHONE=your_personal_number
CRON_SECRET=make_up_a_random_string_here
```

4. Click "Save"
5. **Redeploy:** Go to Deployments → Click "Redeploy" on latest

**✅ Step 3 Complete** - Dashboard is live

---

## STEP 4: Connect Vapi (5 min)

### 4.1 Add Webhook URL
1. Go to [dashboard.vapi.ai](https://dashboard.vapi.ai)
2. Click your assistant
3. Go to "Webhooks" tab
4. Add webhook:
   - URL: `https://YOUR-APP-URL.vercel.app/api/vapi-webhook`
   - Events: Select `call.ended` and `call.started`
5. Click "Save"

### 4.2 Add Client Metadata
1. In Vapi assistant settings, find "Metadata"
2. Add:
```json
{
  "client_id": "default"
}
```
3. Save

**✅ Step 4 Complete** - Calls will now log to dashboard

---

## STEP 5: Test Everything (10 min)

### 5.1 Test Webhook
```bash
curl -X POST https://YOUR-APP-URL.vercel.app/api/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "call": {
      "id": "test_call_123",
      "customer": {"number": "+15551234567"},
      "startedAt": "2026-03-04T10:00:00Z",
      "endedAt": "2026-03-04T10:05:00Z",
      "transcript": "Hi, I need a plumber ASAP. My pipe burst. Can you come today?",
      "recordingUrl": "https://example.com/recording.mp3"
    },
    "assistant": {
      "metadata": {"client_id": "default"}
    }
  }'
```

**Expected:** You should receive an SMS summary!

### 5.2 Test Dashboard
1. Open your Vercel URL in browser
2. You should see the dashboard with your test call
3. Check that lead score and outcome are correct

### 5.3 Test SMS Reply
1. Reply to the SMS you received with: `STATS`
2. You should get today's statistics
3. Try other commands: `LEADS`, `HELP`

### 5.4 Test Daily Digest (Manual)
```bash
curl -X POST https://YOUR-APP-URL.vercel.app/api/cron/daily-digest \
  -H "Authorization: Bearer your_cron_secret"
```

**Expected:** Daily digest SMS sent to your phone

**✅ Step 5 Complete** - Everything works!

---

## STEP 6: Add Your First Real Client (Optional)

### 6.1 Add Client to Database
In Supabase SQL Editor:
```sql
INSERT INTO clients (
  business_name,
  email,
  phone,
  notification_phone,
  vapi_assistant_id,
  vapi_phone_number,
  plan,
  price_per_month
) VALUES (
  'Mike\'s Plumbing',
  'mike@mikesplumbing.com',
  '+15551234567',
  '+15551234567',  -- Where to send SMS summaries
  'your_vapi_assistant_id',
  '+15559876543',  -- Vapi phone number for this client
  'starter',
  297.00
);
```

### 6.2 Update Vapi Webhook
For each client, add their `client_id` to Vapi assistant metadata.

---

## 🎉 You're Live!

### What Happens Now:

**Instant (per call):**
- Client receives SMS summary within seconds
- Dashboard updates in real-time
- Call recorded with transcript

**Daily at 8 PM:**
- Client receives digest of all day's calls
- Recovery rate, bookings, leads summary

**Client can reply anytime:**
- `CALL` → Get last lead's number
- `STATS` → Today's numbers
- `LEADS` → List leads to follow up
- `BOOKINGS` → Today's appointments
- `VOICEMAIL` → Latest voicemail link
- `STOP` / `START` → Control notifications

---

## 💰 Pricing

| Service | Cost |
|---------|------|
| Vercel (Hosting) | Free |
| Supabase (Database) | Free tier |
| Twilio (Phone number) | $1/month |
| Twilio (SMS) | ~$0.0075 per message |
| OpenAI (Analysis) | ~$0.002 per call |
| **Total per client** | ~$2-5/month |
| **You charge client** | $297-997/month |
| **Your profit** | $292-992/month per client |

---

## 🆘 Troubleshooting

### SMS not sending?
1. Check Twilio credentials in Vercel
2. Verify phone number format (+15551234567)
3. Check Twilio logs for errors
4. Ensure balance in Twilio account

### Webhook not receiving calls?
1. Check Vapi webhook URL is correct
2. Verify Vercel deployment succeeded
3. Check Vercel logs: `vercel logs --all`
4. Test with curl command above

### Dashboard empty?
1. Check Supabase credentials
2. Verify SQL schema ran successfully
3. Look for RLS policy errors
4. Check browser console for errors

### SMS replies not working?
1. Verify Twilio webhook URL is set correctly
2. Check URL includes `/api/sms-reply`
3. Ensure HTTP method is POST
4. Check Vercel logs for errors

---

## 🚀 Next Steps

### This Week:
- [ ] Add Stripe for client billing
- [ ] Create client onboarding flow
- [ ] Add email reports
- [ ] Build landing page for prospects

### This Month:
- [ ] White-label customization
- [ ] Mobile app
- [ ] AI content generation
- [ ] Competitor tracking

---

**Questions?** Check the code comments or ask me for help.

**Ready to get your first client?** The dashboard is live and ready! 🎉
