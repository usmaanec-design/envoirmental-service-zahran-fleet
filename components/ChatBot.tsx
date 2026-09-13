import React, { useState, useRef, useEffect } from 'react';
import type { Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { auth } from '../firebase/config';
import * as fb from '../firebase/service';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatBotProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ lang, isOpen, onClose }) => {
  const t = TRANSLATIONS[lang];
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: lang === 'ar' ? 
        'مرحباً! أنا مساعدك الذكي لإدارة الأسطول. يمكنني مساعدتك في:\n\n🚗 إدارة المركبات والسائقين\n📊 إنشاء التقارير\n🔧 تتبع الحوادث والإصلاحات\n🔄 نقل المركبات\n👥 إدارة القوى العاملة\n🔍 البحث في بيانات مشروعك (رقم الإقامة، الهوية، إلخ)\n\nكيف يمكنني مساعدتك اليوم؟' : 
        'Hello! I\'m your intelligent fleet management assistant. I can help you with:\n\n🚗 Managing vehicles and drivers\n📊 Creating reports\n🔧 Tracking incidents and repairs\n🔄 Vehicle transfers\n👥 Manpower management\n🔍 Searching your project data (iqama, ID numbers, etc.)\n\nHow can I help you today?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper functions for local data search
  const normalizeDigits = (s: string) => s.replace(/[^\d]/g, '');
  const extractPossibleIds = (text: string) => {
    const t = text.toLowerCase();
    const digitTokens = Array.from(new Set(normalizeDigits(text).match(/\d{6,}/g) || [])); // 6+ digits
    const words = t.split(/\s+/).filter(Boolean);
    return { digitTokens, words };
  };

  type FoundEntity = {
    type: 'Driver' | 'Vehicle' | 'Supervisor' | 'Foreman' | 'Labour' | 'Crewman' | 'Camp Labour' | 'Project Officer';
    name: string;
    iqama?: string;
    idNumber?: string;
    empId?: string;
    extra?: Record<string, string>;
  };

  const answerFromProjectData = async (userLang: 'en'|'ar', freeText: string): Promise<string | null> => {
    try {
      const currentUserRaw = localStorage.getItem('zahran_current_user');
      if (!currentUserRaw) return null;
      const currentUser = JSON.parse(currentUserRaw);
      const email = currentUser?.email;
      if (!email) return null;

      const project = await fb.loadProjectData(email);
      if (!project) return null;

      const { digitTokens } = extractPossibleIds(freeText);
      if (digitTokens.length === 0) return null;

      const matches: FoundEntity[] = [];

      // Search vehicles (updated for direct collections structure)
      if (project.vehicles && Array.isArray(project.vehicles)) {
        project.vehicles.forEach((v: any) => {
          const hit = 
            (v.plateNumber && digitTokens.includes(normalizeDigits(v.plateNumber))) ||
            (v.vehicleNumber && digitTokens.includes(normalizeDigits(v.vehicleNumber))) ||
            (v.id && digitTokens.includes(normalizeDigits(v.id)));
          if (hit) {
            matches.push({
              type: 'Vehicle' as any,
              name: v.plateNumber || v.vehicleNumber || 'Unknown Vehicle',
              extra: {
                model: v.model || '',
                year: v.year || '',
                status: v.status || '',
                assignedDriver: v.assignedDriver || ''
              }
            });
          }
        });
      }

      // Search drivers (updated for direct collections structure) 
      if (project.drivers && Array.isArray(project.drivers)) {
        project.drivers.forEach((d: any) => {
          const hit =
            (d.driverIqama && digitTokens.includes(normalizeDigits(d.driverIqama))) ||
            (d.driverIdNumber && digitTokens.includes(normalizeDigits(d.driverIdNumber))) ||
            (d.iqama && digitTokens.includes(normalizeDigits(d.iqama))) ||
            (d.idNumber && digitTokens.includes(normalizeDigits(d.idNumber))) ||
            (d.id && digitTokens.includes(normalizeDigits(d.id)));
          if (hit) {
            matches.push({
              type: 'Driver',
              name: d.driverName || d.name || 'Unknown Driver',
              iqama: d.driverIqama || d.iqama,
              idNumber: d.driverIdNumber || d.idNumber,
              extra: {
                mobile: d.driverMobile || d.mobile || '',
                assignedVehicle: d.assignedVehicle || ''
              }
            });
          }
        });
      }

      // Search supervisors + foremen + labours (if available in nested structure)
      if (project.supervisors && Array.isArray(project.supervisors)) {
        project.supervisors.forEach((s: any) => {
          // Supervisor
          if (
            (s.iqama && digitTokens.includes(normalizeDigits(s.iqama))) ||
            (s.idNumber && digitTokens.includes(normalizeDigits(s.idNumber))) ||
            (s.empId && digitTokens.includes(normalizeDigits(s.empId)))
          ) {
            matches.push({
              type: 'Supervisor',
              name: s.name,
              iqama: s.iqama,
              idNumber: s.idNumber,
              empId: s.empId
            });
          }

          // Foremen
          if (s.foremen && Array.isArray(s.foremen)) {
            s.foremen.forEach((f: any) => {
              if (
                (f.iqama && digitTokens.includes(normalizeDigits(f.iqama))) ||
                (f.idNumber && digitTokens.includes(normalizeDigits(f.idNumber))) ||
                (f.empId && digitTokens.includes(normalizeDigits(f.empId)))
              ) {
                matches.push({
                  type: 'Foreman',
                  name: f.name,
                  iqama: f.iqama,
                  idNumber: f.idNumber,
                  empId: f.empId,
                  extra: { supervisor: s.name }
                });
              }

              // Labours under this foreman
              if (f.labours && Array.isArray(f.labours)) {
                f.labours.forEach((l: any) => {
                  if (
                    (l.iqama && digitTokens.includes(normalizeDigits(l.iqama))) ||
                    (l.idNumber && digitTokens.includes(normalizeDigits(l.idNumber))) ||
                    (l.empId && digitTokens.includes(normalizeDigits(l.empId)))
                  ) {
                    matches.push({
                      type: 'Labour',
                      name: l.name,
                      iqama: l.iqama,
                      idNumber: l.idNumber,
                      empId: l.empId,
                      extra: { foreman: f.name, supervisor: s.name }
                    });
                  }
                });
              }
            });
          }
        });
      }

      // Search crewmen (if available)
      if (project.crewmen && Array.isArray(project.crewmen)) {
        project.crewmen.forEach((c: any) => {
          if (
            (c.iqama && digitTokens.includes(normalizeDigits(c.iqama))) ||
            (c.idNumber && digitTokens.includes(normalizeDigits(c.idNumber))) ||
            (c.empId && digitTokens.includes(normalizeDigits(c.empId)))
          ) {
            matches.push({
              type: 'Crewman',
              name: c.name,
              iqama: c.iqama,
              idNumber: c.idNumber,
              empId: c.empId
            });
          }
        });
      }

      // Search camp labours (if available)
      if (project.campLabours && Array.isArray(project.campLabours)) {
        project.campLabours.forEach((cl: any) => {
          if (
            (cl.iqama && digitTokens.includes(normalizeDigits(cl.iqama))) ||
            (cl.idNumber && digitTokens.includes(normalizeDigits(cl.idNumber))) ||
            (cl.empId && digitTokens.includes(normalizeDigits(cl.empId)))
          ) {
            matches.push({
              type: 'Camp Labour',
              name: cl.name,
              iqama: cl.iqama,
              idNumber: cl.idNumber,
              empId: cl.empId
            });
          }
        });
      }

      // Search project officers (if available)
      if (project.projectOfficers && Array.isArray(project.projectOfficers)) {
        project.projectOfficers.forEach((po: any) => {
          if (
            (po.iqama && digitTokens.includes(normalizeDigits(po.iqama))) ||
            (po.idNumber && digitTokens.includes(normalizeDigits(po.idNumber)))
          ) {
            matches.push({
              type: 'Project Officer',
              name: po.name,
              iqama: po.iqama,
              idNumber: po.idNumber,
              extra: { role: po.role }
            });
          }
        });
      }

      if (matches.length === 0) {
        return userLang === 'ar'
          ? 'لم يتم العثور على أي شخص أو مركبة بهذا الرقم في مشروعك.'
          : 'No matching person or vehicle found with this number in your project data.';
      }

      // If multiple, show a compact list
      if (matches.length > 1) {
        const list = matches.slice(0, 5).map((m, i) => {
          const role = userLang === 'ar'
            ? (m.type === 'Driver' ? 'سائق' :
               m.type === 'Vehicle' ? 'مركبة' :
               m.type === 'Supervisor' ? 'مشرف' :
               m.type === 'Foreman' ? 'رئيس عمال' :
               m.type === 'Labour' ? 'عامل' :
               m.type === 'Crewman' ? 'عامل ميداني' :
               m.type === 'Camp Labour' ? 'عامل سكن' : 'مسؤول مشروع')
            : m.type;
          const idParts = [
            m.iqama ? (userLang === 'ar' ? `إقامة: ${m.iqama}` : `Iqama: ${m.iqama}`) : '',
            m.idNumber ? (userLang === 'ar' ? `هوية: ${m.idNumber}` : `ID: ${m.idNumber}`) : '',
            m.empId ? (userLang === 'ar' ? `موظف: ${m.empId}` : `EmpID: ${m.empId}`) : ''
          ].filter(Boolean).join(' | ');
          const rel = m.extra
            ? Object.entries(m.extra).map(([k,v]) =>
                userLang === 'ar'
                  ? (k === 'supervisor' ? `مشرف: ${v}` : k === 'foreman' ? `رئيس عمال: ${v}` : k === 'role' ? `الدور: ${v}` : `${k}: ${v}`)
                  : `${k}: ${v}`
              ).join(' | ')
            : '';
          return `${i+1}) ${role} — ${m.name}${idParts ? ` (${idParts})` : ''}${rel ? ` | ${rel}` : ''}`;
        }).join('\n');

        return userLang === 'ar'
          ? `تم العثور على ${matches.length} تطابق:\n${list}`
          : `Found ${matches.length} matches:\n${list}`;
      }

      // Single best match
      const m = matches[0];
      const role = userLang === 'ar'
        ? (m.type === 'Driver' ? 'سائق' :
           m.type === 'Vehicle' ? 'مركبة' :
           m.type === 'Supervisor' ? 'مشرف' :
           m.type === 'Foreman' ? 'رئيس عمال' :
           m.type === 'Labour' ? 'عامل' :
           m.type === 'Crewman' ? 'عامل ميداني' :
           m.type === 'Camp Labour' ? 'عامل سكن' : 'مسؤول مشروع')
        : m.type;

      const lines: string[] = [];
      lines.push(userLang === 'ar' ? `النوع: ${role}` : `Type: ${role}`);
      lines.push(userLang === 'ar' ? `الاسم: ${m.name}` : `Name: ${m.name}`);
      if (m.iqama) lines.push(userLang === 'ar' ? `رقم الإقامة: ${m.iqama}` : `Iqama: ${m.iqama}`);
      if (m.idNumber) lines.push(userLang === 'ar' ? `رقم الهوية: ${m.idNumber}` : `ID Number: ${m.idNumber}`);
      if (m.empId) lines.push(userLang === 'ar' ? `رقم الموظف: ${m.empId}` : `Employee ID: ${m.empId}`);
      if (m.extra) {
        if (m.extra.assignedVehicle) lines.push(userLang === 'ar' ? `المركبة: ${m.extra.assignedVehicle}` : `Assigned Vehicle: ${m.extra.assignedVehicle}`);
        if (m.extra.supervisor) lines.push(userLang === 'ar' ? `المشرف: ${m.extra.supervisor}` : `Supervisor: ${m.extra.supervisor}`);
        if (m.extra.foreman) lines.push(userLang === 'ar' ? `رئيس العمال: ${m.extra.foreman}` : `Foreman: ${m.extra.foreman}`);
        if (m.extra.role) lines.push(userLang === 'ar' ? `الدور: ${m.extra.role}` : `Role: ${m.extra.role}`);
        if (m.extra.mobile) lines.push(userLang === 'ar' ? `الجوال: ${m.extra.mobile}` : `Mobile: ${m.extra.mobile}`);
        if (m.extra.model) lines.push(userLang === 'ar' ? `الطراز: ${m.extra.model}` : `Model: ${m.extra.model}`);
        if (m.extra.year) lines.push(userLang === 'ar' ? `السنة: ${m.extra.year}` : `Year: ${m.extra.year}`);
        if (m.extra.status) lines.push(userLang === 'ar' ? `الحالة: ${m.extra.status}` : `Status: ${m.extra.status}`);
        if (m.extra.assignedDriver) lines.push(userLang === 'ar' ? `السائق: ${m.extra.assignedDriver}` : `Driver: ${m.extra.assignedDriver}`);
      }

      return lines.join('\n');
    } catch {
      return null;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    console.log("🔍 ChatBot Debug - Input text:", inputText);
    console.log("🔍 ChatBot Debug - Input length:", inputText.length);
    console.log("🔍 ChatBot Debug - Input trimmed:", inputText.trim());

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // 1) First try local smart lookup on project data
      const quickAnswer = await answerFromProjectData(lang, inputText);
      if (quickAnswer) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: quickAnswer,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        setInputText('');
        setIsLoading(false);
        return;
      }

      // 2) If no local answer, try Gemini AI API
      const messageToSend = inputText.trim();
      console.log("🚀 Sending message to Gemini AI function:", messageToSend);
      
      // Try to get Firebase ID token first, fallback to email from localStorage
      let authToken = null;
      
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          authToken = await currentUser.getIdToken();
          console.log("🔐 Using Firebase ID token, length:", authToken.length);
        }
      } catch (firebaseError) {
        console.log("⚠️ Firebase token failed, trying localStorage email");
      }
      
      // Fallback to email from localStorage if Firebase token not available
      if (!authToken) {
        const currentUserRaw = localStorage.getItem('zahran_current_user');
        if (currentUserRaw) {
          const currentUser = JSON.parse(currentUserRaw);
          authToken = currentUser?.email;
          if (authToken) {
            console.log("🔐 Using email token:", authToken);
          }
        }
      }
      
      if (!authToken) {
        console.log('❌ No authentication method available');
        throw new Error('API_FALLBACK');
      }
      
      // Call the Gemini chat function
      const functionUrl = (import.meta as any).env?.VITE_CHAT_API || 'https://us-central1-envormental-service-zahran.cloudfunctions.net/chat';
      
      console.log("🌐 Using function URL:", functionUrl);
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          text: messageToSend
        })
      });

      console.log("📥 Response status:", response.status);
      console.log("📥 Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ API call failed:', response.status, errorText);
        throw new Error('API_FALLBACK');
      }

      const data = await response.json();
      console.log("📦 Response data:", data);
      
      const botReply = data.reply || 'Sorry, I couldn\'t process that request.';

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botReply,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

      /* Firebase Cloud Function integration (uncomment when function is deployed):
      const response = await fetch('https://your-project-id.cloudfunctions.net/chatBot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: { message: inputText }
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      const botReply = data.result?.reply || data.reply || 'Sorry, I couldn\'t process that request.';

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botReply,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      */
    } catch (error: any) {
      console.log('ChatBot error:', error);
      console.log('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      let fallbackReply = '';
      
      // If API fails or returns API_FALLBACK error, use intelligent fallback
      if (error.message === 'API_FALLBACK' || error.message.includes('Failed to fetch') || error.message.includes('not configured') || error.message.includes('API key') || error.message.includes('not authenticated')) {
        const userMessage = inputText.toLowerCase();
        
        // Enhanced intelligent fallback responses with emojis and detailed help
        if (userMessage.includes('vehicle') || userMessage.includes('car') || userMessage.includes('truck') || userMessage.includes('مركبة') || userMessage.includes('سيارة')) {
          if (userMessage.includes('add') || userMessage.includes('new') || userMessage.includes('إضافة') || userMessage.includes('جديد')) {
            fallbackReply = lang === 'ar' ? 
              '🚗 لإضافة مركبة جديدة:\n\n1️⃣ اذهب إلى قسم "المركبات"\n2️⃣ اضغط على "إضافة مركبة جديدة"\n3️⃣ املأ المعلومات المطلوبة (رقم اللوحة، الطراز، السنة)\n4️⃣ احفظ البيانات\n\n💡 تأكد من صحة رقم اللوحة لتجنب التكرار!' : 
              '🚗 To add a new vehicle:\n\n1️⃣ Go to "Vehicles" section\n2️⃣ Click "Add New Vehicle"\n3️⃣ Fill required information (plate number, model, year)\n4️⃣ Save the data\n\n💡 Make sure the plate number is correct to avoid duplicates!';
          } else if (userMessage.includes('status') || userMessage.includes('track') || userMessage.includes('حالة') || userMessage.includes('تتبع')) {
            fallbackReply = lang === 'ar' ? 
              '📍 لتتبع حالة المركبات:\n\n🟢 متاحة: جاهزة للاستخدام\n🟡 قيد الاستخدام: مُعيّنة لمشروع\n🔴 قيد الصيانة: غير متاحة مؤقتاً\n⚫ خارج الخدمة: تحتاج إصلاح\n\nيمكنك عرض التفاصيل من لوحة التحكم الرئيسية.' : 
              '📍 To track vehicle status:\n\n🟢 Available: Ready for use\n🟡 In Use: Assigned to project\n🔴 Under Maintenance: Temporarily unavailable\n⚫ Out of Service: Needs repair\n\nYou can view details from the main dashboard.';
          } else {
            fallbackReply = lang === 'ar' ? 
              '🚗 إدارة المركبات:\n\n• عرض جميع المركبات\n• إضافة مركبة جديدة\n• تحديث حالة المركبة\n• تعيين المركبة للسائق\n• جدولة الصيانة\n• تتبع استخدام الوقود\n\nما المساعدة المحددة التي تحتاجها؟' : 
              '🚗 Vehicle Management:\n\n• View all vehicles\n• Add new vehicle\n• Update vehicle status\n• Assign vehicle to driver\n• Schedule maintenance\n• Track fuel usage\n\nWhat specific help do you need?';
          }
        } else if (userMessage.includes('driver') || userMessage.includes('سائق')) {
          if (userMessage.includes('add') || userMessage.includes('new') || userMessage.includes('إضافة') || userMessage.includes('جديد')) {
            fallbackReply = lang === 'ar' ? 
              '👤 لإضافة سائق جديد:\n\n1️⃣ اذهب إلى قسم "السائقين"\n2️⃣ اضغط على "إضافة سائق جديد"\n3️⃣ املأ البيانات (الاسم، رقم الرخصة، الهاتف)\n4️⃣ ارفق صورة الرخصة\n5️⃣ احفظ المعلومات\n\n⚠️ تأكد من صلاحية رخصة القيادة!' : 
              '👤 To add a new driver:\n\n1️⃣ Go to "Drivers" section\n2️⃣ Click "Add New Driver"\n3️⃣ Fill data (name, license number, phone)\n4️⃣ Upload license photo\n5️⃣ Save information\n\n⚠️ Make sure the driving license is valid!';
          } else if (userMessage.includes('assign') || userMessage.includes('تعيين')) {
            fallbackReply = lang === 'ar' ? 
              '🔗 لتعيين سائق لمركبة:\n\n1️⃣ اذهب إلى صفحة المركبة\n2️⃣ اضغط على "تعيين سائق"\n3️⃣ اختر السائق المتاح\n4️⃣ حدد تاريخ البداية والنهاية\n5️⃣ أكد التعيين\n\n💡 تأكد من أن السائق غير مُعيّن لمركبة أخرى!' : 
              '🔗 To assign driver to vehicle:\n\n1️⃣ Go to vehicle page\n2️⃣ Click "Assign Driver"\n3️⃣ Select available driver\n4️⃣ Set start and end dates\n5️⃣ Confirm assignment\n\n💡 Make sure driver isn\'t assigned to another vehicle!';
          } else {
            fallbackReply = lang === 'ar' ? 
              '👥 إدارة السائقين:\n\n• عرض جميع السائقين\n• إضافة سائق جديد\n• تعديل معلومات السائق\n• تعيين السائقين للمركبات\n• تتبع أداء السائقين\n• إدارة الرخص والتراخيص\n\nأي جانب تود المساعدة فيه؟' : 
              '👥 Driver Management:\n\n• View all drivers\n• Add new driver\n• Edit driver information\n• Assign drivers to vehicles\n• Track driver performance\n• Manage licenses and permits\n\nWhich aspect would you like help with?';
          }
        } else if (userMessage.includes('report') || userMessage.includes('analytics') || userMessage.includes('تقرير') || userMessage.includes('تحليل')) {
          fallbackReply = lang === 'ar' ? 
            '📊 التقارير والتحليلات:\n\n📈 تقارير الأسطول:\n• استخدام المركبات\n• أداء السائقين\n• استهلاك الوقود\n• الصيانة والتكاليف\n\n🔄 التصدير:\n• PDF للطباعة\n• Excel للتحليل\n• CSV للبيانات\n\nاختر نوع التقرير المطلوب!' : 
            '📊 Reports & Analytics:\n\n📈 Fleet Reports:\n• Vehicle usage\n• Driver performance\n• Fuel consumption\n• Maintenance & costs\n\n🔄 Export Options:\n• PDF for printing\n• Excel for analysis\n• CSV for data\n\nSelect the report type you need!';
        } else if (userMessage.includes('incident') || userMessage.includes('accident') || userMessage.includes('حادث') || userMessage.includes('حادثة')) {
          fallbackReply = lang === 'ar' ? 
            '⚠️ تقارير الحوادث:\n\n🚨 للإبلاغ عن حادث:\n1️⃣ اذهب إلى "تقارير الحوادث"\n2️⃣ اضغط "إبلاغ عن حادث جديد"\n3️⃣ املأ تفاصيل الحادث\n4️⃣ ارفق الصور\n5️⃣ أرسل التقرير\n\n📋 سيتم إخطار الإدارة فوراً!' : 
            '⚠️ Incident Reports:\n\n🚨 To report an incident:\n1️⃣ Go to "Incident Reports"\n2️⃣ Click "Report New Incident"\n3️⃣ Fill incident details\n4️⃣ Upload photos\n5️⃣ Submit report\n\n📋 Management will be notified immediately!';
        } else if (userMessage.includes('maintenance') || userMessage.includes('repair') || userMessage.includes('service') || userMessage.includes('صيانة') || userMessage.includes('إصلاح')) {
          fallbackReply = lang === 'ar' ? 
            '🔧 إدارة الصيانة:\n\n🗓️ الصيانة الدورية:\n• جدولة الصيانة\n• تذكيرات تلقائية\n• تتبع التكاليف\n\n🚫 صيانة طارئة:\n• وضع علامة "قيد الصيانة"\n• منع الاستخدام\n• تسجيل الأعطال\n\nأي نوع صيانة تحتاج؟' : 
            '🔧 Maintenance Management:\n\n🗓️ Routine Maintenance:\n• Schedule maintenance\n• Automatic reminders\n• Track costs\n\n🚫 Emergency Repairs:\n• Mark "under maintenance"\n• Prevent usage\n• Log breakdowns\n\nWhat type of maintenance do you need?';
        } else if (userMessage.includes('help') || userMessage.includes('مساعدة') || userMessage.includes('hello') || userMessage.includes('مرحبا') || userMessage.includes('hi')) {
          fallbackReply = lang === 'ar' ? 
            '👋 مرحباً بك في نظام إدارة الأسطول!\n\n🔥 الميزات الرئيسية:\n🚗 إدارة المركبات والسائقين\n📊 تقارير شاملة\n⚠️ تتبع الحوادث\n🔧 إدارة الصيانة\n📋 تنسيق المشاريع\n👥 إدارة القوى العاملة\n\n💬 اكتب سؤالك وسأساعدك فوراً!\n\n🤖 ملاحظة: أعمل حالياً في الوضع المحدود بدون الذكاء الاصطناعي الكامل.' : 
            '👋 Welcome to Fleet Management System!\n\n🔥 Main Features:\n🚗 Vehicle & Driver Management\n📊 Comprehensive Reports\n⚠️ Incident Tracking\n🔧 Maintenance Management\n📋 Project Coordination\n👥 Manpower Management\n\n💬 Type your question and I\'ll help immediately!\n\n🤖 Note: Currently running in limited mode without full AI capabilities.';
        } else {
          fallbackReply = lang === 'ar' ? 
            '🤖 معذرةً، لم أستطع فهم طلبك تماماً.\n\n✅ يمكنني مساعدتك في:\n• المركبات والسائقين\n• التقارير والإحصائيات\n• الحوادث والصيانة\n• إدارة المشاريع\n\n💡 جرب أن تسأل عن موضوع محدد مثل:\n"كيف أضيف مركبة جديدة؟"\n"أريد تقرير عن الأسطول"\n"كيف أبلغ عن حادث؟"\n\n⚠️ ملاحظة: الذكاء الاصطناعي الكامل غير متاح حالياً.' : 
            '🤖 Sorry, I didn\'t quite understand your request.\n\n✅ I can help you with:\n• Vehicles and drivers\n• Reports and statistics\n• Incidents and maintenance\n• Project management\n\n💡 Try asking about something specific like:\n"How do I add a new vehicle?"\n"I want a fleet report"\n"How do I report an incident?"\n\n⚠️ Note: Full AI capabilities are not available right now.';
        }
      } else {
        fallbackReply = lang === 'ar' ? 
          'عذراً، حدث خطأ في معالجة طلبك. يرجى المحاولة مرة أخرى.' : 
          'Sorry, there was an error processing your request. Please try again.';
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fallbackReply,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-6 z-50">
      <div className="bg-white rounded-lg shadow-2xl w-96 max-w-[calc(100vw-2rem)] h-[500px] flex flex-col border border-orange-200">
        {/* Header */}
        <div className="text-white p-4 rounded-t-lg flex justify-between items-center" style={{
          background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
        }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <i className="fas fa-robot text-sm"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {lang === 'ar' ? 'المساعد الذكي' : 'AI Assistant'}
              </h3>
              <p className="text-xs opacity-90">
                {lang === 'ar' ? 'متصل الآن' : 'Online now'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-orange-200 text-lg w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                  message.isUser
                    ? 'text-white'
                    : 'bg-white text-gray-800 border border-gray-200 shadow-sm'
                }`}
                style={message.isUser ? {
                  background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
                } : {}}
              >
                <p className="text-sm leading-relaxed">{message.text}</p>
                <span className={`text-xs mt-1 block ${message.isUser ? 'text-orange-100' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-4 py-3 border border-gray-200 shadow-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#f97316' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#f97316', animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: '#f97316', animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg">
          <div className="flex gap-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={lang === 'ar' ? 'اكتب رسالتك هنا...' : 'Type your message here...'}
              className="flex-1 p-3 border border-gray-300 rounded-xl resize-none focus:outline-none transition-colors"
              style={{
                borderColor: inputText ? '#f97316' : '#d1d5db'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#f97316';
                e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = inputText ? '#f97316' : '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
              rows={2}
              disabled={isLoading}
              dir={lang === 'ar' ? 'rtl' : 'ltr'}
            />
            <button
              onClick={sendMessage}
              disabled={!inputText.trim() || isLoading}
              className="text-white px-4 py-2 rounded-xl flex items-center justify-center min-w-[50px] transition-all transform hover:scale-105 shadow-md disabled:opacity-50"
              style={!inputText.trim() || isLoading ? { backgroundColor: '#9ca3af' } : {
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
              }}
            >
              {isLoading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <i className="fas fa-paper-plane"></i>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {lang === 'ar' ? 
              'اضغط Enter للإرسال' : 
              'Press Enter to send'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;