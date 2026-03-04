# 🚀 BIZ AI Dashboard - Deployment Guide

Complete call analytics dashboard for your AI receptionist business.

---

## 📋 What You Just Got

### Features:
- ✅ **Real-time call tracking** from Vapi webhooks
- ✅ **Lead scoring** (hot/warm/cold) with AI analysis
- ✅ **Call transcripts** with summaries
- ✅ **Daily/weekly analytics** charts
- ✅ **Client portal** (multi-tenant ready)
- ✅ **Telegram alerts** for hot leads
- ✅ **Revenue tracking** per client

### Tech Stack:
- **Frontend:** Next.js 14 + Tailwind CSS + Recharts
- **Backend:** Next.js API routes + Vapi webhooks
- **Database:** Supabase (PostgreSQL + Realtime)
- **AI Analysis:** OpenAI GPT-4
- **Hosting:** Vercel (free tier)

---

## 🛠️ Setup Instructions

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Name it `bizai-dashboard`
4. Save the password they give you

**Get your credentials:**
- Project Settings → API
- Copy `Project URL` → this is `NEXT_PUBLIC_SUPABASE_URL`
- Copy `anon public` key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 2: Run Database Schema

1. In Supabase, go to SQL Editor
2. Copy contents of `database/schema.sql`
3. Paste and run
4. This creates all tables with auto-updating daily summaries

### Step 3: Deploy to Vercel

**Option A: One-Click Deploy**
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

**Option B: CLI Deploy**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd bizai-dashboard
vercel
```

### Step 4: Set Environment Variables

In Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add these:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key

# Twilio SMS Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Default client phone (fallback if not in database)
DEFAULT_CLIENT_PHONE=+15551234567
```

### Step 5: Connect Vapi Webhook

1. Go to [Vapi Dashboard](https://dashboard.vapi.ai)
2. Go to your assistant → Webhooks
3. Add webhook URL:
   ```
   https://your-vercel-app.vercel.app/api/vapi-webhook
   ```
4. Select events: `call.ended`, `call.started`
5. Save

---

## 🎯 Testing Your Setup

### Test 1: Webhook Reception
```bash
# Send test webhook
curl -X POST https://your-app.vercel.app/api/vapi-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "call": {
      "id": "test_call_123",
      "customer": {"number": "+15551234567"},
      "startedAt": "2026-03-04T10:00:00Z",
      "endedAt": "2026-03-04T10:05:00Z",
      "transcript": "Hi, I need a plumber ASAP. My pipe burst."
    }
  }'
```

### Test 2: Dashboard View
1. Open your Vercel URL
2. You should see the dashboard (empty state is fine)
3. After test webhook, refresh to see the call

### Test 3: Telegram Alert
1. Make sure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set
2. Send test webhook with hot lead transcript
3. Check Telegram for alert

---

## 📊 Dashboard Features

### For You (Admin):
- See all client call data
- Track total revenue
- Monitor system health
- Export reports

### For Clients:
- **SMS Call Summaries** - Instant text after every call
- Login to see only their calls
- View their analytics
- Download transcripts
- Manage AI settings

---

## 🔄 Daily Workflow

**Morning (8 AM):**
- Check Telegram for overnight alerts
- Review dashboard for hot leads
- Follow up with high-priority prospects

**Throughout Day:**
- Dashboard updates in real-time
- New calls appear automatically
- Lead scores update via AI

**Evening (10 PM):**
- Automated nightly report in Telegram
- Summary of day's activity
- Suggested tasks for tomorrow

---

## 🚀 Next Features to Add

### Phase 2 (This Week):
- [ ] Client authentication system
- [ ] SMS follow-up automation
- [ ] Email reports to clients
- [ ] Calendar integration (bookings)

### Phase 3 (This Month):
- [ ] White-label customization
- [ ] Competitor price tracking
- [ ] AI content generation from calls
- [ ] Mobile app

---

## 💰 Revenue Tracking

The dashboard automatically calculates:
- **Recovery Rate:** % of missed calls turned into leads
- **Revenue Saved:** Estimated value of captured leads
- **ROI:** Cost of AI vs. value generated

Formula:
```
Revenue Saved = Appointments Booked × Average Job Value
ROI = (Revenue Saved - AI Cost) / AI Cost × 100
```

---

## 🆘 Troubleshooting

**Webhook not receiving calls?**
- Check Vapi webhook URL is correct
- Verify Vercel deployment succeeded
- Check Vercel logs: `vercel logs --all`

**Database not updating?**
- Verify Supabase credentials
- Check SQL schema ran successfully
- Look for RLS policy errors

**SMS not sending?**
- Verify Twilio credentials (Account SID, Auth Token)
- Check Twilio phone number is valid and SMS-enabled
- Ensure client phone number is in E.164 format (+15551234567)
- Check Twilio logs for delivery errors

---

## 📞 Support

Questions? Check:
1. Vapi docs: [docs.vapi.ai](https://docs.vapi.ai)
2. Supabase docs: [supabase.com/docs](https://supabase.com/docs)
3. Next.js docs: [nextjs.org/docs](https://nextjs.org/docs)

Or ask me — I'll help debug.

---

**Ready to deploy?** Start with Step 1 (Supabase) and work through each step.
