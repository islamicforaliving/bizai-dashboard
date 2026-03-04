// utils/openai-analysis.ts - AI transcript analysis
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface TranscriptAnalysis {
  summary: string;
  leadScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  customerIntent: string;
  objections: string[];
  nextSteps: string[];
  followUpRequired: boolean;
  followUpMessage: string;
}

export async function analyzeTranscript(transcript: string): Promise<TranscriptAnalysis> {
  const prompt = `
Analyze this call transcript for a plumbing/auto detailing business AI receptionist.

Transcript:
"${transcript}"

Provide analysis in this JSON format:
{
  "summary": "2-3 sentence summary of the call",
  "leadScore": 0-100 (70+ = hot lead ready to book, 40-69 = warm lead needs nurturing, <40 = cold/not interested),
  "sentiment": "positive" | "neutral" | "negative",
  "customerIntent": "booking_info" | "pricing_question" | "general_inquiry" | "complaint" | "wrong_number",
  "objections": ["list any objections raised"],
  "nextSteps": ["suggested follow-up actions"],
  "followUpRequired": true/false,
  "followUpMessage": "suggested SMS/email follow-up text"
}

Rules:
- Lead score 80-100: They explicitly asked to book or gave strong buying signals
- Lead score 60-79: Interested but had questions/concerns
- Lead score 40-59: Vague interest, needs more nurturing
- Lead score 0-39: Not interested, wrong number, or hung up quickly
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a call analysis expert for home service businesses.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(content);
    
    return {
      summary: analysis.summary,
      leadScore: Math.min(100, Math.max(0, analysis.leadScore)),
      sentiment: analysis.sentiment,
      customerIntent: analysis.customerIntent,
      objections: analysis.objections || [],
      nextSteps: analysis.nextSteps || [],
      followUpRequired: analysis.followUpRequired,
      followUpMessage: analysis.followUpMessage
    };
  } catch (error) {
    console.error('Error analyzing transcript:', error);
    
    // Return default analysis on error
    return {
      summary: 'Analysis failed - please review transcript manually',
      leadScore: 50,
      sentiment: 'neutral',
      customerIntent: 'general_inquiry',
      objections: [],
      nextSteps: ['Review transcript manually'],
      followUpRequired: false,
      followUpMessage: ''
    };
  }
}

// Quick lead score without full analysis
export function quickLeadScore(transcript: string): number {
  const text = transcript.toLowerCase();
  let score = 50; // Base score
  
  // Positive signals (+20 each)
  if (text.includes('book') || text.includes('schedule')) score += 20;
  if (text.includes('asap') || text.includes('urgent') || text.includes('emergency')) score += 20;
  if (text.includes('price') || text.includes('cost') || text.includes('how much')) score += 15;
  if (text.includes('today') || text.includes('tomorrow')) score += 15;
  
  // Negative signals (-15 each)
  if (text.includes('wrong number')) score -= 30;
  if (text.includes('not interested')) score -= 25;
  if (text.includes('do not call') || text.includes('stop calling')) score -= 30;
  if (text.length < 50) score -= 10; // Very short call
  
  return Math.min(100, Math.max(0, score));
}

// Generate follow-up message based on outcome
export function generateFollowUp(outcome: string, transcript: string): string {
  const messages = {
    appointment_booked: 
      "Thanks for booking with us! We'll see you at the scheduled time. Reply CONFIRM to confirm or RESCHEDULE if you need to change.",
    
    lead_captured: 
      "Thanks for calling! We'll follow up with you shortly. If you need immediate assistance, reply URGENT.",
    
    voicemail: 
      "Sorry we missed you! We tried calling about your service inquiry. Call us back at [YOUR_NUMBER] or reply to schedule.",
    
    hangup: 
      "We noticed you called earlier. How can we help you today? Reply or call us back at [YOUR_NUMBER]."
  };
  
  return messages[outcome] || messages.lead_captured;
}
