/**
 * Vapi Webhook Handler - SMS Summary to Client
 * 
 * Sends call summary via SMS to the business owner's phone
 * after every call (not just hot leads)
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    console.log('Vapi webhook received:', JSON.stringify(payload, null, 2));

    // Extract call data
    const callData = {
      vapi_call_id: payload.call?.id || payload.id,
      client_id: payload.assistant?.metadata?.client_id || 'default',
      phone_number: payload.call?.customer?.number || payload.customer?.number,
      start_time: payload.call?.startedAt || payload.startedAt,
      end_time: payload.call?.endedAt || payload.endedAt,
      duration_seconds: calculateDuration(payload),
      status: payload.call?.status || payload.status,
      transcript: payload.call?.transcript || payload.transcript || '',
      recording_url: payload.call?.recordingUrl || payload.recordingUrl,
      cost: payload.call?.cost || payload.cost || 0,
      outcome: determineOutcome(payload),
      created_at: new Date().toISOString()
    };

    // Store in database
    const { error } = await supabase
      .from('calls')
      .insert([callData]);

    if (error) {
      console.error('Database error:', error);
    }

    // Get client's phone number to send SMS summary
    const clientPhone = await getClientPhoneNumber(callData.client_id);
    
    // Generate and send SMS summary
    if (clientPhone) {
      const smsSummary = generateSMSSummary(callData);
      await sendSMS(clientPhone, smsSummary);
    }

    // Analyze transcript for dashboard (async, don't wait)
    if (callData.transcript) {
      analyzeTranscript(callData).catch(console.error);
    }

    return res.status(200).json({ 
      success: true, 
      call_id: callData.vapi_call_id 
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get client's phone number from database
async function getClientPhoneNumber(clientId) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('phone')
      .eq('id', clientId)
      .single();
    
    if (error) {
      // Try to get from environment as fallback
      return process.env.DEFAULT_CLIENT_PHONE;
    }
    
    return data?.phone || process.env.DEFAULT_CLIENT_PHONE;
  } catch (error) {
    console.error('Error fetching client phone:', error);
    return process.env.DEFAULT_CLIENT_PHONE;
  }
}

// Generate SMS summary from call data
function generateSMSSummary(callData) {
  const duration = Math.round(callData.duration_seconds / 60);
  const caller = formatPhoneNumber(callData.phone_number);
  
  // Build summary based on call outcome
  let summary = '';
  
  switch (callData.outcome) {
    case 'appointment_booked':
      summary = `✅ BOOKING: ${caller} scheduled an appointment (${duration}m call). Check dashboard for details.`;
      break;
      
    case 'lead_captured':
      summary = `📞 LEAD: ${caller} interested but didn't book (${duration}m). Follow up recommended. Dashboard: ${process.env.DASHBOARD_URL || 'link'}`;
      break;
      
    case 'voicemail':
      summary = `📲 VOICEMAIL: ${caller} left a message. Duration: ${duration}m. Check dashboard to listen.`;
      break;
      
    case 'hangup':
      summary = `📞 MISSED: ${caller} called but hung up (${duration}m). They may call back.`;
      break;
      
    default:
      // Generate brief summary from transcript if available
      if (callData.transcript && callData.transcript.length > 10) {
        const briefSummary = callData.transcript.substring(0, 80).replace(/\n/g, ' ');
        summary = `📞 CALL: ${caller} (${duration}m). "${briefSummary}..." Full transcript in dashboard.`;
      } else {
        summary = `📞 CALL: ${caller} spoke with AI (${duration}m). Check dashboard for details.`;
      }
  }
  
  // Add recording link if available
  if (callData.recording_url && callData.outcome !== 'hangup') {
    summary += ` Listen: ${shortenUrl(callData.recording_url)}`;
  }
  
  // Ensure under 320 chars (Twilio limit for single SMS)
  if (summary.length > 320) {
    summary = summary.substring(0, 317) + '...';
  }
  
  return summary;
}

// Format phone number for display
function formatPhoneNumber(phone) {
  if (!phone) return 'Unknown';
  // Show last 4 digits only for privacy in SMS
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(XXX) XXX-${cleaned.slice(-4)}`;
  }
  if (cleaned.length === 11 && cleaned[0] === '1') {
    return `(XXX) XXX-${cleaned.slice(-4)}`;
  }
  return `XXX-${cleaned.slice(-4)}`;
}

// Send SMS via Twilio
async function sendSMS(to, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  
  if (!accountSid || !authToken || !fromNumber) {
    console.log('SMS would be sent (Twilio not configured):');
    console.log(`To: ${to}`);
    console.log(`Message: ${message}`);
    return { success: false, error: 'Twilio not configured' };
  }
  
  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
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
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`SMS sent to ${to}: ${result.sid}`);
      return { success: true, sid: result.sid };
    } else {
      console.error('Twilio error:', result);
      return { success: false, error: result.message };
    }
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false, error: error.message };
  }
}

// Shorten URL (placeholder - integrate with bit.ly or similar)
function shortenUrl(url) {
  // For now, return truncated URL
  if (url.length > 60) {
    return url.substring(0, 57) + '...';
  }
  return url;
}

// Calculate call duration
function calculateDuration(payload) {
  const start = new Date(payload.call?.startedAt || payload.startedAt);
  const end = new Date(payload.call?.endedAt || payload.endedAt);
  return Math.round((end - start) / 1000);
}

// Determine call outcome
function determineOutcome(payload) {
  const transcript = (payload.call?.transcript || payload.transcript || '').toLowerCase();
  const duration = calculateDuration(payload);
  
  if (duration < 20) return 'hangup';
  
  if (transcript.includes('book') || 
      transcript.includes('schedule') || 
      transcript.includes('appointment') ||
      transcript.includes('tomorrow') ||
      transcript.includes('monday') ||
      transcript.includes('tuesday') ||
      transcript.includes('wednesday') ||
      transcript.includes('thursday') ||
      transcript.includes('friday')) {
    return 'appointment_booked';
  }
  
  if (transcript.includes('name') || 
      transcript.includes('number') || 
      transcript.includes('call me back') ||
      transcript.includes('interested') ||
      transcript.includes('price') ||
      transcript.includes('cost')) {
    return 'lead_captured';
  }
  
  if (transcript.includes('voicemail') || 
      transcript.includes('leave a message') ||
      transcript.includes('not available') ||
      duration < 45) {
    return 'voicemail';
  }
  
  return 'completed';
}

// Analyze transcript (async, runs after response)
async function analyzeTranscript(callData) {
  // This would call OpenAI for detailed analysis
  // Store results in transcript_analysis table
  console.log('Analyzing transcript for call:', callData.vapi_call_id);
}
