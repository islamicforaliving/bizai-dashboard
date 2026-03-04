/**
 * Daily Digest Cron Job
 * Runs at 8 PM daily via Vercel Cron
 * Sends summary of all day's calls to client via SMS
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  // Verify cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get all active clients with SMS enabled
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('id, business_name, notification_phone, sms_notifications_enabled')
      .eq('status', 'active')
      .eq('sms_notifications_enabled', true);

    if (clientError) throw clientError;

    const results = [];

    for (const client of clients) {
      if (!client.notification_phone) continue;

      // Get today's summary
      const { data: summary } = await supabase
        .from('daily_summaries')
        .select('*')
        .eq('client_id', client.id)
        .eq('date', today)
        .single();

      if (!summary || summary.total_calls === 0) {
        // No calls today - send "quiet day" message
        const message = `📊 ${client.business_name}: Quiet day - no calls. Your AI is ready for tomorrow!`;
        await sendSMS(client.notification_phone, message);
        results.push({ client: client.business_name, calls: 0, status: 'sent' });
        continue;
      }

      // Build digest message
      const message = buildDailyDigest(client.business_name, summary, today);
      const smsResult = await sendSMS(client.notification_phone, message);
      
      results.push({
        client: client.business_name,
        calls: summary.total_calls,
        status: smsResult.success ? 'sent' : 'failed'
      });
    }

    return res.status(200).json({
      success: true,
      date: today,
      summaries_sent: results.length,
      details: results
    });

  } catch (error) {
    console.error('Daily digest error:', error);
    return res.status(500).json({ error: error.message });
  }
};

function buildDailyDigest(businessName, summary, date) {
  const formattedDate = new Date(date).toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
  
  let message = `📊 ${businessName} - ${formattedDate}\n`;
  message += `${summary.total_calls} calls handled\n`;
  
  if (summary.appointments_booked > 0) {
    message += `✅ ${summary.appointments_booked} bookings\n`;
  }
  
  if (summary.leads_captured > 0) {
    message += `📞 ${summary.leads_captured} leads need follow-up\n`;
  }
  
  if (summary.voicemails_left > 0) {
    message += `📲 ${summary.voicemails_left} voicemails\n`;
  }
  
  // Recovery rate
  const recoveryRate = summary.total_calls > 0 
    ? Math.round(((summary.appointments_booked + summary.leads_captured) / summary.total_calls) * 100)
    : 0;
  
  message += `🎯 ${recoveryRate}% recovery rate\n`;
  message += `Reply: STATS for details`;
  
  // Keep under 320 chars
  if (message.length > 320) {
    message = message.substring(0, 317) + '...';
  }
  
  return message;
}

async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  
  if (!accountSid || !authToken || !fromNumber) {
    console.log('SMS would send:', { to, message });
    return { success: false, error: 'Twilio not configured' };
  }
  
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: message
        })
      }
    );
    
    const result = await response.json();
    
    return {
      success: response.ok,
      sid: result.sid,
      error: response.ok ? null : result.message
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
