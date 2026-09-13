import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import * as dotenv from 'dotenv';
import { defineSecret } from "firebase-functions/params";
import * as admin from 'firebase-admin';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Define secret for Google AI API key (recommended approach)
const googleAiApiKey = defineSecret("GOOGLE_AI_API_KEY");

// Enable Firebase telemetry for monitoring
enableFirebaseTelemetry();

// Chat function (Gemini-first, with graceful fallback)
export const chat = onRequest({
  cors: true,
}, async (req, res) => {
  // Handle CORS
  res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    // Verify authentication - handle both Firebase Auth and custom auth
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing authentication token' });
      return;
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    // Try Firebase Auth first, then fallback to custom auth
    let isAuthenticated = false;
    try {
      await admin.auth().verifyIdToken(token);
      isAuthenticated = true;
    } catch (firebaseError) {
      // If Firebase token verification fails, check if it's a valid email (custom auth)
      if (token.includes('@') && token.includes('.')) {
        isAuthenticated = true; // Accept email as valid authentication for custom system
      }
    }
    
    if (!isAuthenticated) {
      res.status(401).json({ error: 'Invalid authentication token' });
      return;
    }
    
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Missing or invalid text field' });
      return;
    }

    // Try Gemini first (if key available)
    const geminiKey = process.env.GOOGLE_AI_API_KEY || googleAiApiKey.value();
    if (geminiKey && geminiKey !== 'placeholder_key_get_from_aistudio') {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-1.5-flash',
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        });
        const prompt = `You are a helpful AI assistant for a fleet management system called "Zahran Fleet Management".
Respond in the user's language (Arabic or English). Be concise and practical.

User: "${text.trim()}"`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiText = response.text();
        if (aiText && aiText.trim()) {
          res.json({ reply: aiText });
          return;
        }
      } catch (e: any) {
        console.error('Gemini generation failed, falling back:', e?.message || e);
      }
    }

    // Fallback: rule-based helpful reply (no external API)
    const userMessage = text.toLowerCase().trim();
    let reply = '';
    if (userMessage.includes('vehicle') || userMessage.includes('car') || userMessage.includes('مركبة') || userMessage.includes('سيارة')) {
      if (userMessage.includes('add') || userMessage.includes('إضافة') || userMessage.includes('new') || userMessage.includes('جديد')) {
        reply = userMessage.match(/[\u0600-\u06FF]/) ?
          'لإضافة مركبة جديدة: اذهب إلى "المركبات" → "إضافة مركبة" → املأ (رقم اللوحة، الطراز، السنة) → احفظ.' :
          'To add a new vehicle: Go to "Vehicles" → "Add Vehicle" → Fill (plate, model, year) → Save.';
      } else {
        reply = userMessage.match(/[\u0600-\u06FF]/) ?
          'إدارة المركبات: عرض/إضافة/تعديل، تتبع الحالة، تعيين السائق، وجدولة الصيانة.' :
          'Vehicle management: view/add/edit, track status, assign driver, and schedule maintenance.';
      }
    } else if (userMessage.includes('driver') || userMessage.includes('سائق')) {
      reply = userMessage.match(/[\u0600-\u06FF]/) ?
        'السائقون: إضافة سائق جديد، تعديل البيانات، التعيين للمركبات، وتتبع الأداء من قسم "السائقين".' :
        'Drivers: add new driver, edit details, assign to vehicles, and track performance from the "Drivers" section.';
    } else if (userMessage.includes('report') || userMessage.includes('تقرير')) {
      reply = userMessage.match(/[\u0600-\u06FF]/) ?
        'التقارير: استخدم قسم "التقارير" للحصول على تقارير الأسطول، السائقين، الوقود، الصيانة، والحوادث. التصدير PDF/Excel.' :
        'Reports: use the "Reports" section for fleet, drivers, fuel, maintenance, and incidents. Export to PDF/Excel.';
    } else if (userMessage.includes('incident') || userMessage.includes('حادث')) {
      reply = userMessage.match(/[\u0600-\u06FF]/) ?
        'الإبلاغ عن حادث: "تقارير الحوادث" → "حادث جديد" → املأ التفاصيل وأرفِق الصور ثم أرسل.' :
        'Report an incident: "Incident Reports" → "New Incident" → fill details, attach photos, and submit.';
    } else if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('مرحبا') || userMessage.includes('السلام')) {
      reply = userMessage.match(/[\u0600-\u06FF]/) ?
        'مرحباً! أنا مساعد زهران لإدارة الأسطول. كيف أقدر أساعدك؟' :
        'Hello! I\'m the Zahran fleet assistant. How can I help?';
    } else {
      reply = userMessage.match(/[\u0600-\u06FF]/) ?
        'يمكنني مساعدتك في المركبات، السائقين، التقارير، الصيانة، والحوادث. اسأل سؤالاً محدداً للحصول على تفاصيل.' :
        'I can help with vehicles, drivers, reports, maintenance, and incidents. Ask something specific for details.';
    }
    res.json({ reply });

  } catch (error: any) {
    console.error('Chat function error:', error);
    
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({ error: 'Authentication token expired' });
      return;
    }
    
    res.status(500).json({ 
      error: error?.message || 'Internal server error' 
    });
  }
});

export const chatBot = onCall({
  secrets: [googleAiApiKey],
}, async (req) => {
  try {
    console.log("🔍 ChatBot Function - Request data:", req.data);
    
    const message = req.data.message;
    console.log("🔍 ChatBot Function - Message received:", message);
    console.log("🔍 ChatBot Function - Message type:", typeof message);
    console.log("🔍 ChatBot Function - Message length:", message ? message.length : 'null/undefined');

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.warn("❌ Invalid message received:", { message, type: typeof message });
      throw new HttpsError('invalid-argument', 'Message is required and must be a non-empty string');
    }

    // Check for Google AI API key - try multiple sources
    let apiKey = googleAiApiKey.value(); // New secret approach
    if (!apiKey || apiKey === 'placeholder_key_get_from_aistudio') {
      apiKey = process.env.GOOGLE_AI_API_KEY || ''; // Environment variable fallback
    }
    
    console.log("🔍 API Key status:", apiKey ? 'Present' : 'Missing');
    console.log("🔍 API Key source:", googleAiApiKey.value() ? 'Secret' : 'Environment');
    
    if (!apiKey || apiKey === 'placeholder_key_get_from_aistudio' || apiKey === 'your_api_key_here') {
      console.warn("⚠️ Google AI API key not configured properly");
      throw new HttpsError('failed-precondition', 'AI service not configured. Please set up the Google AI API key.');
    }

    // Initialize Google Generative AI
    console.log("🤖 Initializing Google Generative AI...");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    // Create context-aware prompt for fleet management
    const prompt = `You are a helpful AI assistant for a fleet management system called "Zahran Fleet Management". 
    
    The user is asking: "${message.trim()}"
    
    Please provide helpful, professional, and concise responses related to:
    - Fleet management operations
    - Vehicle tracking and maintenance
    - Driver management
    - Incident reporting
    - Project coordination
    - Reports and analytics
    
    Be friendly, professional, and focus on fleet management context. Respond in the same language as the user's question.`;

    console.log("🚀 Generating AI response for prompt...");
    
    let aiResponse;
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      aiResponse = response.text();
      console.log("✅ AI Response generated successfully");
      console.log("📝 AI Response length:", aiResponse.length);
      
      if (!aiResponse || aiResponse.trim().length === 0) {
        throw new Error("Empty response from AI model");
      }
    } catch (aiError: any) {
      console.error("❌ Google AI generation error:", aiError);
      console.error("❌ AI Error type:", typeof aiError);
      console.error("❌ AI Error message:", aiError.message);
      console.error("❌ AI Error stack:", aiError.stack);
      
      // More specific error handling for AI generation
      if (aiError.message.includes('API key')) {
        throw new HttpsError('unauthenticated', 'Invalid API key configuration');
      } else if (aiError.message.includes('quota') || aiError.message.includes('limit')) {
        throw new HttpsError('resource-exhausted', 'API quota exceeded. Please try again later.');
      } else if (aiError.message.includes('safety') || aiError.message.includes('blocked')) {
        throw new HttpsError('invalid-argument', 'Request was blocked by safety filters');
      } else {
        throw new HttpsError('internal', `AI generation failed: ${aiError.message}`);
      }
    }

    return {
      reply: aiResponse,
    };
  } catch (error: any) {
    console.error("🔥 ChatBot function error:", error);
    console.error("🔥 Error type:", typeof error);
    console.error("🔥 Error message:", error.message);
    console.error("🔥 Error stack:", error.stack);
    console.error("🔥 Error code:", error.code);
    
    // Return proper HttpsError based on error type
    if (error instanceof HttpsError) {
      throw error; // Re-throw HttpsError as-is
    }
    
    // Convert other errors to appropriate HttpsError
    if (error.message.includes('API key')) {
      throw new HttpsError('unauthenticated', 'AI service configuration issue. Please check API key setup.');
    } else if (error.message.includes('generation failed')) {
      throw new HttpsError('internal', 'AI generation temporarily unavailable. Please try again in a moment.');
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      throw new HttpsError('deadline-exceeded', 'Network connectivity issue. Please check your connection and try again.');
    } else {
      throw new HttpsError('internal', "I'm having trouble processing your request right now. Please try again in a moment.");
    }
  }
});