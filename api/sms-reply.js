/**
 * SMS Reply Handler
 * Receives replies from clients and takes action
 * 
 * Setup in Twilio:
 * 1. Go to Phone Numbers → Manage → Active Numbers
 * 2. Click your number
 * 3. Set "A Message Comes In" webhook to:
 *    https://your-app.vercel.app/api/sms-reply
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Available commands
const COMMANDS = {
  'CALL': 'Call back the most recent lead',
  'STATS': 'Get detailed stats for today',
  'LEADS': 'List all leads from today',
  'BOOKINGS': 'List all bookings from today',
  'VOICEMAIL': 'Get link to latest voicemail',
  'STOP': 'Pause SMS notifications',
  'START': 'Resume SMS notifications',
  'HELP': 'Show available commands'
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse Twilio webhook
    const from = req.body.From;
    const body = req.body.Body?.toUpperCase().trim();
    
    console.log(`SMS reply from ${from}: ${body}`);

    // Find client by phone number
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('notification_phone', from)
      .single();

    if (clientError || !client) {
      // Try to find by partial match (in case of formatting differences)
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('sms_notifications_enabled', true);
      
      const matchedClient = clients?.find(c => 
        c.notification_phone?.replace(/\D/g, '').includes(from.replace(/\D/g, ''))
      );
      
      if (!matchedClient) {
        await sendSMS(from, "Sorry, we couldn't find your account. Please contact support.");
        return res.status(200).send('<Response></Response>');
      }
    }

    const activeClient = client || matchedClient;

    // Process command
    let response = '';
    
    switch (body) {
      case 'CALL':
      case 'CALLBACK':
        response = await handleCallCommand(activeClient);
        break;
        
      case 'STATS':
      case 'STATISTICS':
        response = await handleStatsCommand(activeClient);
        break;
        
      case 'LEADS':
        response = await handleLeadsCommand(activeClient);
        break;
        
      case 'BOOKINGS':
      case 'APPOINTMENTS':
        response = await handleBookingsCommand(activeClient);
        break;
        
      case 'VOICEMAIL':
      case 'VM':
        response = await handleVoicemailCommand(activeClient);
        break;
        
      case 'STOP':
      case 'UNSUBSCRIBE':
        response = await handleStopCommand(activeClient);
        break;
        
      case 'START':
      case 'RESUME':
        response = await handleStartCommand(activeClient);
        break;
        
      case 'HELP':
      case '?':
      default:
        response = buildHelpMessage();
        break;
    }

    await sendSMS(from, response);

    // Log the interaction
    await supabase.from('sms_interactions').insert([{
      client_id: activeClient.id,
      phone_number: from,
      incoming_message: req.body.Body,
      outgoing_message: response,
      command: body
    }]);

    // Return empty TwiML response
    res.set('Content-Type', 'text/xml');
    return res.status(200).send('<Response></Response>');

  } catch (error) {
    console.error('SMS reply error:', error);
    res.set('Content-Type', 'text/xml');
    return res.status(200).send('<Response></Response>');
  }
};

async function handleCallCommand(client) {
  // Get most recent lead that needs follow-up
  const { data: lead } = await supabase
    .from('calls')
    .select('*')
    .eq('client_id', client.id)
    .eq('outcome', 'lead_captured')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!lead) {
    return "No recent leads to call back. Great job converting them all! 🎉";
  }

  const phone = lead.phone_number;
  const time = new Date(lead.created_at).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });
  
  return `📞 Call this lead back:\n${phone}\nCalled at ${time}\n\nTranscript: "${lead.transcript?.substring(0, 100)}..."`;
}

async function handleStatsCommand(client) {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: summary } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('client_id', client.id)
    .eq('date', today)
    .single();

  if (!summary) {
    return "No calls today yet. Your AI is standing by! 📞";
  }

  const recoveryRate = summary.total_calls > 0 
    ? Math.round(((summary.appointments_booked + summary.leads_captured) / summary.total_calls) * 100)
    : 0;

  return `📊 Today's Stats:\n` +
    `Total calls: ${summary.total_calls}\n` +
    `Bookings: ${summary.appointments_booked}\n` +
    `Leads: ${summary.leads_captured}\n` +
    `Voicemails: ${summary.voicemails_left}\n` +
    `Recovery rate: ${recoveryRate}%\n` +
    `Cost: $${summary.total_cost.toFixed(2)}`;
}

async function handleLeadsCommand(client) {
  const { data: leads } = await supabase
    .from('calls')
    .select('phone_number, created_at, transcript')
    .eq('client_id', client.id)
    .eq('outcome', 'lead_captured')
    .order('created_at', { ascending: false })
    .limit(3);

  if (!leads || leads.length === 0) {
    return "No leads to follow up today! 🎉";
  }

  let message = `📞 ${leads.length} recent leads:\n\n`;
  
  leads.forEach((lead, i) => {
    const time = new Date(lead.created_at).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    message += `${i + 1}. ${lead.phone_number} (${time})\n`;
  });
  
  message += `\nReply CALL to get details on the most recent.`;
  
  return message;
}

async function handleBookingsCommand(client) {
  const { data: bookings } = await supabase
    .from('calls')
    .select('phone_number, created_at')
    .eq('client_id', client.id)
    .eq('outcome', 'appointment_booked')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!bookings || bookings.length === 0) {
    return "No bookings yet today. Keep pushing! 💪";
  }

  let message = `✅ ${bookings.length} bookings today:\n\n`;
  
  bookings.forEach((booking, i) => {
    const time = new Date(booking.created_at).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
    message += `${i + 1}. ${booking.phone_number} at ${time}\n`;
  });

  return message;
}

async function handleVoicemailCommand(client) {
  const { data: voicemail } = await supabase
    .from('calls')
    .select('recording_url, phone_number, created_at')
    .eq('client_id', client.id)
    .eq('outcome', 'voicemail')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!voicemail) {
    return "No voicemails today. 📭";
  }

  const time = new Date(voicemail.created_at).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit' 
  });

  return `📲 Latest voicemail:\nFrom: ${voicemail.phone_number}\nTime: ${time}\n\nListen: ${voicemail.recording_url || 'Check dashboard'}`;
}

async function handleStopCommand(client) {
  await supabase
    .from('clients')
    .update({ sms_notifications_enabled: false })
    .eq('id', client.id);

  return "SMS notifications paused. Reply START to resume. 📵";
}

async function handleStartCommand(client) {
  await supabase
    .from('clients')
    .update({ sms_notifications_enabled: true })
    .eq('id', client.id);

  return "SMS notifications resumed! You'll get call summaries again. 📲";
}

function buildHelpMessage() {
  return `📱 BIZ AI - All In One Solution\n\n` +
    `CALL - Call back last lead\n` +
    `STATS - Today's numbers\n` +
    `LEADS - List leads to follow up\n` +
    `BOOKINGS - Today's appointments\n` +
    `VOICEMAIL - Latest voicemail link\n` +
    `STOP - Pause notifications\n` +
    `START - Resume notifications\n` +
    `HELP - Show this menu\n\n` +
    `Questions? Call Shaheer: (248) 277-6426`
}

async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  
  if (!accountSid || !authToken || !fromNumber) {
    console.log('SMS would send:', { to, message });
    return;
  }
  
  await fetch(
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
}
