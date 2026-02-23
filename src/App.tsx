/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  GraduationCap, 
  LogIn, 
  LogOut, 
  FileText, 
  PlusCircle, 
  CheckCircle2, 
  ChevronRight,
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
  RefreshCw
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
}

interface Question {
  id: number;
  type: 'multiple_choice' | 'essay';
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
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

// --- Components ---

export default function App() {
  const [role, setRole] = useState<Role>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [view, setView] = useState<'landing' | 'login' | 'dashboard' | 'exam' | 'create_exam' | 'grade_submission' | 'admin'>('landing');
  const [activeTab, setActiveTab] = useState<'exams' | 'grades' | 'analysis' | 'admin_classes' | 'admin_students' | 'admin_teachers'>('exams');
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [analysisData, setAnalysisData] = useState<{ totalSubmissions: number, questions: any[] } | null>(null);
  
  // Admin State
  const [adminClasses, setAdminClasses] = useState<{id: number, name: string}[]>([]);
  const [adminStudents, setAdminStudents] = useState<UserData[]>([]);
  const [adminTeachers, setAdminTeachers] = useState<UserData[]>([]);
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
  const [dbStatus, setDbStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [dbErrorMessage, setDbErrorMessage] = useState<string | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Teacher Create Exam State
  const [newExamSubject, setNewExamSubject] = useState('');
  const [newExamClass, setNewExamClass] = useState('');
  const [newQuestions, setNewQuestions] = useState<Partial<Question>[]>([]);

  const safeFetch = async (url: string, options?: RequestInit) => {
    try {
      const res = await fetch(url, options);
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        console.error("JSON Parse Error:", e, "Text:", text);
      }
      return { data, ok: res.ok, status: res.status, rawText: text };
    } catch (e: any) {
      console.error("Fetch Error:", e);
      return { data: null, ok: false, status: 0, error: e.message || "Network error" };
    }
  };

  useEffect(() => {
    const checkDb = async () => {
      // First, check if API server is even reachable
      const pingResult = await safeFetch('/api/ping');
      if (!pingResult.ok) {
        setDbStatus('offline');
        let msg = `Server API tidak dapat dijangkau (Status: ${pingResult.status}). Pastikan server sedang berjalan.`;
        if (pingResult.data?.stack) {
          msg += `\n\nStack: ${pingResult.data.stack}`;
        }
        setDbErrorMessage(msg);
        if (dbStatus === 'checking') setShowSetupModal(true);
        return;
      }

      const result = await safeFetch('/api/health/supabase');
      const { data, ok, error } = result;
      setDbStatus(ok ? 'online' : 'offline');
      if (!ok) {
        let msg = data?.message || data?.details || error || 'Gagal terhubung ke database melalui API';
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
    if (user) {
      if (user.role === 'admin') {
        fetchAdminData();
      } else {
        fetchExams();
        fetchSubmissions();
      }
    }
  }, [user, activeTab]);

  const fetchAdminData = async () => {
    try {
      const [classesRes, studentsRes, teachersRes] = await Promise.all([
        safeFetch('/api/admin/classes'),
        safeFetch('/api/admin/students'),
        safeFetch('/api/admin/teachers')
      ]);
      if (classesRes.ok) setAdminClasses(classesRes.data);
      if (studentsRes.ok) setAdminStudents(studentsRes.data);
      if (teachersRes.ok) setAdminTeachers(teachersRes.data);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    }
  };

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
      console.log(`Requesting analysis for exam: ${examId}`);
      const { data, ok, status } = await safeFetch(`/api/exams/${examId}/analysis`);
      if (!ok) {
        console.error(`Analysis request failed with status ${status}`);
        throw new Error(`Server returned ${status}`);
      }
      setAnalysisData(data);
      setSelectedExamId(examId);
    } catch (err) {
      console.error("Failed to fetch analysis", err);
    }
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
        
        // Initialize grading scores from existing scores
        const initialScores: Record<number, number> = {};
        mappedAnswers.forEach((ans: any) => {
          initialScores[ans.answer_id] = ans.score;
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
      } else {
        alert(data?.message || 'Terjadi kesalahan');
      }
    } catch (err) { console.error(err); }
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
        alert("Penilaian berhasil disimpan!");
        setView('dashboard');
        fetchSubmissions();
      }
    } catch (err) {
      alert("Gagal menyimpan penilaian");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // For admin, force identifier to 'admin'
    const loginIdentifier = role === 'admin' ? 'admin' : identifier;
    
    // Hardcoded Admin Bypass
    if (role === 'admin' && loginIdentifier === 'admin' && password === 'admin123') {
      const mockAdmin = {
        id: 0,
        role: 'admin',
        identifier: 'admin',
        name: 'Administrator'
      };
      setUser(mockAdmin);
      setView('admin');
      setActiveTab('admin_classes');
      return;
    }

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
      correct_answer: 'A' 
    }]);
  };

  const saveExam = async () => {
    if (!user || !newExamSubject || !newExamClass || newQuestions.length === 0) {
      alert("Mohon lengkapi data ujian");
      return;
    }
    try {
      const { data, ok } = await safeFetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: user.id,
          subject: newExamSubject,
          class: newExamClass,
          questions: newQuestions
        })
      });
      if (ok && data?.success) {
        alert("Ujian berhasil dibuat!");
        setView('dashboard');
        setNewExamSubject('');
        setNewExamClass('');
        setNewQuestions([]);
        fetchExams();
      }
    } catch (err) {
      alert("Gagal membuat ujian");
    }
  };

  // --- Render Helpers ---

  const renderLanding = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold text-slate-900 mb-4 tracking-tight">EduSmart</h1>
        <p className="text-slate-500 text-lg">Sistem Manajemen Ujian Sekolah Terpadu</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setRole('student'); setView('login'); }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center group hover:border-indigo-500 transition-colors"
        >
          <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-500 transition-colors">
            <GraduationCap className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors" />
          </div>
          <span className="text-2xl font-semibold text-slate-800">SISWA</span>
          <p className="text-slate-500 mt-2 text-sm">Masuk sebagai peserta ujian</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setRole('teacher'); setView('login'); }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center group hover:border-emerald-500 transition-colors"
        >
          <div className="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500 transition-colors">
            <User className="w-10 h-10 text-emerald-600 group-hover:text-white transition-colors" />
          </div>
          <span className="text-2xl font-semibold text-slate-800">GURU</span>
          <p className="text-slate-500 mt-2 text-sm">Masuk sebagai pengajar</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setRole('admin'); setView('login'); }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center group hover:border-slate-500 transition-colors md:col-span-2"
        >
          <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-slate-500 transition-colors">
            <UserCircle className="w-10 h-10 text-slate-600 group-hover:text-white transition-colors" />
          </div>
          <span className="text-2xl font-semibold text-slate-800">ADMIN</span>
          <p className="text-slate-500 mt-2 text-sm">Masuk sebagai administrator</p>
        </motion.button>
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 rounded-3xl shadow-xl border border-slate-100 w-full max-w-md"
      >
        <button 
          onClick={() => setView('landing')}
          className="text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1 text-sm font-medium"
        >
          Kembali
        </button>
        
        <div className="flex items-center gap-3 mb-8">
          <div className={`p-3 rounded-xl ${
            role === 'student' ? 'bg-indigo-100 text-indigo-600' : 
            role === 'teacher' ? 'bg-emerald-100 text-emerald-600' : 
            'bg-slate-100 text-slate-600'
          }`}>
            {role === 'student' ? <GraduationCap size={24} /> : 
             role === 'teacher' ? <User size={24} /> : 
             <ShieldCheck size={24} />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Log In {role === 'student' ? 'Siswa' : role === 'teacher' ? 'Guru' : 'Admin'}
            </h2>
            <p className="text-slate-500 text-sm">Silakan masukkan kredensial Anda</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {role !== 'admin' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                {role === 'student' ? 'NIS (Nomor Induk Siswa)' : 'NIP (Nomor Induk Pegawai)'}
              </label>
              <input 
                type="text" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all ${
                  role === 'student' ? 'focus:ring-indigo-500' : 'focus:ring-emerald-500'
                }`}
                placeholder={role === 'student' ? 'Contoh: 12345' : 'Contoh: 98765'}
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {role === 'admin' ? 'Password Admin' : 'Password'}
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:border-transparent outline-none transition-all ${
                role === 'student' ? 'focus:ring-indigo-500' : 
                role === 'teacher' ? 'focus:ring-emerald-500' : 
                'focus:ring-slate-900'
              }`}
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && (
            <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
          )}

          <button 
            type="submit"
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${role === 'student' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : role === 'teacher' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-200'}`}
          >
            Masuk Sekarang
          </button>
        </form>
      </motion.div>
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-bottom border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">EduSmart</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">{user?.role === 'student' ? `Kelas ${user.class}` : 'Pengajar'}</p>
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
            className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-inner">
                <UserCircle className="w-16 h-16 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{user?.name}</h3>
              <p className="text-slate-500 text-sm mb-6">{user?.role === 'student' ? `NIS: ${user.identifier}` : `NIP: ${user.identifier}`}</p>
              
              <div className="w-full space-y-3">
                <div className="flex justify-between p-3 bg-slate-50 rounded-xl text-sm">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-indigo-600 uppercase">{user?.role}</span>
                </div>
                {user?.role === 'student' && (
                  <div className="flex justify-between p-3 bg-slate-50 rounded-xl text-sm">
                    <span className="text-slate-500">Kelas</span>
                    <span className="font-bold text-slate-900">{user.class}</span>
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
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95"
            >
              <PlusCircle size={20} />
              Buat Soal Ujian
            </motion.button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => { setActiveTab('exams'); setSelectedExamId(null); }}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'exams' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <ClipboardList size={18} />
                Daftar Ujian
              </button>
              <button 
                onClick={() => { setActiveTab('grades'); setSelectedExamId(null); }}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'grades' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <Award size={18} />
                Nilai Ujian
              </button>
              {user?.role === 'teacher' && (
                <button 
                  onClick={() => { setActiveTab('analysis'); setSelectedExamId(null); setAnalysisData(null); }}
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'analysis' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <BarChart3 size={18} />
                  Analisis Soal
                </button>
              )}
            </div>
            
            <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold self-start sm:self-center">
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
                      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                            <FileText className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
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
                          <div className="text-xs text-slate-400 italic">
                            Dibuat pada {new Date(exam.created_at).toLocaleDateString('id-ID')}
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
                !selectedExamId ? (
                  /* Subject List for Analysis */
                  exams.length > 0 ? (
                    exams.map((exam, idx) => (
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
                              <p className="text-xs text-slate-500">Kelas {exam.class}</p>
                            </div>
                          </div>
                          <ChevronRight className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-300 text-center">
                      <p className="text-slate-500 font-medium">Belum ada ujian untuk dianalisis.</p>
                    </div>
                  )
                ) : (
                  /* Detailed Question Analysis */
                  <div className="space-y-6">
                    <button 
                      onClick={() => { setSelectedExamId(null); setAnalysisData(null); }}
                      className="text-indigo-600 font-bold text-sm flex items-center gap-1 mb-2 hover:underline"
                    >
                      ← Kembali ke Daftar Analisis
                    </button>
                    
                    <div className="bg-indigo-600 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 mb-8">
                      <h3 className="text-2xl font-bold mb-2">Analisis Soal: {exams.find(e => e.id === selectedExamId)?.subject}</h3>
                      <div className="flex items-center gap-4 opacity-90">
                        <Users size={18} />
                        <span className="font-medium text-lg">{analysisData?.totalSubmissions} Siswa telah mengerjakan</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {analysisData?.questions.map((q: any, idx: number) => {
                        const percentage = analysisData.totalSubmissions > 0 
                          ? (q.correct_count / analysisData.totalSubmissions) * 100 
                          : 0;
                        
                        return (
                          <motion.div
                            key={q.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase tracking-wider">
                                    Soal {idx + 1} • {q.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay'}
                                  </span>
                                </div>
                                <p className="text-slate-800 font-medium leading-relaxed">{q.question_text}</p>
                              </div>

                              <div className="flex items-center gap-8 min-w-[200px] justify-end">
                                <div className="text-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Benar</span>
                                  <span className="text-xl font-black text-indigo-600">{q.correct_count}</span>
                                </div>
                                <div className="text-center">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Persentase</span>
                                  <span className="text-xl font-black text-emerald-600">{percentage.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, delay: idx * 0.1 }}
                                className={`h-full ${percentage > 70 ? 'bg-emerald-500' : percentage > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )
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
  );

  const renderExam = () => (
    <div className="min-h-screen bg-slate-50 p-6">
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
                  {['A', 'B', 'C', 'D'].map((opt) => (
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
                  ))}
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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-slate-900">Buat Ujian Baru</h2>
          <button 
            onClick={() => setView('dashboard')}
            className="text-slate-500 hover:text-slate-700 font-bold"
          >
            Batal
          </button>
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
              <input 
                type="text" 
                value={newExamClass}
                onChange={(e) => setNewExamClass(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Contoh: 10-A"
              />
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
                    {['A', 'B', 'C', 'D'].map((opt) => (
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
            Simpan & Publikasikan Ujian
          </button>
        </div>
      </div>
    </div>
  );

  const renderGradeSubmission = () => (
    <div className="min-h-screen bg-slate-50 p-6">
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
                      max="10"
                      step="0.5"
                      disabled={ans.type === 'multiple_choice' || user?.role === 'student'}
                      value={gradingScores[ans.answer_id] || 0}
                      onChange={(e) => setGradingScores({ ...gradingScores, [ans.answer_id]: parseFloat(e.target.value) })}
                      className={`w-20 px-3 py-2 rounded-xl border outline-none transition-all font-bold text-center ${ans.type === 'multiple_choice' || user?.role === 'student' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-white border-indigo-200 focus:ring-2 focus:ring-indigo-500 text-indigo-600'}`}
                    />
                    <span className="text-xs text-slate-400 font-medium">/ 10.0</span>
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
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Skor {user?.role === 'teacher' ? 'Sementara' : 'Akhir'}</span>
            <span className="text-3xl font-black text-indigo-600">
              {(Object.values(gradingScores) as number[]).reduce((a, b) => (a ?? 0) + (b ?? 0), 0).toFixed(1)}
            </span>
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

  const renderAdminDashboard = () => (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white py-6 px-4 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
              <ShieldCheck className="text-emerald-400 w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">ADMIN PANEL</h1>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{user?.name}</p>
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
          </div>
        </div>

        {/* Admin Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-bottom border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">
                {activeTab === 'admin_classes' ? 'Manajemen Kelas' : activeTab === 'admin_students' ? 'Manajemen Siswa' : 'Manajemen Guru'}
              </h3>
              <button 
                onClick={() => handleAdminAction('add', activeTab === 'admin_classes' ? 'class' : activeTab === 'admin_students' ? 'student' : 'teacher')}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-md"
              >
                <Plus size={18} />
                Tambah Data
              </button>
            </div>

            <div className="overflow-x-auto">
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
            </div>
          </div>
        </div>
      </div>

      {/* Admin Modal */}
      <AnimatePresence>
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
    </div>
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

              <div className="flex gap-4 mt-8">
                <button 
                  onClick={() => {
                    setDbStatus('checking');
                    // checkDb is in useEffect, but we can trigger it by changing a state or just calling it if we expose it
                    // For now, let's just refresh the page as a simple way to re-run all checks
                    window.location.reload();
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-900 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} className={dbStatus === 'checking' ? 'animate-spin' : ''} />
                  Cek Ulang
                </button>
                <button 
                  onClick={() => setShowSetupModal(false)}
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all"
                >
                  Saya Mengerti
                </button>
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
        {view === 'admin' && renderAdminDashboard()}
      </AnimatePresence>
    </div>
  );
}
