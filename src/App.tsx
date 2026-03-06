/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import { 
  User, 
  GraduationCap, 
  LogIn, 
  LogOut, 
  FileText, 
  PlusCircle, 
  CheckCircle2, 
  ChevronRight,
  ChevronLeft,
  BookOpen,
  ClipboardList,
  UserCircle,
  LayoutDashboard,
  Award,
  Trophy,
  Edit3,
  Search,
  BarChart3,
  Users,
  Settings,
  Trash2,
  ShieldCheck,
  Plus,
  Database,
  RefreshCw,
  Target,
  Download,
  Upload,
  Save,
  X,
  AlertCircle,
  Printer,
  Timer,
} from 'lucide-react';

// --- Types ---

type Role = 'student' | 'teacher' | 'admin' | null;

interface UserData {
  id: number;
  role: 'student' | 'teacher' | 'admin';
  identifier: string;
  name: string;
  class?: string;
  subject?: string;
}

interface Exam {
  id: number;
  subject: string;
  class: string;
  teacher_name?: string;
  created_at: string;
  status: 'draft' | 'active' | 'finished';
  started_at?: string;
  ended_at?: string;
}

interface Question {
  id: number;
  type: 'multiple_choice' | 'essay';
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  option_e?: string;
  correct_answer?: string;
}

interface Submission {
  id: number;
  student_id: number;
  student_name: string;
  student_nis: string;
  exam_id: number;
  subject: string;
  class: string;
  submitted_at: string;
  score: number;
  teacher_name?: string;
}

interface AnswerDetail extends Question {
  answer_id: number;
  answer_text: string;
  score: number;
}

interface Notification {
  message: string;
  type: 'success' | 'error';
  id: number;
}

// --- Components ---

const ExamTimer = ({ startedAt }: { startedAt: string }) => {
  const [elapsed, setElapsed] = useState('00:00:00');

  useEffect(() => {
    const updateTimer = () => {
      const start = new Date(startedAt).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{elapsed}</span>;
};

export default function App() {
  const [role, setRole] = useState<Role>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [view, setView] = useState<'landing' | 'login' | 'dashboard' | 'exam' | 'create_exam' | 'grade_submission' | 'admin'>('landing');
  const [activeTab, setActiveTab] = useState<'exams' | 'grades' | 'analysis' | 'monitoring' | 'admin_classes' | 'admin_students' | 'admin_teachers' | 'admin_settings'>('exams');
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [analysisData, setAnalysisData] = useState<{
    exam: any;
    questions: any[];
    submissions: any[];
  } | null>(null);
  const [analysisFilterDate, setAnalysisFilterDate] = useState('');
  const [analysisFilterSubject, setAnalysisFilterSubject] = useState('');
  const [analysisFilterClass, setAnalysisFilterClass] = useState('');
  const [selectedAnalysisExamId, setSelectedAnalysisExamId] = useState<number | null>(null);
  
  // Admin State
  const [adminClasses, setAdminClasses] = useState<{id: number, name: string}[]>([]);
  const [adminStudents, setAdminStudents] = useState<UserData[]>([]);
  const [adminTeachers, setAdminTeachers] = useState<UserData[]>([]);
  const [adminSettings, setAdminSettings] = useState({
    school_name: '',
    academic_year: '',
    principal_name: '',
    principal_nip: '',
    city: ''
  });
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'class' | 'student' | 'teacher'>('class');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<{ submission: Submission, answers: AnswerDetail[] } | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, string>>({});
  const [gradingScores, setGradingScores] = useState<Record<number, number>>({});
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'offline' | 'demo'>('checking');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setNotification({ message, type, id });
    setTimeout(() => {
      setNotification(prev => prev?.id === id ? null : prev);
    }, 5000);
  };

  // Teacher Create Exam State
  const [newExamSubject, setNewExamSubject] = useState('');
  const [newExamClass, setNewExamClass] = useState('');
  const [newQuestions, setNewQuestions] = useState<Partial<Question>[]>([]);
  const [isEditingExam, setIsEditingExam] = useState(false);
  const [editingExamId, setEditingExamId] = useState<number | null>(null);
  const [availableClasses, setAvailableClasses] = useState<{id: number, name: string}[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState('');

  // --- Mock Data for Demo Mode ---
  useEffect(() => {
    if (isDemoMode && !localStorage.getItem('edu_smart_demo_initialized')) {
      const mockUsers = [
        { id: 1, role: 'admin', identifier: 'admin', name: 'Administrator', password: 'admin', class: null, subject: null },
        { id: 2, role: 'teacher', identifier: 'guru1', name: 'Budi Santoso', password: 'guru', class: null, subject: 'Matematika' },
        { id: 3, role: 'student', identifier: 'siswa1', name: 'Ani Wijaya', password: 'siswa', class: '10-A', subject: null },
        { id: 4, role: 'student', identifier: '654321', name: 'Budi Candra', password: 'siswa', class: '10-A', subject: null },
        { id: 5, role: 'student', identifier: '54321', name: 'Charlie', password: 'siswa', class: '10-B', subject: null },
        { id: 6, role: 'teacher', identifier: '98765', name: 'Diana', password: 'guru', class: null, subject: 'Fisika' }
      ];
      const mockClasses = [{ id: 1, name: '10-A' }, { id: 2, name: '10-B' }];
      
      localStorage.setItem('edu_smart_users', JSON.stringify(mockUsers));
      localStorage.setItem('edu_smart_classes', JSON.stringify(mockClasses));
      localStorage.setItem('edu_smart_exams', JSON.stringify([]));
      localStorage.setItem('edu_smart_questions', JSON.stringify([]));
      localStorage.setItem('edu_smart_submissions', JSON.stringify([]));
      localStorage.setItem('edu_smart_answers', JSON.stringify([]));
      localStorage.setItem('edu_smart_demo_initialized', 'true');
    }
  }, [isDemoMode]);

  const handleDemoApi = async (url: string, options?: RequestInit): Promise<any> => {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.parse(options.body as string) : null;
    const getStorage = (key: string) => JSON.parse(localStorage.getItem(`edu_smart_${key}`) || '[]');
    const setStorage = (key: string, data: any) => localStorage.setItem(`edu_smart_${key}`, JSON.stringify(data));

    // Simulate network delay
    await new Promise(r => setTimeout(r, 300));

    if (url.includes('/api/ping')) return { data: { status: 'ok' }, ok: true, status: 200 };
    if (url.includes('/api/health/supabase')) return { data: { status: 'connected' }, ok: true, status: 200 };

    if (url.includes('/api/login')) {
      const users = getStorage('users');
      const user = users.find((u: any) => u.identifier === body.identifier && u.password === body.password && u.role === body.role);
      if (user) return { data: { success: true, user }, ok: true, status: 200 };
      return { data: { success: false, message: 'Identifier atau password salah' }, ok: false, status: 401 };
    }

    if (url.includes('/api/admin/classes')) {
      if (method === 'GET') return { data: getStorage('classes'), ok: true, status: 200 };
      if (method === 'POST') {
        const classes = getStorage('classes');
        classes.push({ id: Date.now(), name: body.name });
        setStorage('classes', classes);
        return { data: { success: true }, ok: true, status: 200 };
      }
    }

    if (url.includes('/api/user/change-password')) {
      const users = getStorage('users');
      const userIndex = users.findIndex((u: any) => u.id === body.userId && u.password === body.oldPassword);
      if (userIndex > -1) {
        users[userIndex].password = body.newPassword;
        setStorage('users', users);
        return { data: { success: true }, ok: true, status: 200 };
      }
      return { data: { success: false, message: 'Password lama salah' }, ok: false, status: 401 };
    }

    if (url.includes('/api/exams')) {
      if (method === 'GET') {
        const exams = getStorage('exams');
        const users = getStorage('users');
        const { role, userId, studentClass } = Object.fromEntries(new URLSearchParams(url.split('?')[1]));
        
        if (role === 'teacher') {
          return { data: exams.filter((e: any) => e.teacher_id === parseInt(userId)), ok: true, status: 200 };
        } else {
          const submissions = getStorage('submissions');
          const submittedExamIds = submissions.filter((s: any) => s.student_id === parseInt(userId)).map((s: any) => s.exam_id);
          const availableExams = exams.filter((e: any) => e.class === studentClass && !submittedExamIds.includes(e.id));
          return { data: availableExams.map((e: any) => ({ ...e, teacher_name: users.find((u: any) => u.id === e.teacher_id)?.name })), ok: true, status: 200 };
        }
      }
      if (method === 'POST') {
        const exams = getStorage('exams');
        const questions = getStorage('questions');
        const newExam = { id: Date.now(), ...body, created_at: new Date().toISOString() };
        exams.push(newExam);
        setStorage('exams', exams);
        
        const newQuestions = body.questions.map((q: any) => ({ id: Math.random(), exam_id: newExam.id, ...q }));
        questions.push(...newQuestions);
        setStorage('questions', questions);
        
        return { data: { success: true, examId: newExam.id }, ok: true, status: 200 };
      }
    }

    if (url.includes('/api/admin/settings')) {
      if (method === 'GET') return { data: getStorage('settings') || {}, ok: true, status: 200 };
      if (method === 'POST') {
        setStorage('settings', body);
        return { data: { success: true }, ok: true, status: 200 };
      }
    }

    if (url.includes('/api/exams/') && url.includes('/detailed-analysis')) {
      const examId = parseInt(url.split('/')[3]);
      const exams = getStorage('exams');
      const exam = exams.find((e: any) => e.id === examId);
      if (!exam) return { data: { success: false }, ok: false, status: 404 };

      const questions = getStorage('questions').filter((q: any) => q.exam_id === examId);
      const allUsers = getStorage('users');
      const classStudents = allUsers.filter((u: any) => u.role === 'student' && u.class === exam.class);
      const submissions = getStorage('submissions').filter((s: any) => s.exam_id === examId);
      const answers = getStorage('answers');

      const detailedSubmissions = classStudents.map((student: any) => {
        const sub = submissions.find((s: any) => s.student_id === student.id);
        return {
          student_id: student.id,
          student_name: student.name,
          student_nis: student.identifier,
          has_submitted: !!sub,
          score: sub?.score || 0,
          answers: sub ? answers.filter((a: any) => a.submission_id === sub.id) : []
        };
      });

      return {
        data: {
          exam,
          questions,
          submissions: detailedSubmissions
        },
        ok: true,
        status: 200
      };
    }

    if (url.includes('/api/exams/') && url.includes('/status')) {
      if (method === 'PATCH') {
        const examId = parseInt(url.split('/')[3]);
        const exams = getStorage('exams');
        const examIndex = exams.findIndex((e: any) => e.id === examId);
        if (examIndex > -1) {
          exams[examIndex].status = body.status;
          if (body.status === 'active') exams[examIndex].started_at = new Date().toISOString();
          if (body.status === 'finished') exams[examIndex].ended_at = new Date().toISOString();
          setStorage('exams', exams);
          return { data: { success: true }, ok: true, status: 200 };
        }
        return { data: { success: false, message: 'Exam not found' }, ok: false, status: 404 };
      }
    }

    return { data: [], ok: true, status: 200 };
  };

  const safeFetch = async (url: string, options?: RequestInit) => {
    if (isDemoMode) return handleDemoApi(url, options);
    
    const fetchOptions = { ...options };
    if (fetchOptions.body && typeof fetchOptions.body === 'string' && 
       (fetchOptions.body.trim().startsWith('{') || fetchOptions.body.trim().startsWith('['))) {
      fetchOptions.headers = {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers || {})
      };
    }

    try {
      const res = await fetch(url, fetchOptions);
      const text = await res.text();
      let data = null;
      try {
        data = text && (text.startsWith('{') || text.startsWith('[')) ? JSON.parse(text) : text;
      } catch (e) {
        console.error("JSON Parse Error:", e, "Text:", text);
        data = text;
      }
      return { data, ok: res.ok, status: res.status, rawText: text };
    } catch (e: any) {
      console.error("Fetch Error:", e);
      return { data: null, ok: false, status: 0, error: e.message || "Network error" };
    }
  };

  useEffect(() => {
    const savedMode = localStorage.getItem('edu_smart_mode');
    if (savedMode === 'demo') {
      setIsDemoMode(true);
      setDbStatus('demo');
      return;
    }

    const checkDb = async () => {
      // First, check if API server is even reachable
      const pingResult = await safeFetch('/api/ping');
      if (!pingResult.ok) {
        setDbStatus('offline');
        let msg = `Server API tidak dapat dijangkau (Status: ${pingResult.status}).`;
        const errorData = pingResult.data;
        if (typeof errorData === 'string' && errorData) {
          msg += `\nDetail: ${errorData}`;
        } else if (errorData?.message) {
          msg += `\nDetail: ${errorData.message}`;
        }
        
        if (errorData?.stack) {
          msg += `\n\nStack: ${errorData.stack}`;
        }
        setDbErrorMessage(msg);
        if (dbStatus === 'checking') setShowSetupModal(true);
        return;
      }

      const result = await safeFetch('/api/health/supabase');
      const { data, ok, error } = result;
      setDbStatus(ok ? 'online' : 'offline');
      if (!ok) {
        let msg = (typeof data === 'string' ? data : (data?.message || data?.details)) || error || 'Gagal terhubung ke database melalui API';
        if (data?.stack) {
          msg += `\n\nStack: ${data.stack}`;
        }
        setDbErrorMessage(msg);
        if (dbStatus === 'checking') {
          setShowSetupModal(true);
        }
      } else {
        setDbErrorMessage(null);
      }
    };
    checkDb();
    const interval = setInterval(checkDb, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        fetchAdminData();
      } else {
        fetchExams();
        fetchSubmissions();
        if (user.role === 'teacher') {
          fetchClasses();
        }
      }
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAdminData();
    }
  }, [user, selectedClassFilter]);

  const fetchClasses = async () => {
    try {
      const { data, ok } = await safeFetch('/api/admin/classes');
      if (ok) setAvailableClasses(data || []);
    } catch (err) {
      console.error("Failed to fetch classes", err);
    }
  };


          // We need an endpoint to get single exam status, reusing the list endpoint might be inefficient but works if we filter
          // Or better, create a specific endpoint or just fetch the list and find the exam.
          // Since /api/exams returns list, let's use that for now or assume we can fetch /api/exams/:id if implemented.
          // Checking server.ts, there is no GET /api/exams/:id.
          // But GET /api/exams returns list.
          


  const fetchSettings = async () => {
    try {
      const { data, ok } = await safeFetch('/api/admin/settings');
      if (ok) setAdminSettings(data || {});
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const [classesRes, studentsRes, teachersRes] = await Promise.all([
        safeFetch('/api/admin/classes'),
        safeFetch(`/api/admin/students${selectedClassFilter ? `?class=${selectedClassFilter}` : ''}`),
        safeFetch('/api/admin/teachers')
      ]);
      if (classesRes.ok) setAdminClasses(classesRes.data);
      if (studentsRes.ok) setAdminStudents(studentsRes.data);
      if (teachersRes.ok) setAdminTeachers(teachersRes.data);
      await fetchSettings();
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchAdminData();
    } else if (user?.role === 'teacher') {
      fetchSettings();
    }
  }, [user, selectedClassFilter]);

  const fetchExams = async () => {
    if (!user) return;
    try {
      const { data, ok } = await safeFetch(`/api/exams?role=${user.role}&userId=${user.id}&studentClass=${user.class || ''}`);
      if (ok) setExams(data);
    } catch (err) {
      console.error("Failed to fetch exams", err);
    }
  };

  const fetchSubmissions = async () => {
    if (!user) return;
    try {
      const endpoint = user.role === 'teacher' 
        ? `/api/submissions/teacher/${user.id}` 
        : `/api/submissions/student/${user.id}`;
      const { data, ok } = await safeFetch(endpoint);
      if (ok) setSubmissions(data);
    } catch (err) {
      console.error("Failed to fetch submissions", err);
    }
  };

  const fetchAnalysis = async (examId: number) => {
    try {
      console.log(`Requesting detailed analysis for exam: ${examId}`);
      const { data, ok, status } = await safeFetch(`/api/exams/${examId}/detailed-analysis`);
      if (!ok) {
        console.error(`Analysis request failed with status ${status}`);
        throw new Error(`Server returned ${status}`);
      }
      setAnalysisData(data);
      setSelectedAnalysisExamId(examId);
      if (user?.role === 'teacher') fetchSettings();
    } catch (err) {
      console.error("Failed to fetch analysis", err);
    }
  };

  const updateExamStatus = async (examId: number, status: 'active' | 'finished') => {
    console.log(`Updating exam status: ${examId} to ${status}`);
    try {
      const { ok, error, data } = await safeFetch(`/api/exams/${examId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      
      console.log('Update response:', { ok, error, data });

      if (ok) {
        fetchExams();
        setNotification({ 
          message: status === 'active' ? 'Ujian dimulai.' : 'Ujian telah diakhiri.', 
          type: 'success', 
          id: Date.now() 
        });
      } else {
        const serverMessage = data && (typeof data === 'string' ? data : data.message);
        throw new Error(serverMessage || error || 'Unknown error');
      }
    } catch (err: any) {
      console.error("Failed to update exam status", err);
      setNotification({ message: `Gagal mengubah status ujian: ${err.message}`, type: 'error', id: Date.now() });
    }
  };

  const downloadAnalysisExcel = () => {
    if (!analysisData) return;
    
    const { exam, questions, submissions } = analysisData;
    const wb = XLSX.utils.book_new();
    
    // Prepare header info
    const headerInfo = [
      ['ANALISIS HASIL EVALUASI'],
      [],
      ['Sekolah :', '', adminSettings.school_name || '-'],
      ['Mata Pelajaran :', '', exam.subject],
      ['Kelas / Semester :', '', exam.class],
      ['Tahun Pelajaran :', '', adminSettings.academic_year || '-'],
      ['Banyak soal :', '', questions.length],
      []
    ];

    // Table Header
    const tableHeader1 = ['No', 'NAMA', 'SKOR YANG DIPEROLEH', ...Array(questions.length - 1).fill(''), 'JML', '%', 'KETUNTASAN', '', 'KET'];
    const tableHeader2 = ['', '', ...questions.map((_, i) => i + 1), 'BENAR', 'KETER', 'BELAJAR', '', ''];
    const tableHeader3 = ['', '', ...Array(questions.length).fill(''), '', 'CAPAIAN', 'YA', 'TDK', ''];

    const rows = [...headerInfo, tableHeader1, tableHeader2, tableHeader3];

    // Data Rows
    submissions.forEach((s, idx) => {
      const totalQuestions = questions.length;
      const correctCount = s.has_submitted ? s.answers.filter((a: any) => {
        const q = questions.find(quest => quest.id === a.question_id);
        if (!q) return false;
        if (q.type === 'multiple_choice') return a.score > 0;
        return (a.score || 0) >= (100 / totalQuestions) * 0.7;
      }).length : 0;
      
      const percentage = s.has_submitted ? ((correctCount / totalQuestions) * 100).toFixed(1) : '0.0';
      const isPassed = s.has_submitted && parseFloat(percentage) >= 70;

      const row = [
        idx + 1,
        s.student_name,
        ...questions.map(q => {
          if (!s.has_submitted) return '-';
          const ans = s.answers.find((a: any) => a.question_id === q.id);
          const isCorrect = q.type === 'multiple_choice' ? (ans?.score > 0) : ((ans?.score || 0) >= (100 / totalQuestions) * 0.7);
          return isCorrect ? 1 : 0;
        }),
        s.has_submitted ? correctCount : '-',
        s.has_submitted ? percentage : '-',
        isPassed ? '√' : '',
        (s.has_submitted && !isPassed) ? '√' : '',
        s.has_submitted ? '' : 'Belum'
      ];
      rows.push(row);
    });

    // Footer Rows
    const footerJumlah = ['Jumlah', '', ...questions.map(q => {
      return submissions.filter(s => {
        if (!s.has_submitted) return false;
        const ans = s.answers.find((a: any) => a.question_id === q.id);
        if (q.type === 'multiple_choice') return ans?.score > 0;
        return (ans?.score || 0) >= (100 / questions.length) * 0.7;
      }).length;
    }), '', '', '', '', ''];
    
    const footerPercentage = ['%Ketuntasan', '', ...questions.map(q => {
      const submittedCount = submissions.filter(s => s.has_submitted).length;
      if (submittedCount === 0) return '0';
      const correctCount = submissions.filter(s => {
        if (!s.has_submitted) return false;
        const ans = s.answers.find((a: any) => a.question_id === q.id);
        if (q.type === 'multiple_choice') return ans?.score > 0;
        return (ans?.score || 0) >= (100 / questions.length) * 0.7;
      }).length;
      return ((correctCount / submittedCount) * 100).toFixed(0);
    }), '', '', '', '', ''];

    rows.push(footerJumlah, footerPercentage);
    rows.push([]);

    // Column widths
    const colWidths = [
      { wch: 5 },  // No
      { wch: 35 }, // Nama
      ...questions.map(() => ({ wch: 4 })), // Questions
      { wch: 8 },  // JML
      { wch: 8 },  // %
      { wch: 8 },  // YA
      { wch: 8 },  // TDK
      { wch: 15 }  // KET
    ];

    // Signatures
    const date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const teacherColStart = colWidths.length - 2;
    
    const sigRow1 = Array(colWidths.length).fill('');
    sigRow1[teacherColStart] = `${adminSettings.city || 'Kota'}, ${date}`;
    
    const sigRow2 = Array(colWidths.length).fill('');
    sigRow2[0] = 'Mengetahui :';
    sigRow2[teacherColStart] = 'Guru Mapel';
    
    const sigRow3 = Array(colWidths.length).fill('');
    sigRow3[0] = 'Kepala Sekolah';
    
    const sigRowName = Array(colWidths.length).fill('');
    sigRowName[0] = adminSettings.principal_name || '(Nama Kepala Sekolah)';
    sigRowName[teacherColStart] = user?.name || '(Nama Guru)';
    
    const sigRowNip = Array(colWidths.length).fill('');
    sigRowNip[0] = `Nip. ${adminSettings.principal_nip || '-'}`;
    sigRowNip[teacherColStart] = `Nip. ${user?.identifier || '-'}`;

    rows.push(sigRow1, sigRow2, sigRow3);
    rows.push([], [], []);
    rows.push(sigRowName, sigRowNip);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Page Setup: Landscape and A4 (paperSize 9)
    ws['!pageSetup'] = { orientation: 'landscape', paperSize: 9 };
    ws['!printOptions'] = { horizontalCentered: true };

    // Styling
    const borderStyle = {
      top: { style: 'thin' },
      bottom: { style: 'thin' },
      left: { style: 'thin' },
      right: { style: 'thin' }
    };

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    // Apply styles to table area (starts at row index 8)
    // Table ends at footerPercentage which is rows.length - 8 (before signatures and empty rows)
    const tableEndRow = 10 + submissions.length + 2; // header(3) + data + footer(2) - 1 for 0-index

    for (let R = 8; R <= tableEndRow; ++R) {
      for (let C = 0; C <= range.e.c; ++C) {
        const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
        if (!ws[cell_ref]) ws[cell_ref] = { t: 's', v: '' };
        if (!ws[cell_ref].s) ws[cell_ref].s = {};
        ws[cell_ref].s.border = borderStyle;
        ws[cell_ref].s.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
        
        // Bold table headers (rows 8, 9, 10)
        if (R >= 8 && R <= 10) {
          if (!ws[cell_ref].s.font) ws[cell_ref].s.font = {};
          ws[cell_ref].s.font.bold = true;
        }
      }
    }

    // Left align Nama column in data rows
    for (let R = 11; R <= 11 + submissions.length - 1; ++R) {
      const cell_ref = XLSX.utils.encode_cell({ c: 1, r: R });
      if (ws[cell_ref] && ws[cell_ref].s) {
        ws[cell_ref].s.alignment.horizontal = 'left';
      }
    }

    // Right align Footer Labels (Jumlah, %Ketuntasan)
    [tableEndRow - 1, tableEndRow].forEach(R => {
      const cell_ref = XLSX.utils.encode_cell({ c: 0, r: R });
      if (ws[cell_ref] && ws[cell_ref].s) {
        ws[cell_ref].s.alignment.horizontal = 'right';
      }
    });

    // Title styling (Bold)
    if (ws['A1']) {
      ws['A1'].s = {
        alignment: { horizontal: 'center', vertical: 'center' },
        font: { bold: true, sz: 14 }
      };
    }

    // Signature Styling
    const lastRow = range.e.r;
    const nameRow = lastRow - 1;
    const nipRow = lastRow;
    const signStartRow = tableEndRow + 2; // sigRow1 (city, date)

    // Principal Side (Column A)
    for (let R = signStartRow; R <= lastRow; R++) {
      const cell_ref = XLSX.utils.encode_cell({ c: 0, r: R });
      if (ws[cell_ref]) {
        if (!ws[cell_ref].s) ws[cell_ref].s = {};
        ws[cell_ref].s.alignment = { horizontal: 'left', wrapText: true };
        if (R >= nameRow) {
          if (!ws[cell_ref].s.font) ws[cell_ref].s.font = {};
          ws[cell_ref].s.font.bold = true;
        }
      }
    }

    // Teacher Side (teacherColStart)
    for (let R = signStartRow; R <= lastRow; R++) {
      const cell_ref = XLSX.utils.encode_cell({ c: teacherColStart, r: R });
      if (ws[cell_ref]) {
        if (!ws[cell_ref].s) ws[cell_ref].s = {};
        ws[cell_ref].s.alignment = { horizontal: 'left', wrapText: true };
        if (R >= nameRow) {
          if (!ws[cell_ref].s.font) ws[cell_ref].s.font = {};
          ws[cell_ref].s.font.bold = true;
        }
      }
    }

    ws['!cols'] = colWidths;

    // Merging cells
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colWidths.length - 1 } }, // Title
      // Labels A3:B3 to A7:B7
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 1 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: 1 } },
      // Table Header Merges
      { s: { r: 8, c: 0 }, e: { r: 10, c: 0 } }, // No
      { s: { r: 8, c: 1 }, e: { r: 10, c: 1 } }, // Nama
      { s: { r: 8, c: 2 }, e: { r: 8, c: 2 + questions.length - 1 } }, // Skor
      { s: { r: 8, c: 2 + questions.length }, e: { r: 9, c: 2 + questions.length } }, // JML
      { s: { r: 8, c: 2 + questions.length + 1 }, e: { r: 10, c: 2 + questions.length + 1 } }, // %
      { s: { r: 8, c: 2 + questions.length + 2 }, e: { r: 9, c: 2 + questions.length + 3 } }, // Ketuntasan
      { s: { r: 8, c: 2 + questions.length + 4 }, e: { r: 10, c: 2 + questions.length + 4 } }, // KET
      // Footer Merges (A:B)
      { s: { r: tableEndRow - 1, c: 0 }, e: { r: tableEndRow - 1, c: 1 } }, // Jumlah
      { s: { r: tableEndRow, c: 0 }, e: { r: tableEndRow, c: 1 } }, // %Ketuntasan
      // Signature Merges (Principal Side A:B)
      { s: { r: tableEndRow + 3, c: 0 }, e: { r: tableEndRow + 3, c: 1 } }, // Mengetahui :
      { s: { r: tableEndRow + 4, c: 0 }, e: { r: tableEndRow + 4, c: 1 } }, // Kepala Sekolah
      { s: { r: tableEndRow + 8, c: 0 }, e: { r: tableEndRow + 8, c: 1 } }, // Nama Kepala Sekolah
      { s: { r: tableEndRow + 9, c: 0 }, e: { r: tableEndRow + 9, c: 1 } }, // NIP Kepala Sekolah
      // Signature Merges (Teacher Side Last-1:Last)
      { s: { r: tableEndRow + 2, c: colWidths.length - 2 }, e: { r: tableEndRow + 2, c: colWidths.length - 1 } }, // Date
      { s: { r: tableEndRow + 3, c: colWidths.length - 2 }, e: { r: tableEndRow + 3, c: colWidths.length - 1 } }, // Guru Mapel
      { s: { r: tableEndRow + 8, c: colWidths.length - 2 }, e: { r: tableEndRow + 8, c: colWidths.length - 1 } }, // Nama Guru
      { s: { r: tableEndRow + 9, c: colWidths.length - 2 }, e: { r: tableEndRow + 9, c: colWidths.length - 1 } }, // NIP Guru
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Analisis');
    XLSX.writeFile(wb, `Analisis_${exam.subject}_${exam.class}.xlsx`);
  };

  const fetchSubmissionDetails = async (submissionId: number) => {
    try {
      const { data, ok } = await safeFetch(`/api/submissions/${submissionId}/details`);
      if (ok && data) {
        // Map server response to our AnswerDetail type
        const mappedAnswers = data.answers.map((a: any) => ({
          ...a,
          answer_id: a.id // Ensure we have answer_id for gradingScores
        }));
        setActiveSubmission({ ...data, answers: mappedAnswers });
        
        // Initialize grading scores with automatic calculation for multiple choice
        const pointPerQuestion = 100 / mappedAnswers.length;
        const initialScores: Record<number, number> = {};
        mappedAnswers.forEach((ans: any) => {
          if (ans.type === 'multiple_choice') {
            initialScores[ans.answer_id] = ans.answer_text === ans.correct_answer ? pointPerQuestion : 0;
          } else {
            initialScores[ans.answer_id] = ans.score; // Keep existing score for essays
          }
        });
        setGradingScores(initialScores);
        setView('grade_submission');
      }
    } catch (err) {
      console.error("Failed to fetch submission details", err);
    }
  };

  // --- Admin Actions ---
  const handleAdminAction = async (action: 'add' | 'edit' | 'delete', type: 'class' | 'student' | 'teacher', id?: number) => {
    const pluralType = type === 'class' ? 'classes' : `${type}s`;
    if (action === 'delete') {
      if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
      try {
        const { ok } = await safeFetch(`/api/admin/${pluralType}/${id}`, { method: 'DELETE' });
        if (ok) fetchAdminData();
      } catch (err) { console.error(err); }
      return;
    }

    if (action === 'add') {
      setEditingItem(null);
      setFormData({});
      setModalType(type);
      setIsModalOpen(true);
    } else if (action === 'edit') {
      const item = type === 'class' ? adminClasses.find(c => c.id === id) : 
                   type === 'student' ? adminStudents.find(s => s.id === id) : 
                   adminTeachers.find(t => t.id === id);
      setEditingItem(item);
      setFormData(item);
      setModalType(type);
      setIsModalOpen(true);
    }
  };

  const saveAdminData = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingItem ? 'PUT' : 'POST';
    const pluralType = modalType === 'class' ? 'classes' : `${modalType}s`;
    const url = `/api/admin/${pluralType}${editingItem ? `/${editingItem.id}` : ''}`;
    
    try {
      const { data, ok } = await safeFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (ok) {
        setIsModalOpen(false);
        fetchAdminData();
        showNotification(`Berhasil ${editingItem ? 'memperbarui' : 'menambah'} data!`);
      } else {
        showNotification(data?.message || 'Terjadi kesalahan', 'error');
      }
    } catch (err) { 
      console.error(err);
      showNotification('Terjadi kesalahan koneksi', 'error');
    }
  };

  const downloadStudentTemplate = () => {
    const templateData = [
      { 'Nama Siswa': 'Contoh Siswa', 'NIS': '123456', 'Kelas': 'X-IPA-1', 'Password': 'password123' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Siswa");
    XLSX.writeFile(workbook, "Template_Upload_Siswa.xlsx");
  };

  const handleStudentExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          showNotification("File kosong atau format tidak sesuai", "error");
          setIsUploading(false);
          return;
        }

        // Map Excel headers to database fields
        const students = data.map((row: any) => ({
          name: row['Nama Siswa'],
          identifier: row['NIS'],
          class: row['Kelas'],
          password: row['Password'] || 'siswa123'
        })).filter(s => s.name && s.identifier && s.class);

        if (students.length === 0) {
          showNotification("Format kolom tidak sesuai. Gunakan: 'Nama Siswa', 'NIS', 'Kelas'", "error");
          setIsUploading(false);
          return;
        }

        if (confirm(`Yakin ingin mengupload ${students.length} data siswa?`)) {
          const { data: resData, ok } = await safeFetch('/api/admin/students/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ students })
          });

          if (ok) {
            showNotification(`Berhasil mengupload ${resData.count} siswa!`);
            fetchAdminData();
          } else {
            showNotification(resData?.message || "Gagal mengupload data", "error");
          }
        }
      } catch (err) {
        console.error("Excel processing error", err);
        showNotification("Gagal memproses file Excel", "error");
      } finally {
        setIsUploading(false);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      showNotification("Gagal membaca file", "error");
      setIsUploading(false);
    };
    reader.readAsBinaryString(file);
  };

  const downloadTeacherTemplate = () => {
    const templateData = [
      { 'Nama Guru': 'Contoh Guru', 'NIP': '1987654321', 'Mata Pelajaran': 'Matematika', 'Password': 'password123' }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Guru");
    XLSX.writeFile(workbook, "Template_Upload_Guru.xlsx");
  };

  const handleTeacherExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          showNotification("File kosong atau format tidak sesuai", "error");
          setIsUploading(false);
          return;
        }

        // Map Excel headers to database fields
        const teachers = data.map((row: any) => ({
          name: row['Nama Guru'],
          identifier: row['NIP'],
          subject: row['Mata Pelajaran'],
          password: row['Password'] || 'guru123'
        })).filter(t => t.name && t.identifier && t.subject);

        if (teachers.length === 0) {
          showNotification("Format kolom tidak sesuai. Gunakan: 'Nama Guru', 'NIP', 'Mata Pelajaran'", "error");
          setIsUploading(false);
          return;
        }

        if (confirm(`Yakin ingin mengupload ${teachers.length} data guru?`)) {
          const { data: resData, ok } = await safeFetch('/api/admin/teachers/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teachers })
          });

          if (ok) {
            showNotification(`Berhasil mengupload ${resData.count} guru!`);
            fetchAdminData();
          } else {
            showNotification(resData?.message || "Gagal mengupload data", "error");
          }
        }
      } catch (err) {
        console.error("Excel processing error", err);
        showNotification("Gagal memproses file Excel", "error");
      } finally {
        setIsUploading(false);
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      showNotification("Gagal membaca file", "error");
      setIsUploading(false);
    };
    reader.readAsBinaryString(file);
  };

  const downloadExamTemplate = () => {
    const templateData = [
      { 
        'Tipe': 'multiple_choice', 
        'Pertanyaan': 'Berapakah 1 + 1?', 
        'Pilihan A': '1', 
        'Pilihan B': '2', 
        'Pilihan C': '3', 
        'Pilihan D': '4', 
        'Pilihan E': '5', 
        'Jawaban Benar': 'B' 
      },
      { 
        'Tipe': 'essay', 
        'Pertanyaan': 'Jelaskan apa itu fotosintesis!', 
        'Pilihan A': '', 
        'Pilihan B': '', 
        'Pilihan C': '', 
        'Pilihan D': '', 
        'Pilihan E': '', 
        'Jawaban Benar': '' 
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Soal");
    XLSX.writeFile(workbook, "Template_Soal_Ujian.xlsx");
  };

  const handleExamExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          showNotification("File kosong atau format tidak sesuai", "error");
          setIsUploading(false);
          return;
        }

        const questions = data.map((row: any) => ({
          type: row['Tipe'] === 'essay' ? 'essay' : 'multiple_choice',
          question_text: row['Pertanyaan'],
          option_a: row['Pilihan A']?.toString() || '',
          option_b: row['Pilihan B']?.toString() || '',
          option_c: row['Pilihan C']?.toString() || '',
          option_d: row['Pilihan D']?.toString() || '',
          option_e: row['Pilihan E']?.toString() || '',
          correct_answer: row['Jawaban Benar']?.toString() || ''
        })).filter(q => q.question_text);

        if (questions.length === 0) {
          showNotification("Tidak ada pertanyaan valid ditemukan", "error");
          setIsUploading(false);
          return;
        }

        setNewQuestions([...newQuestions, ...questions]);
        showNotification(`Berhasil mengimpor ${questions.length} soal!`);
      } catch (err) {
        console.error("Excel processing error", err);
        showNotification("Gagal memproses file Excel", "error");
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.onerror = () => {
      showNotification("Gagal membaca file", "error");
      setIsUploading(false);
    };
    reader.readAsBinaryString(file);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showNotification("Password baru tidak cocok", "error");
      return;
    }
    if (!user) return;

    try {
      const { data, ok } = await safeFetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: user.id,
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (ok && data?.success) {
        showNotification("Password berhasil diubah!");
        setIsChangePasswordOpen(false);
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        if (isDemoMode && user) {
          const updatedUser = { ...user, password: passwordData.newPassword };
          setUser(updatedUser);
          localStorage.setItem('edu_smart_user', JSON.stringify(updatedUser));
        }
      } else {
        showNotification(data?.message || "Gagal mengubah password", "error");
      }
    } catch (err) {
      showNotification("Terjadi kesalahan koneksi", "error");
    }
  };

  const submitGrades = async () => {
    if (!activeSubmission) return;
    try {
      const { data, ok } = await safeFetch(`/api/submissions/${activeSubmission.submission.id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades: gradingScores })
      });
      if (ok && data?.success) {
        showNotification("Penilaian berhasil disimpan!");
        setView('dashboard');
        fetchSubmissions();
      }
    } catch (err) {
      showNotification("Gagal menyimpan penilaian", "error");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // For admin, force identifier to 'admin'
    const loginIdentifier = role === 'admin' ? 'admin' : identifier;
    


    if (!loginIdentifier && role !== 'admin') {
      setError('Identifier harus diisi');
      return;
    }

    try {
      const { data, ok } = await safeFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, password, role })
      });
      if (ok && data?.success) {
        setUser(data.user);
        if (data.user.role === 'admin') {
          setView('admin');
          setActiveTab('admin_classes');
        } else {
          setView('dashboard');
        }
      } else {
        setError(data?.message || 'Login gagal');
      }
    } catch (err) {
      setError("Terjadi kesalahan koneksi");
    }
  };

  const saveSettings = async () => {
    try {
      const { ok } = await safeFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminSettings)
      });
      if (ok) {
        showNotification("Pengaturan berhasil disimpan!");
      } else {
        showNotification("Gagal menyimpan pengaturan", "error");
      }
    } catch (err) {
      showNotification("Terjadi kesalahan koneksi", "error");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setRole(null);
    setView('landing');
    setIdentifier('');
    setPassword('');
    setAdminClasses([]);
    setAdminStudents([]);
    setAdminTeachers([]);
  };

  const startExam = async (exam: Exam) => {
    try {
      const { data, ok } = await safeFetch(`/api/exams/${exam.id}/questions`);
      if (ok) {
        setQuestions(data);
        setActiveExam(exam);
        setStudentAnswers({});
        setView('exam');
      }
    } catch (err) {
      console.error("Failed to fetch questions", err);
    }
  };

  const submitExam = async () => {
    if (!activeExam || !user) return;
    try {
      const { data, ok } = await safeFetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user.id,
          exam_id: activeExam.id,
          answers: studentAnswers
        })
      });
      if (ok && data?.success) {
        alert("Ujian berhasil dikumpulkan!");
        setView('dashboard');
        fetchExams();
      }
    } catch (err) {
      alert("Gagal mengumpulkan ujian");
    }
  };

  const addQuestion = (type: 'multiple_choice' | 'essay') => {
    setNewQuestions([...newQuestions, { 
      type, 
      question_text: '', 
      option_a: '', 
      option_b: '', 
      option_c: '', 
      option_d: '', 
      option_e: '', 
      correct_answer: 'A' 
    }]);
  };

  useEffect(() => {
    if (view === 'exam' && activeExam) {
      const interval = setInterval(async () => {
        try {
          const { data, ok } = await safeFetch('/api/exams');
          if (ok) {
             const currentExam = data.find((e: any) => e.id === activeExam.id);
             if (!currentExam || currentExam.status !== 'active') {
                setNotification({ message: 'Ujian telah berakhir.', type: 'error', id: Date.now() });
                submitExam();
             }
          }
        } catch (err) {
          console.error("Failed to check exam status", err);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [view, activeExam]);

  const saveExam = async () => {
    if (!user || !newExamSubject || !newExamClass || newQuestions.length === 0) {
      showNotification("Mohon lengkapi data ujian", "error");
      return;
    }
    try {
      const url = isEditingExam ? `/api/exams/${editingExamId}` : '/api/exams';
      const method = isEditingExam ? 'PUT' : 'POST';
      
      const { data, ok } = await safeFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: user.id,
          subject: newExamSubject,
          class: newExamClass,
          questions: newQuestions
        })
      });

      if (ok && data?.success) {
        showNotification(isEditingExam ? "Ujian berhasil diperbarui!" : "Ujian berhasil dibuat!");
        setView('dashboard');
        fetchExams();
        // Reset
        setNewExamSubject('');
        setNewExamClass('');
        setNewQuestions([]);
        setIsEditingExam(false);
        setEditingExamId(null);
      }
    } catch (err) {
      showNotification("Gagal menyimpan ujian", "error");
    }
  };

  const handleEditExam = async (exam: Exam) => {
    try {
      const { data: questions } = await safeFetch(`/api/exams/${exam.id}/questions`);
      setNewExamSubject(exam.subject);
      setNewExamClass(exam.class);
      setNewQuestions(questions || []);
      setIsEditingExam(true);
      setEditingExamId(exam.id);
      setView('create_exam');
    } catch (err) {
      showNotification("Gagal memuat data ujian", "error");
    }
  };

  const handleDeleteExam = async (examId: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus ujian ini? Semua data nilai terkait juga akan dihapus.")) return;
    try {
      const { ok } = await safeFetch(`/api/exams/${examId}`, { method: 'DELETE' });
      if (ok) {
        showNotification("Ujian berhasil dihapus");
        fetchExams();
      }
    } catch (err) {
      showNotification("Gagal menghapus ujian", "error");
    }
  };

  // --- Render Helpers ---

  const renderChangePasswordModal = () => (
    <AnimatePresence>
      {isChangePasswordOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsChangePasswordOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: -20 }}
            className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-slate-900 mb-6">Rubah Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Password Lama</label>
                <input 
                  type="password"
                  value={passwordData.oldPassword}
                  onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Password Baru</label>
                <input 
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Konfirmasi Password Baru</label>
                <input 
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setIsChangePasswordOpen(false)} className="px-6 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors">
                  Simpan
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderLanding = () => (
    <div className="min-h-screen bg-modern flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl bg-white/70 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl p-8 sm:p-12 shadow-2xl shadow-slate-900/10 flex flex-col items-center"
      >
        <img 
          src="https://lh3.googleusercontent.com/d/1bogOVmwNoBbtXh1uTqC7ccDdTRYKw1fd" 
          alt="PRESISI"
          className="w-full max-w-md h-auto mb-10"
          referrerPolicy="no-referrer"
        />

        <div 
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl"
        >
          <motion.button
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setRole('student'); setView('login'); }}
            className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center group hover:border-violet-400 hover:shadow-xl hover:shadow-violet-100 transition-all duration-300"
          >
            <div className="w-20 h-20 bg-violet-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-violet-600 transition-all duration-300">
              <GraduationCap className="w-10 h-10 text-violet-600 group-hover:text-white transition-colors" />
            </div>
            <span className="text-2xl font-bold text-slate-800">SISWA</span>
            <p className="text-slate-500 mt-2 text-sm">Masuk sebagai peserta ujian</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setRole('teacher'); setView('login'); }}
            className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center group hover:border-fuchsia-400 hover:shadow-xl hover:shadow-fuchsia-100 transition-all duration-300"
          >
            <div className="w-20 h-20 bg-fuchsia-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-fuchsia-600 transition-all duration-300">
              <User className="w-10 h-10 text-fuchsia-600 group-hover:text-white transition-colors" />
            </div>
            <span className="text-2xl font-bold text-slate-800">GURU</span>
            <p className="text-slate-500 mt-2 text-sm">Masuk sebagai pengajar</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { setRole('admin'); setView('login'); }}
            className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center group hover:border-amber-400 hover:shadow-xl hover:shadow-amber-100 transition-all duration-300 md:col-span-2"
          >
            <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-500 transition-all duration-300">
              <UserCircle className="w-10 h-10 text-amber-600 group-hover:text-white transition-colors" />
            </div>
            <span className="text-2xl font-bold text-slate-800">ADMIN</span>
            <p className="text-slate-500 mt-2 text-sm">Masuk sebagai administrator</p>
          </motion.button>
        </div>
      </motion.div>
    </div>
  );

  const renderLogin = () => (
    <div className="min-h-screen bg-modern flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-violet-100 border border-slate-50 w-full max-w-md"
      >
        <button 
          onClick={() => setView('landing')}
          className="text-slate-400 hover:text-violet-600 mb-6 flex items-center gap-1 text-sm font-bold transition-colors"
        >
          <ChevronLeft size={16} /> Kembali
        </button>
        
        <div className="flex items-center gap-4 mb-8">
          <div className={`p-4 rounded-2xl ${
            role === 'student' ? 'bg-violet-100 text-violet-600' : 
            role === 'teacher' ? 'bg-fuchsia-100 text-fuchsia-600' : 
            'bg-amber-100 text-amber-600'
          }`}>
            {role === 'student' ? <GraduationCap size={28} /> : 
             role === 'teacher' ? <User size={28} /> : 
             <ShieldCheck size={28} />}
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Log In {role === 'student' ? 'Siswa' : role === 'teacher' ? 'Guru' : 'Admin'}
            </h2>
            <p className="text-slate-500 text-sm font-medium">Selamat datang kembali!</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {role !== 'admin' && (
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
                {role === 'student' ? 'NIS (Nomor Induk Siswa)' : 'NIP (Nomor Induk Pegawai)'}
              </label>
              <input 
                type="text" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={`w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 transition-all font-medium ${
                  role === 'student' ? 'focus:ring-violet-500' : 'focus:ring-fuchsia-500'
                }`}
                placeholder={role === 'student' ? 'Contoh: 12345' : 'Contoh: 98765'}
                required
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">
              {role === 'admin' ? 'Password Admin' : 'Password'}
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-5 py-4 rounded-2xl bg-slate-50 border-none focus:ring-2 transition-all font-medium ${
                role === 'student' ? 'focus:ring-violet-500' : 
                role === 'teacher' ? 'focus:ring-fuchsia-500' : 
                'focus:ring-amber-500'
              }`}
              placeholder={role === 'admin' ? 'admin' : '••••••••'}
              required
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
          )}

          <button 
            type="submit"
            className={`w-full py-5 rounded-2xl font-black text-white shadow-lg transition-all transform hover:-translate-y-1 active:scale-95 ${
              role === 'student' ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-200' : 
              role === 'teacher' ? 'bg-fuchsia-600 hover:bg-fuchsia-700 shadow-fuchsia-200' : 
              'bg-slate-800 hover:bg-slate-900 shadow-slate-200'
            }`}
          >
            MASUK SEKARANG
          </button>
        </form>
      </motion.div>
    </div>
  );

    const renderDashboard = () => (
    <>
      {renderChangePasswordModal()}
    <div className="min-h-screen bg-modern">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-violet-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img 
              src="https://lh3.googleusercontent.com/d/1bogOVmwNoBbtXh1uTqC7ccDdTRYKw1fd" 
              alt="PRESISI"
              className="h-20 w-auto"
              referrerPolicy="no-referrer"
            />
            {isDemoMode && (
              <div className="ml-4 flex items-center gap-2 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Mode Demo</span>
                <button 
                  onClick={() => {
                    localStorage.removeItem('edu_smart_mode');
                    window.location.reload();
                  }}
                  className="ml-2 text-[10px] text-emerald-600 hover:text-emerald-800 underline font-bold"
                >
                  Hubungkan Database
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
                        <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:text-yellow-400 dark:hover:bg-yellow-900/50 rounded-xl transition-all"
            >
              {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-200">{user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">{user?.role === 'student' ? `Kelas ${user.class}` : 'Pengajar'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-800/50 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 border-4 border-white dark:border-slate-800 shadow-inner">
                <UserCircle className="w-16 h-16 text-slate-300 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{user?.role === 'student' ? `NIS: ${user.identifier}` : `NIP: ${user.identifier}`}</p>
              
              <div className="w-full space-y-3">
                  <button 
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="w-full mt-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Settings size={16} />
                    Rubah Password
                  </button>
                <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Status</span>
                  <span className="font-bold text-violet-600 dark:text-violet-400 uppercase">{user?.role}</span>
                </div>
                {user?.role === 'student' && (
                  <div className="flex justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Kelas</span>
                    <span className="font-bold text-slate-900 dark:text-white">{user.class}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>


          {user?.role === 'teacher' && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setView('create_exam')}
              className="w-full bg-fuchsia-600 hover:bg-fuchsia-700 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-fuchsia-100 transition-all active:scale-95"
            >
              <PlusCircle size={20} />
              Buat Soal Ujian
            </motion.button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex bg-white dark:bg-slate-800/50 p-1 rounded-2xl border border-violet-100 dark:border-slate-800 shadow-sm">
            
              <button 
                onClick={() => { setActiveTab('exams'); setSelectedExamId(null); }}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'exams' ? 'bg-violet-600 text-white shadow-md shadow-violet-100' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`} 
              >
                <ClipboardList size={18} />
                Daftar Ujian
              </button>
              <button 
                onClick={() => { setActiveTab('grades'); setSelectedExamId(null); }}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'grades' ? 'bg-violet-600 text-white shadow-md shadow-violet-100' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`} 
              >
                <Award size={18} />
                Nilai Ujian
              </button>
              {user?.role === 'teacher' && (
                <>
                  <button 
                    onClick={() => { setActiveTab('analysis'); setSelectedExamId(null); setAnalysisData(null); }}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'analysis' ? 'bg-violet-600 text-white shadow-md shadow-violet-100' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`} 
                  >
                    <BarChart3 size={18} />
                    Analisis Soal
                  </button>
                  <button 
                    onClick={() => { setActiveTab('monitoring'); setSelectedExamId(null); }}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'monitoring' ? 'bg-violet-600 text-white shadow-md shadow-violet-100' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`} 
                  >
                    <Timer size={18} />
                    Ujian
                  </button>
                </>
              )}
            </div>
            
            <span className="px-3 py-1 bg-violet-50 text-violet-600 rounded-full text-xs font-bold self-start sm:self-center">
              {activeTab === 'exams' ? `${exams.length} Tersedia` : `${submissions.length} Selesai`}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {activeTab === 'exams' ? (
                exams.length > 0 ? (
                  exams.map((exam, idx) => (
                    <motion.div
                      key={exam.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-white p-6 rounded-2xl border border-violet-100 shadow-sm hover:border-violet-300 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-violet-50 transition-colors">
                            <FileText className="text-slate-400 group-hover:text-violet-600 transition-colors" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-slate-900">{exam.subject}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <LayoutDashboard size={12} /> Kelas {exam.class}
                              </span>
                              {user?.role === 'student' && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <User size={12} /> {exam.teacher_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {user?.role === 'student' ? (
                          <button 
                            onClick={() => startExam(exam)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-100 flex items-center gap-1 transition-all"
                          >
                            Kerjakan <ChevronRight size={16} />
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEditExam(exam)}
                              className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all"
                              title="Edit Ujian"
                            >
                              <Edit3 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteExam(exam.id)}
                              className="p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl transition-all"
                              title="Hapus Ujian"
                            >
                              <Trash2 size={18} />
                            </button>
                            <div className="text-xs text-slate-400 italic ml-2">
                              {new Date(exam.created_at).toLocaleDateString('id-ID')}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ClipboardList className="text-slate-300 w-8 h-8" />
                    </div>
                    <p className="text-slate-500 font-medium">Belum ada ujian yang tersedia untuk saat ini.</p>
                  </div>
                )
              ) : activeTab === 'analysis' ? (
                /* Analysis Tab (Teacher Only) */
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Tanggal Ujian</label>
                        <input 
                          type="date" 
                          value={analysisFilterDate}
                          onChange={(e) => setAnalysisFilterDate(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Mata Pelajaran</label>
                        <select 
                          value={analysisFilterSubject}
                          onChange={(e) => setAnalysisFilterSubject(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                        >
                          <option value="">Semua Mapel</option>
                          {Array.from(new Set(exams.map(e => e.subject))).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Kelas</label>
                        <select 
                          value={analysisFilterClass}
                          onChange={(e) => setAnalysisFilterClass(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                        >
                          <option value="">Semua Kelas</option>
                          {Array.from(new Set(exams.map(e => e.class))).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {!selectedAnalysisExamId ? (
                    /* Subject List for Analysis */
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {exams
                        .filter(e => {
                          const matchesDate = !analysisFilterDate || new Date(e.created_at).toISOString().split('T')[0] === analysisFilterDate;
                          const matchesSubject = !analysisFilterSubject || e.subject === analysisFilterSubject;
                          const matchesClass = !analysisFilterClass || e.class === analysisFilterClass;
                          return matchesDate && matchesSubject && matchesClass;
                        })
                        .map((exam, idx) => (
                          <motion.div
                            key={exam.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => fetchAnalysis(exam.id)}
                            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex gap-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                                  <BarChart3 className="text-indigo-600 w-6 h-6" />
                                </div>
                                <div>
                                  <h4 className="text-lg font-bold text-slate-900">{exam.subject}</h4>
                                  <p className="text-xs text-slate-500">Kelas {exam.class} • {new Date(exam.created_at).toLocaleDateString('id-ID')}</p>
                                </div>
                              </div>
                              <ChevronRight className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                            </div>
                          </motion.div>
                        ))
                      }
                      {exams.length === 0 && (
                        <div className="md:col-span-2 bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
                          <p className="text-slate-500 font-medium">Belum ada ujian untuk dianalisis.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Detailed Matrix Analysis */
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <button 
                            onClick={() => { setSelectedAnalysisExamId(null); setAnalysisData(null); }}
                            className="text-indigo-600 font-bold text-sm flex items-center gap-1 hover:underline"
                          >
                            ← Kembali ke Daftar Analisis
                          </button>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={downloadAnalysisExcel}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                            >
                              <FileText size={14} /> Download Excel
                            </button>
                          </div>
                        </div>

                      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                        <div className="p-6 bg-slate-50 border-b border-slate-200">
                          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Analisis Butir Soal</h3>
                          <p className="text-sm text-slate-500 font-medium">{analysisData?.exam?.subject} - Kelas {analysisData?.exam?.class}</p>
                        </div>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                                <th className="px-4 py-3 border border-slate-200 text-center" rowSpan={3}>No</th>
                                <th className="px-4 py-3 border border-slate-200 text-left min-w-[150px]" rowSpan={3}>Nama</th>
                                <th className="px-4 py-2 border border-slate-200 text-center" colSpan={analysisData?.questions.length}>Skor yang Diperoleh (No Urut Soal)</th>
                                <th className="px-4 py-2 border border-slate-200 text-center" rowSpan={2}>Jml</th>
                                <th className="px-4 py-2 border border-slate-200 text-center" rowSpan={2}>%</th>
                                <th className="px-4 py-2 border border-slate-200 text-center" colSpan={2}>Ketuntasan</th>
                                <th className="px-4 py-3 border border-slate-200 text-center" rowSpan={3}>Ket</th>
                              </tr>
                              <tr className="bg-slate-50 text-slate-500 font-bold text-[9px]">
                                {analysisData?.questions.map((_, i) => (
                                  <th key={i} className="px-2 py-2 border border-slate-200 text-center min-w-[30px]" rowSpan={2}>{i + 1}</th>
                                ))}
                                <th className="px-2 py-2 border border-slate-200 text-center" colSpan={2}>Belajar</th>
                              </tr>
                              <tr className="bg-slate-50 text-slate-500 font-bold text-[8px]">
                                <th className="px-2 py-1 border border-slate-200 text-center">Benar</th>
                                <th className="px-2 py-1 border border-slate-200 text-center">Capaian</th>
                                <th className="px-2 py-1 border border-slate-200 text-center">Ya</th>
                                <th className="px-2 py-1 border border-slate-200 text-center">Tdk</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analysisData?.submissions.map((sub, sIdx) => {
                                const totalQuestions = analysisData.questions.length;
                                const correctCount = sub.has_submitted ? sub.answers.filter((a: any) => {
                                  const q = analysisData.questions.find(quest => quest.id === a.question_id);
                                  if (!q) return false;
                                  if (q.type === 'multiple_choice') return a.score > 0;
                                  return (a.score || 0) >= (100 / totalQuestions) * 0.7; // 70% threshold for essay
                                }).length : 0;
                                const percentage = sub.has_submitted ? (correctCount / totalQuestions) * 100 : 0;
                                const isPassed = sub.has_submitted && percentage >= 70;

                                return (
                                  <tr key={sub.student_id} className={`hover:bg-slate-50 transition-colors ${!sub.has_submitted ? 'opacity-60' : ''}`}>
                                    <td className="px-4 py-3 border border-slate-200 text-center font-mono text-slate-400">{sIdx + 1}</td>
                                    <td className="px-4 py-3 border border-slate-200 font-bold text-slate-700">
                                      {sub.student_name}
                                      {!sub.has_submitted && <span className="ml-2 text-[8px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded uppercase tracking-tighter">Belum Ujian</span>}
                                    </td>
                                    {analysisData.questions.map((q) => {
                                      if (!sub.has_submitted) {
                                        return <td key={q.id} className="px-2 py-3 border border-slate-200 text-center text-slate-300">-</td>;
                                      }
                                      const ans = sub.answers.find((a: any) => a.question_id === q.id);
                                      const isCorrect = q.type === 'multiple_choice' ? (ans?.score > 0) : ((ans?.score || 0) >= (100 / totalQuestions) * 0.7);
                                      return (
                                        <td key={q.id} className={`px-2 py-3 border border-slate-200 text-center font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-400'}`}>
                                          {isCorrect ? '1' : '0'}
                                        </td>
                                      );
                                    })}
                                    <td className="px-4 py-3 border border-slate-200 text-center font-black text-indigo-600">{sub.has_submitted ? correctCount : '-'}</td>
                                    <td className="px-4 py-3 border border-slate-200 text-center font-bold text-slate-600">{sub.has_submitted ? percentage.toFixed(1) : '-'}</td>
                                    <td className="px-4 py-3 border border-slate-200 text-center text-emerald-600 font-black">{sub.has_submitted && isPassed ? '√' : ''}</td>
                                    <td className="px-4 py-3 border border-slate-200 text-center text-red-500 font-black">{sub.has_submitted && !isPassed ? '√' : ''}</td>
                                    <td className="px-4 py-3 border border-slate-200 text-center text-[10px] text-slate-400">{sub.has_submitted ? '-' : 'Belum'}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-slate-50 font-bold">
                                <td className="px-4 py-3 border border-slate-200 text-right" colSpan={2}>Jumlah Benar</td>
                                {analysisData?.questions.map((q) => {
                                  const totalCorrect = analysisData.submissions.filter(sub => {
                                    const ans = sub.answers.find((a: any) => a.question_id === q.id);
                                    if (q.type === 'multiple_choice') return ans?.score > 0;
                                    return (ans?.score || 0) >= (100 / analysisData.questions.length) * 0.7;
                                  }).length;
                                  return (
                                    <td key={q.id} className="px-2 py-3 border border-slate-200 text-center text-indigo-600">{totalCorrect}</td>
                                  );
                                })}
                                <td className="bg-slate-100 border border-slate-200" colSpan={5}></td>
                              </tr>
                              <tr className="bg-slate-100 font-bold">
                                <td className="px-4 py-3 border border-slate-200 text-right" colSpan={2}>% Ketuntasan</td>
                                {analysisData?.questions.map((q) => {
                                  const totalCorrect = analysisData.submissions.filter(sub => {
                                    const ans = sub.answers.find((a: any) => a.question_id === q.id);
                                    if (q.type === 'multiple_choice') return ans?.score > 0;
                                    return (ans?.score || 0) >= (100 / analysisData.questions.length) * 0.7;
                                  }).length;
                                  const percentage = analysisData.submissions.length > 0 ? (totalCorrect / analysisData.submissions.length) * 100 : 0;
                                  return (
                                    <td key={q.id} className="px-2 py-3 border border-slate-200 text-center text-emerald-600">{Math.round(percentage)}</td>
                                  );
                                })}
                                <td className="bg-slate-200 border border-slate-200" colSpan={5}></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'monitoring' ? (
                /* Monitoring Tab */
                <div className="space-y-6">
                  {/* List of Exams for Monitoring */}
                  <div className="grid grid-cols-1 gap-4">
                    {exams.map((exam, idx) => (
                      <motion.div
                        key={exam.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-lg font-bold text-slate-900">{exam.subject}</h4>
                            <p className="text-xs text-slate-500">Kelas {exam.class}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                exam.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                                exam.status === 'finished' ? 'bg-slate-100 text-slate-500' :
                                'bg-amber-100 text-amber-600'
                              }`}>
                                {exam.status === 'active' ? 'Sedang Berlangsung' : 
                                 exam.status === 'finished' ? 'Selesai' : 'Belum Dimulai'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {exam.status === 'active' && exam.started_at && (
                              <div className="mr-2">
                                <ExamTimer startedAt={exam.started_at} />
                              </div>
                            )}
                            {exam.status !== 'active' && (
                              <button
                                onClick={() => updateExamStatus(exam.id, 'active')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
                              >
                                MULAI UJIAN
                              </button>
                            )}
                            {exam.status === 'active' && (
                              <button
                                onClick={() => updateExamStatus(exam.id, 'finished')}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
                              >
                                AKHIRI UJIAN
                              </button>
                            )}
                            <button
                                onClick={() => fetchAnalysis(exam.id)}
                                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                            >
                                Monitoring
                            </button>
                          </div>
                        </div>
                        
                        {/* Monitoring Table (Only if this exam is selected/expanded) */}
                        {selectedAnalysisExamId === exam.id && analysisData && (
                           <div className="mt-6 border-t border-slate-100 pt-6">
                              <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                                <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                  <div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Monitoring Ujian</h3>
                                    <p className="text-sm text-slate-500 font-medium">{analysisData?.exam?.subject} - Kelas {analysisData?.exam?.class}</p>
                                  </div>
                                  <button 
                                    onClick={() => fetchAnalysis(exam.id)} 
                                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1"
                                  >
                                    <RefreshCw size={14} /> Refresh Data
                                  </button>
                                </div>
                                
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-600 font-bold uppercase tracking-widest text-[10px]">
                                        <th className="px-4 py-3 border border-slate-200 text-center" rowSpan={3}>No</th>
                                        <th className="px-4 py-3 border border-slate-200 text-left min-w-[150px]" rowSpan={3}>Nama</th>
                                        <th className="px-4 py-2 border border-slate-200 text-center" colSpan={analysisData?.questions.length}>Skor yang Diperoleh (No Urut Soal)</th>
                                        <th className="px-4 py-2 border border-slate-200 text-center" rowSpan={2}>Jml</th>
                                        <th className="px-4 py-2 border border-slate-200 text-center" rowSpan={2}>%</th>
                                        <th className="px-4 py-2 border border-slate-200 text-center" colSpan={2}>Ketuntasan</th>
                                        <th className="px-4 py-3 border border-slate-200 text-center" rowSpan={3}>Ket</th>
                                      </tr>
                                      <tr className="bg-slate-50 text-slate-500 font-bold text-[9px]">
                                        {analysisData?.questions.map((_, i) => (
                                          <th key={i} className="px-2 py-2 border border-slate-200 text-center min-w-[30px]" rowSpan={2}>{i + 1}</th>
                                        ))}
                                        <th className="px-2 py-2 border border-slate-200 text-center" colSpan={2}>Belajar</th>
                                      </tr>
                                      <tr className="bg-slate-50 text-slate-500 font-bold text-[8px]">
                                        <th className="px-2 py-1 border border-slate-200 text-center">Benar</th>
                                        <th className="px-2 py-1 border border-slate-200 text-center">Capaian</th>
                                        <th className="px-2 py-1 border border-slate-200 text-center">Ya</th>
                                        <th className="px-2 py-1 border border-slate-200 text-center">Tdk</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {analysisData?.submissions.map((sub, sIdx) => {
                                        const totalQuestions = analysisData.questions.length;
                                        const correctCount = sub.has_submitted ? sub.answers.filter((a: any) => {
                                          const q = analysisData.questions.find(quest => quest.id === a.question_id);
                                          if (!q) return false;
                                          if (q.type === 'multiple_choice') return a.score > 0;
                                          return (a.score || 0) >= (100 / totalQuestions) * 0.7;
                                        }).length : 0;
                                        const percentage = sub.has_submitted ? (correctCount / totalQuestions) * 100 : 0;
                                        const isPassed = sub.has_submitted && percentage >= 70;

                                        return (
                                          <tr key={sub.student_id} className={`hover:bg-slate-50 transition-colors ${!sub.has_submitted ? 'opacity-60' : ''}`}>
                                            <td className="px-4 py-3 border border-slate-200 text-center font-mono text-slate-400">{sIdx + 1}</td>
                                            <td className="px-4 py-3 border border-slate-200 font-bold text-slate-700">
                                              {sub.student_name}
                                              {!sub.has_submitted && <span className="ml-2 text-[8px] bg-slate-100 text-slate-400 px-1 py-0.5 rounded uppercase tracking-tighter">Belum Ujian</span>}
                                            </td>
                                            {analysisData.questions.map((q) => {
                                              if (!sub.has_submitted) {
                                                return <td key={q.id} className="px-2 py-3 border border-slate-200 text-center text-slate-300">-</td>;
                                              }
                                              const ans = sub.answers.find((a: any) => a.question_id === q.id);
                                              const isCorrect = q.type === 'multiple_choice' ? (ans?.score > 0) : ((ans?.score || 0) >= (100 / totalQuestions) * 0.7);
                                              return (
                                                <td key={q.id} className={`px-2 py-3 border border-slate-200 text-center font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-400'}`}>
                                                  {isCorrect ? '1' : '0'}
                                                </td>
                                              );
                                            })}
                                            <td className="px-4 py-3 border border-slate-200 text-center font-black text-indigo-600">{sub.has_submitted ? correctCount : '-'}</td>
                                            <td className="px-4 py-3 border border-slate-200 text-center font-bold text-slate-600">{sub.has_submitted ? percentage.toFixed(1) : '-'}</td>
                                            <td className="px-4 py-3 border border-slate-200 text-center text-emerald-600 font-black">{sub.has_submitted && isPassed ? '√' : ''}</td>
                                            <td className="px-4 py-3 border border-slate-200 text-center text-red-500 font-black">{sub.has_submitted && !isPassed ? '√' : ''}</td>
                                            <td className="px-4 py-3 border border-slate-200 text-center text-[10px] text-slate-400">{sub.has_submitted ? '-' : 'Belum'}</td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                    <tfoot>
                                      <tr className="bg-slate-50 font-bold">
                                        <td className="px-4 py-3 border border-slate-200 text-right" colSpan={2}>Jumlah Benar</td>
                                        {analysisData?.questions.map((q) => {
                                          const totalCorrect = analysisData.submissions.filter(sub => {
                                            const ans = sub.answers.find((a: any) => a.question_id === q.id);
                                            if (q.type === 'multiple_choice') return ans?.score > 0;
                                            return (ans?.score || 0) >= (100 / analysisData.questions.length) * 0.7;
                                          }).length;
                                          return (
                                            <td key={q.id} className="px-2 py-3 border border-slate-200 text-center text-indigo-600">{totalCorrect}</td>
                                          );
                                        })}
                                        <td className="bg-slate-100 border border-slate-200" colSpan={5}></td>
                                      </tr>
                                      <tr className="bg-slate-100 font-bold">
                                        <td className="px-4 py-3 border border-slate-200 text-right" colSpan={2}>% Ketuntasan</td>
                                        {analysisData?.questions.map((q) => {
                                          const totalCorrect = analysisData.submissions.filter(sub => {
                                            const ans = sub.answers.find((a: any) => a.question_id === q.id);
                                            if (q.type === 'multiple_choice') return ans?.score > 0;
                                            return (ans?.score || 0) >= (100 / analysisData.questions.length) * 0.7;
                                          }).length;
                                          const percentage = analysisData.submissions.length > 0 ? (totalCorrect / analysisData.submissions.length) * 100 : 0;
                                          return (
                                            <td key={q.id} className="px-2 py-3 border border-slate-200 text-center text-emerald-600">{Math.round(percentage)}</td>
                                          );
                                        })}
                                        <td className="bg-slate-200 border border-slate-200" colSpan={5}></td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              </div>
                           </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Grades Tab */
                user?.role === 'teacher' ? (
                  !selectedExamId ? (
                    /* Teacher: Grouped by Subject View */
                    Array.from(new Set(submissions.map(s => s.exam_id))).length > 0 ? (
                      Array.from(new Set(submissions.map(s => s.exam_id))).map((examId, idx) => {
                        const firstSub = submissions.find(s => s.exam_id === examId)!;
                        const count = submissions.filter(s => s.exam_id === examId).length;
                        return (
                          <motion.div
                            key={examId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => setSelectedExamId(examId)}
                            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex gap-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                                  <BookOpen className="text-indigo-600 w-6 h-6" />
                                </div>
                                <div>
                                  <h4 className="text-lg font-bold text-slate-900">{firstSub.subject}</h4>
                                  <p className="text-xs text-slate-500">Kelas {firstSub.class} • {count} Siswa Mengumpulkan</p>
                                </div>
                              </div>
                              <ChevronRight className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Award className="text-slate-300 w-8 h-8" />
                        </div>
                        <p className="text-slate-500 font-medium">Belum ada nilai ujian yang tercatat.</p>
                      </div>
                    )
                  ) : (
                    /* Teacher: List of Students for Selected Exam */
                    <div className="space-y-4">
                      <button 
                        onClick={() => setSelectedExamId(null)}
                        className="text-indigo-600 font-bold text-sm flex items-center gap-1 mb-2 hover:underline"
                      >
                        ← Kembali ke Daftar Mata Pelajaran
                      </button>
                      <h3 className="text-lg font-bold text-slate-800 mb-4">
                        Siswa yang mengumpulkan: {submissions.find(s => s.exam_id === selectedExamId)?.subject}
                      </h3>
                      {submissions.filter(s => s.exam_id === selectedExamId).map((sub, idx) => (
                        <motion.div
                          key={sub.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex gap-4">
                              <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center">
                                <User className="text-slate-400 w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-md font-bold text-slate-900">{sub.student_name}</h4>
                                <p className="text-xs text-slate-500">NIS: {sub.student_nis}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Skor</span>
                                <span className="text-xl font-black text-indigo-600">{(sub.score ?? 0).toFixed(1)}</span>
                              </div>
                              <button 
                                onClick={() => fetchSubmissionDetails(sub.id)}
                                className="p-2 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-500 rounded-xl transition-all"
                                title="Beri Nilai / Lihat Detail"
                              >
                                <Edit3 size={20} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )
                ) : (
                  /* Student: Simple List View */
                  submissions.length > 0 ? (
                    submissions.map((sub, idx) => (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                              <Trophy className="text-indigo-600 w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-slate-900">{sub.subject}</h4>
                              <p className="text-xs text-slate-500">Oleh {sub.teacher_name}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Skor Akhir</span>
                              <span className="text-2xl font-black text-indigo-600">{(sub.score ?? 0).toFixed(1)}</span>
                            </div>
                            <button 
                              onClick={() => fetchSubmissionDetails(sub.id)}
                              className="p-2 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-500 rounded-xl transition-all"
                              title="Lihat Detail"
                            >
                              <Search size={20} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="text-slate-300 w-8 h-8" />
                      </div>
                      <p className="text-slate-500 font-medium">Belum ada nilai ujian yang tercatat.</p>
                    </div>
                  )
                )
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
    </>
  );

  const renderExam = () => (
    <div className="min-h-screen bg-modern p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{activeExam?.subject}</h2>
            <p className="text-slate-500">Selesaikan semua soal dengan teliti</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waktu Server</span>
            <p className="text-xl font-mono font-bold text-indigo-600">{new Date().toLocaleTimeString('id-ID')}</p>
          </div>
        </div>

        <div className="space-y-8">
          {questions.map((q, idx) => (
            <motion.div 
              key={q.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"
            >
              <div className="flex items-start gap-4 mb-6">
                <span className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                <p className="text-lg text-slate-800 font-medium pt-1">{q.question_text}</p>
              </div>

              {q.type === 'multiple_choice' ? (
                <div className="grid grid-cols-1 gap-3 ml-14">
                  {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                    (q as any)[`option_${opt.toLowerCase()}`] && (
                    <button
                      key={opt}
                      onClick={() => setStudentAnswers({ ...studentAnswers, [q.id]: opt })}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-center gap-4 ${
                        studentAnswers[q.id] === opt 
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm ring-1 ring-indigo-500' 
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        studentAnswers[q.id] === opt ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {opt}
                      </span>
                      <span>{(q as any)[`option_${opt.toLowerCase()}`]}</span>
                    </button>
                  )))
                }
                </div>
              ) : (
                <div className="ml-14">
                  <textarea
                    value={studentAnswers[q.id] || ''}
                    onChange={(e) => setStudentAnswers({ ...studentAnswers, [q.id]: e.target.value })}
                    className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none min-h-[150px] transition-all"
                    placeholder="Tuliskan jawaban essai Anda di sini..."
                  />
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-lg sticky bottom-6">
          <p className="text-slate-500 text-sm font-medium">
            Terjawab: <span className="text-indigo-600 font-bold">{Object.keys(studentAnswers).length}</span> dari {questions.length} soal
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => setView('dashboard')}
              className="px-6 py-3 text-slate-500 font-bold hover:text-slate-700 transition-colors"
            >
              Batal
            </button>
            <button 
              onClick={submitExam}
              disabled={Object.keys(studentAnswers).length < questions.length}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 size={20} />
              Kumpulkan Ujian
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCreateExam = () => (
    <div className="min-h-screen bg-modern p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-slate-900">{isEditingExam ? 'Edit Ujian' : 'Buat Ujian Baru'}</h2>
          <div className="flex items-center gap-3">
            <button 
              onClick={downloadExamTemplate}
              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-emerald-100"
              title="Download Template Soal"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Template Soal</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-blue-100"
              title="Upload Soal Excel"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">Upload Soal</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx, .xls, .csv"
              onChange={handleExamExcelUpload}
            />
            <button 
              onClick={() => {
                setView('dashboard');
                setIsEditingExam(false);
                setEditingExamId(null);
                setNewExamSubject('');
                setNewExamClass('');
                setNewQuestions([]);
              }}
              className="text-slate-500 hover:text-slate-700 font-bold ml-4"
            >
              Batal
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Mata Pelajaran</label>
              <input 
                type="text" 
                value={newExamSubject}
                onChange={(e) => setNewExamSubject(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Contoh: Matematika"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Kelas</label>
              <select 
                value={newExamClass}
                onChange={(e) => setNewExamClass(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="">Pilih Kelas</option>
                {availableClasses.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {newQuestions.map((q, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="px-4 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-widest">
                  Soal #{idx + 1} - {q.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Essai'}
                </span>
                <button 
                  onClick={() => setNewQuestions(newQuestions.filter((_, i) => i !== idx))}
                  className="text-red-400 hover:text-red-600 text-sm font-bold"
                >
                  Hapus
                </button>
              </div>

              <div className="space-y-4">
                <textarea 
                  value={q.question_text}
                  onChange={(e) => {
                    const updated = [...newQuestions];
                    updated[idx].question_text = e.target.value;
                    setNewQuestions(updated);
                  }}
                  className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px]"
                  placeholder="Tuliskan pertanyaan di sini..."
                />

                {q.type === 'multiple_choice' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                      <div key={opt} className="flex items-center gap-3">
                        <span className="font-bold text-slate-400">{opt}</span>
                        <input 
                          type="text" 
                          value={(q as any)[`option_${opt.toLowerCase()}`]}
                          onChange={(e) => {
                            const updated = [...newQuestions];
                            (updated[idx] as any)[`option_${opt.toLowerCase()}`] = e.target.value;
                            setNewQuestions(updated);
                          }}
                          className="flex-1 px-4 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                          placeholder={`Pilihan ${opt}`}
                        />
                      </div>
                    ))}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Jawaban Benar</label>
                      <select 
                        value={q.correct_answer}
                        onChange={(e) => {
                          const updated = [...newQuestions];
                          updated[idx].correct_answer = e.target.value;
                          setNewQuestions(updated);
                        }}
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 bg-slate-50 outline-none"
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                        <option value="E">E</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 flex flex-col md:flex-row gap-4">
          <button 
            onClick={() => addQuestion('multiple_choice')}
            className="flex-1 bg-white border-2 border-dashed border-emerald-200 hover:border-emerald-500 text-emerald-600 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
          >
            <PlusCircle size={20} />
            Tambah Pilihan Ganda
          </button>
          <button 
            onClick={() => addQuestion('essay')}
            className="flex-1 bg-white border-2 border-dashed border-slate-200 hover:border-slate-500 text-slate-600 p-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all"
          >
            <PlusCircle size={20} />
            Tambah Soal Essai
          </button>
        </div>

        <div className="mt-12 flex justify-end">
          <button 
            onClick={saveExam}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-12 py-4 rounded-2xl font-bold shadow-xl shadow-emerald-100 transition-all active:scale-95"
          >
            {isEditingExam ? 'Simpan Perubahan' : 'Simpan & Publikasikan Ujian'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderGradeSubmission = () => {
    const pointPerQuestion = activeSubmission ? (100 / activeSubmission.answers.length) : 0;
    const totalScore = (Object.values(gradingScores) as number[]).reduce((a, b) => (a ?? 0) + (b ?? 0), 0);

    return (
    <div className="min-h-screen bg-modern p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{user?.role === 'teacher' ? 'Penilaian Ujian' : 'Detail Nilai Ujian'}</h2>
            <p className="text-slate-500">{activeSubmission?.submission.student_name} - {activeSubmission?.submission.subject}</p>
          </div>
          <button 
            onClick={() => setView(user?.role === 'admin' ? 'admin' : 'dashboard')}
            className="text-slate-500 hover:text-slate-700 font-bold"
          >
            Kembali
          </button>
        </div>

        <div className="space-y-6">
          {activeSubmission?.answers.map((ans, idx) => (
            <motion.div 
              key={ans.answer_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                  {idx + 1}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">{ans.question_text}</h4>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    {ans.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Essai'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Jawaban Siswa:</div>
                  <div className="text-slate-700 font-medium">{ans.answer_text || '(Tidak ada jawaban)'}</div>
                </div>

                {ans.type === 'multiple_choice' && (
                  <div className={`p-4 rounded-2xl border ${ans.answer_text === ans.correct_answer ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kunci Jawaban:</div>
                    <div className={`font-bold ${ans.answer_text === ans.correct_answer ? 'text-emerald-700' : 'text-red-700'}`}>
                      {ans.correct_answer}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-bold text-slate-700">Nilai:</label>
                    <input 
                      type="number" 
                      min="0" 
                      max={pointPerQuestion}
                      step="0.5"
                      disabled={ans.type === 'multiple_choice' || user?.role === 'student'}
                      value={gradingScores[ans.answer_id] || 0}
                      onChange={(e) => {
                        const newScore = parseFloat(e.target.value);
                        if (newScore <= pointPerQuestion) {
                          setGradingScores({ ...gradingScores, [ans.answer_id]: newScore });
                        }
                      }}
                      className={`w-20 px-3 py-2 rounded-xl border outline-none transition-all font-bold text-center ${ans.type === 'multiple_choice' || user?.role === 'student' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white border-indigo-200 focus:ring-2 focus:ring-indigo-500 text-indigo-600'}`}
                    />
                    <span className="text-xs text-slate-400 font-medium">/ {pointPerQuestion.toFixed(1)}</span>
                  </div>
                  
                  {ans.type === 'multiple_choice' && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${ans.score > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {ans.score > 0 ? 'Otomatis: Benar' : 'Otomatis: Salah'}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-lg sticky bottom-6">
          <div className="flex items-end gap-4">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Skor {user?.role === 'teacher' ? 'Sementara' : 'Akhir'}</span>
              <span className="text-3xl font-black text-indigo-600">
                {totalScore.toFixed(1)}
              </span>
            </div>
            <div className="pb-1">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-sm font-bold border border-emerald-100">
                {totalScore.toFixed(1)}%
              </span>
            </div>
          </div>
          {user?.role === 'teacher' && (
            <button 
              onClick={submitGrades}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
            >
              <CheckCircle2 size={20} />
              Simpan Penilaian
            </button>
          )}
        </div>
      </div>
    </div>
    );
  };

  const renderAdminDashboard = () => (
    <div className="min-h-screen bg-modern">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white py-6 px-4 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="https://lh3.googleusercontent.com/d/1bogOVmwNoBbtXh1uTqC7ccDdTRYKw1fd" 
              alt="PRESISI"
              className="h-12 w-auto brightness-0 invert"
              referrerPolicy="no-referrer"
            />
            <div className="border-l border-slate-700 pl-4">
              <h1 className="text-sm font-black tracking-widest text-emerald-400 uppercase">Admin Panel</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{user?.name}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-red-600 rounded-xl text-sm font-bold transition-all border border-slate-700 hover:border-red-500"
          >
            <LogOut size={18} />
            Keluar
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Admin Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-2 rounded-3xl shadow-sm border border-slate-200">
            <button 
              onClick={() => setActiveTab('admin_classes')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === 'admin_classes' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <LayoutDashboard size={20} />
              Daftar Kelas
            </button>
            <button 
              onClick={() => setActiveTab('admin_students')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === 'admin_students' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Users size={20} />
              Daftar Siswa
            </button>
            <button 
              onClick={() => setActiveTab('admin_teachers')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === 'admin_teachers' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <GraduationCap size={20} />
              Daftar Guru
            </button>
            <button 
              onClick={() => setActiveTab('admin_settings')}
              className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl text-sm font-bold transition-all ${activeTab === 'admin_settings' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Settings size={20} />
              Pengaturan
            </button>
          </div>
        </div>

        {/* Admin Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-bottom border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">
                {activeTab === 'admin_classes' ? 'Manajemen Kelas' : activeTab === 'admin_students' ? 'Manajemen Siswa' : activeTab === 'admin_teachers' ? 'Manajemen Guru' : 'Pengaturan Aplikasi'}
              </h3>
              <div className="flex items-center gap-2">
                {activeTab === 'admin_settings' ? (
                  isEditingSettings ? (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsEditingSettings(false)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2 rounded-xl text-sm font-bold transition-all"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={async () => {
                          await saveSettings();
                          setIsEditingSettings(false);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md"
                      >
                        <Save size={18} />
                        Simpan Perubahan
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsEditingSettings(true)}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md"
                    >
                      <Edit3 size={18} />
                      Edit Pengaturan
                    </button>
                  )
                ) : (
                  <>
                    {activeTab === 'admin_students' && (
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedClassFilter}
                          onChange={(e) => setSelectedClassFilter(e.target.value)}
                          className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold outline-none"
                        >
                          <option value="">Semua Kelas</option>
                          {adminClasses.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                        <button 
                          onClick={downloadStudentTemplate}
                          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-emerald-100"
                          title="Download Template Excel"
                        >
                          <Download size={18} />
                          <span className="hidden sm:inline">Template</span>
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className={`bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-blue-100 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Upload Data Excel"
                        >
                          {isUploading ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
                          <span className="hidden sm:inline">{isUploading ? 'Memproses...' : 'Upload Excel'}</span>
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept=".xlsx, .xls, .csv"
                          onChange={handleStudentExcelUpload}
                        />
                      </div>
                    )}
                    {activeTab === 'admin_teachers' && (
                      <>
                        <button 
                          onClick={downloadTeacherTemplate}
                          className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-emerald-100"
                          title="Download Template Excel"
                        >
                          <Download size={18} />
                          <span className="hidden sm:inline">Template</span>
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className={`bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all border border-blue-100 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Upload Data Excel"
                        >
                          {isUploading ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
                          <span className="hidden sm:inline">{isUploading ? 'Memproses...' : 'Upload Excel'}</span>
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept=".xlsx, .xls, .csv"
                          onChange={handleTeacherExcelUpload}
                        />
                      </>
                    )}
                    <button 
                      onClick={() => handleAdminAction('add', activeTab === 'admin_classes' ? 'class' : activeTab === 'admin_students' ? 'student' : 'teacher')}
                      className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md"
                    >
                      <Plus size={18} />
                      Tambah Data
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              {activeTab === 'admin_settings' ? (
                <div className="p-8 max-w-2xl space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Sekolah</label>
                      {isEditingSettings ? (
                        <input 
                          type="text"
                          value={adminSettings.school_name}
                          onChange={e => setAdminSettings({...adminSettings, school_name: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-700"
                          placeholder="Masukkan Nama Sekolah"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700">
                          {adminSettings.school_name || '-'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tahun Pelajaran</label>
                      {isEditingSettings ? (
                        <input 
                          type="text"
                          value={adminSettings.academic_year}
                          onChange={e => setAdminSettings({...adminSettings, academic_year: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-700"
                          placeholder="Contoh: 2023/2024"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700">
                          {adminSettings.academic_year || '-'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kepala Sekolah</label>
                      {isEditingSettings ? (
                        <input 
                          type="text"
                          value={adminSettings.principal_name}
                          onChange={e => setAdminSettings({...adminSettings, principal_name: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-700"
                          placeholder="Nama Kepala Sekolah"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700">
                          {adminSettings.principal_name || '-'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">NIP Kepala Sekolah</label>
                      {isEditingSettings ? (
                        <input 
                          type="text"
                          value={adminSettings.principal_nip}
                          onChange={e => setAdminSettings({...adminSettings, principal_nip: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-700"
                          placeholder="NIP Kepala Sekolah"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700">
                          {adminSettings.principal_nip || '-'}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Kota / Kabupaten</label>
                      {isEditingSettings ? (
                        <input 
                          type="text"
                          value={adminSettings.city}
                          onChange={e => setAdminSettings({...adminSettings, city: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all font-bold text-slate-700"
                          placeholder="Contoh: Jakarta"
                        />
                      ) : (
                        <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-slate-700">
                          {adminSettings.city || '-'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
                    <AlertCircle className="text-amber-500 shrink-0" size={20} />
                    <p className="text-xs text-amber-800 font-medium leading-relaxed">
                      Data ini akan ditampilkan pada kop surat dan laporan hasil ujian. Pastikan data yang dimasukkan sudah benar.
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    {activeTab === 'admin_classes' ? (
                      <>
                        <th className="px-6 py-4">ID</th>
                        <th className="px-6 py-4">Nama Kelas</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </>
                    ) : activeTab === 'admin_students' ? (
                      <>
                        <th className="px-6 py-4">Kelas</th>
                        <th className="px-6 py-4">NIS</th>
                        <th className="px-6 py-4">Nama Siswa</th>
                        <th className="px-6 py-4">Password</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4">NIP</th>
                        <th className="px-6 py-4">Nama Guru</th>
                        <th className="px-6 py-4">Mata Pelajaran</th>
                        <th className="px-6 py-4">Password</th>
                        <th className="px-6 py-4 text-right">Aksi</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTab === 'admin_classes' && adminClasses.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-slate-400">{c.id}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{c.name}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleAdminAction('edit', 'class', c.id)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 size={18} /></button>
                          <button onClick={() => handleAdminAction('delete', 'class', c.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'admin_students' && adminStudents.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{s.class}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-500">{s.identifier}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{s.name}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-400">********</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleAdminAction('edit', 'student', s.id)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 size={18} /></button>
                          <button onClick={() => handleAdminAction('delete', 'student', s.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'admin_teachers' && adminTeachers.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-mono text-slate-500">{t.identifier}</td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-700">{t.name}</td>
                      <td className="px-6 py-4 text-sm font-bold text-indigo-600">{t.subject}</td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-400">********</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleAdminAction('edit', 'teacher', t.id)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit3 size={18} /></button>
                          <button onClick={() => handleAdminAction('delete', 'teacher', t.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const renderAdminModals = () => (
  <>
    {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[200] w-full max-w-md px-4"
          >
            <div className={`flex items-center gap-3 p-4 rounded-2xl shadow-2xl border ${
              notification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                : 'bg-red-50 border-red-100 text-red-800'
            }`}>
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
              )}
              <p className="text-sm font-bold flex-1">{notification.message}</p>
              <button 
                onClick={() => setNotification(null)}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Modal */}
      <AnimatePresence>
        {isUploading && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-900">Memproses Data</h3>
                <p className="text-sm text-slate-500">Mohon tunggu sebentar...</p>
              </div>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  {editingItem ? 'Edit' : 'Tambah'} {modalType === 'class' ? 'Kelas' : modalType === 'student' ? 'Siswa' : 'Guru'}
                </h3>
                <form onSubmit={saveAdminData} className="space-y-4">
                  {modalType === 'class' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nama Kelas</label>
                      <input 
                        type="text" 
                        required
                        value={formData.name || ''}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        placeholder="Contoh: 10-A"
                      />
                    </div>
                  )}
                  {modalType === 'student' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Kelas</label>
                        <select 
                          required
                          value={formData.class || ''}
                          onChange={e => setFormData({...formData, class: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        >
                          <option value="">Pilih Kelas</option>
                          {adminClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">NIS</label>
                        <input 
                          type="text" required
                          value={formData.identifier || ''}
                          onChange={e => setFormData({...formData, identifier: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nama Siswa</label>
                        <input 
                          type="text" required
                          value={formData.name || ''}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
                        <input 
                          type="text" required
                          value={formData.password || ''}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                      </div>
                    </>
                  )}
                  {modalType === 'teacher' && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">NIP</label>
                        <input 
                          type="text" required
                          value={formData.identifier || ''}
                          onChange={e => setFormData({...formData, identifier: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nama Guru</label>
                        <input 
                          type="text" required
                          value={formData.name || ''}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Mata Pelajaran</label>
                        <input 
                          type="text" required
                          value={formData.subject || ''}
                          onChange={e => setFormData({...formData, subject: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
                        <input 
                          type="text" required
                          value={formData.password || ''}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none transition-all"
                        />
                      </div>
                    </>
                  )}
                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
);

  const renderSetupModal = () => (
    <AnimatePresence>
      {showSetupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSetupModal(false)}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="p-8 overflow-y-auto">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
                  <Settings className="text-amber-500 w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Konfigurasi Database</h3>
                  <p className="text-slate-500 text-sm">Ikuti langkah berikut untuk mengaktifkan aplikasi</p>
                </div>
              </div>

              <div className="space-y-6">
                <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs">1</span>
                    Setup Tabel (SQL)
                  </h4>
                  <p className="text-sm text-slate-600 mb-4">
                    Buka <strong>SQL Editor</strong> di Dashboard Supabase, lalu salin dan jalankan seluruh isi file <code>database.sql</code>. Ini akan membuat tabel <code>users</code>, <code>classes</code>, dll.
                  </p>
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-[10px] text-amber-700 font-medium">
                    <p className="font-bold mb-1">⚠️ PENTING:</p>
                    Jika tabel belum dibuat, aplikasi akan tetap berstatus "Offline" meskipun API Key sudah benar.
                  </div>
                </section>

                <section className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center text-xs">2</span>
                    Environment Variables
                  </h4>
                  <p className="text-sm text-slate-600 mb-4">
                    Salin <strong>Project URL</strong> dan <strong>service_role key</strong> dari Supabase (Settings {'>'} API), lalu masukkan ke pengaturan Environment Variables di platform ini:
                  </p>
                  <div className="space-y-2">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs flex justify-between items-center">
                      <span className="text-slate-400">Key:</span>
                      <span className="font-bold text-slate-700">SUPABASE_URL</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs flex justify-between items-center">
                      <span className="text-slate-400">Key:</span>
                      <span className="font-bold text-slate-700">SUPABASE_KEY</span>
                    </div>
                  </div>
                </section>

                {dbErrorMessage && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">Error Saat Ini:</p>
                    <p className="text-sm text-red-700 font-mono break-all whitespace-pre-wrap">{dbErrorMessage}</p>
                  </div>
                )}
              </div>

                <div className="flex flex-col gap-3 mt-8">
                  <button 
                    onClick={() => {
                      setIsDemoMode(true);
                      setDbStatus('demo');
                      localStorage.setItem('edu_smart_mode', 'demo');
                      setShowSetupModal(false);
                    }}
                    className="w-full py-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-2xl font-black shadow-xl shadow-violet-200 hover:shadow-violet-300 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1 active:scale-95"
                  >
                    <CheckCircle2 size={20} />
                    GUNAKAN MODE DEMO (OTOMATIS)
                  </button>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        setDbStatus('checking');
                        window.location.reload();
                      }}
                      className="flex-1 py-4 bg-slate-100 text-slate-900 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      <RefreshCw size={18} className={dbStatus === 'checking' ? 'animate-spin' : ''} />
                      Cek Ulang
                    </button>
                    <button 
                      onClick={() => setShowSetupModal(false)}
                      className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const renderDbStatus = () => (
    <div className="fixed bottom-4 right-4 z-50 group">
      <button 
        onClick={() => setShowSetupModal(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95 ${
          dbStatus === 'online' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
          dbStatus === 'offline' ? 'bg-red-50 text-red-600 border-red-100' : 
          'bg-slate-50 text-slate-400 border-slate-100'
        }`}
      >
        <Database size={12} className={dbStatus === 'checking' ? 'animate-pulse' : ''} />
        <span>Database {dbStatus}</span>
        <div className={`w-1.5 h-1.5 rounded-full ${
          dbStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
          dbStatus === 'offline' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
          'bg-slate-300'
        }`} />
      </button>
      {dbStatus === 'offline' && dbErrorMessage && (
        <div className="absolute bottom-full right-0 mb-2 w-64 bg-white p-3 rounded-2xl shadow-xl border border-red-100 text-[10px] text-red-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <p className="font-bold mb-1 uppercase tracking-widest">Klik untuk bantuan setup</p>
          <p className="mt-1 opacity-70 line-clamp-2">{dbErrorMessage}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="font-sans antialiased text-slate-900">
      {renderDbStatus()}
      {renderSetupModal()}
      <AnimatePresence mode="wait">
        {view === 'landing' && renderLanding()}
        {view === 'login' && renderLogin()}
        {view === 'dashboard' && renderDashboard()}
        {view === 'exam' && renderExam()}
        {view === 'create_exam' && renderCreateExam()}
        {view === 'grade_submission' && renderGradeSubmission()}
        {view === 'admin' && (
          <>
            {renderAdminDashboard()}
            {renderAdminModals()}
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
