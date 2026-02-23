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
  Plus
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

// --- Helper function ---
const safeJsonParse = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Failed to parse JSON response:', text);
    throw new Error('Invalid JSON response from server.');
  }
};

// --- Components ---

const ExamUI: React.FC<any> = ({ activeExam, questions, studentAnswers, setStudentAnswers, submitExam }) => (
  <div className="min-h-screen bg-slate-50 p-6">
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-8">
        <h2 className="text-3xl font-bold text-slate-900">{activeExam?.subject}</h2>
        <p className="text-slate-500">Kelas {activeExam?.class}</p>
      </div>

      <div className="space-y-6">
        {questions.map((q: any, idx: number) => (
          <motion.div
            key={q.id}
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
                <h4 className="font-bold text-slate-900 mb-2">{q.question_text}</h4>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {q.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Essai'}
                </div>
              </div>
            </div>

            {q.type === 'multiple_choice' ? (
              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map(opt => (
                  <label key={opt} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${studentAnswers[q.id] === opt ? 'bg-indigo-50 border-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}>
                    <input 
                      type="radio" 
                      name={`question-${q.id}`}
                      value={opt}
                      checked={studentAnswers[q.id] === opt}
                      onChange={(e) => setStudentAnswers({...studentAnswers, [q.id]: e.target.value})}
                      className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="font-medium text-slate-800">{q[`option_${opt.toLowerCase()}`]}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea 
                value={studentAnswers[q.id] || ''}
                onChange={(e) => setStudentAnswers({...studentAnswers, [q.id]: e.target.value})}
                className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none min-h-[120px]"
                placeholder="Ketik jawaban Anda di sini..."
              />
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-12 flex justify-end">
        <button 
          onClick={submitExam}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-2xl font-bold shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2"
        >
          <CheckCircle2 size={20} />
          Kumpulkan Jawaban
        </button>
      </div>
    </div>
  </div>
);

const AdminUI: React.FC<any> = ({ user, handleLogout, activeTab, setActiveTab, adminClasses, adminStudents, adminTeachers, handleAdminAction, isModalOpen, setIsModalOpen, modalType, editingItem, formData, setFormData, saveAdminData }) => (
  <div className="min-h-screen bg-neutral-50 font-sans">
    <nav className="bg-white/80 backdrop-blur-lg border-b border-neutral-200/80 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neutral-800 rounded-xl flex items-center justify-center">
            <ShieldCheck className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold font-display text-neutral-900 tracking-tight">Admin Panel</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-bold text-neutral-900">{user?.name}</p>
            <p className="text-xs text-neutral-500 uppercase tracking-wider">Administrator</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-100 rounded-xl transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </nav>

    <main className="max-w-7xl mx-auto p-6">
      <div className="flex bg-white p-1.5 rounded-2xl border border-neutral-200/80 shadow-sm mb-8">
        <button 
          onClick={() => setActiveTab('admin_classes')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'admin_classes' ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100'}`}
        >
          <LayoutDashboard size={18} />
          Manajemen Kelas
        </button>
        <button 
          onClick={() => setActiveTab('admin_students')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'admin_students' ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100'}`}
        >
          <GraduationCap size={18} />
          Manajemen Siswa
        </button>
        <button 
          onClick={() => setActiveTab('admin_teachers')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'admin_teachers' ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500 hover:bg-neutral-100'}`}
        >
          <User size={18} />
          Manajemen Guru
        </button>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-lg shadow-neutral-900/5 border border-neutral-200/60">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold font-display text-neutral-800">
            {activeTab === 'admin_classes' ? 'Daftar Kelas' : activeTab === 'admin_students' ? 'Daftar Siswa' : 'Daftar Guru'}
          </h2>
          <button 
            onClick={() => handleAdminAction('add', activeTab.split('_')[1].slice(0, -1) as any)}
            className="bg-neutral-800 hover:bg-neutral-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md flex items-center gap-2 transition-all"
          >
            <Plus size={18} />
            Tambah Baru
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-neutral-500">
            <thead className="text-xs text-neutral-700 uppercase bg-neutral-50">
              <tr>
                {activeTab === 'admin_classes' && <th scope="col" className="px-6 py-3">ID</th>}
                {activeTab === 'admin_classes' && <th scope="col" className="px-6 py-3">Nama Kelas</th>}
                {activeTab !== 'admin_classes' && <th scope="col" className="px-6 py-3">Nama</th>}
                {activeTab !== 'admin_classes' && <th scope="col" className="px-6 py-3">Identifier</th>}
                {activeTab === 'admin_students' && <th scope="col" className="px-6 py-3">Kelas</th>}
                {activeTab === 'admin_teachers' && <th scope="col" className="px-6 py-3">Mata Pelajaran</th>}
                <th scope="col" className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'admin_classes' && adminClasses.map(c => (
                <tr key={c.id} className="bg-white border-b hover:bg-neutral-50">
                  <td className="px-6 py-4 font-medium text-neutral-900">{c.id}</td>
                  <td className="px-6 py-4">{c.name}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleAdminAction('edit', 'class', c.id)} className="font-medium text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleAdminAction('delete', 'class', c.id)} className="font-medium text-red-600 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
              {activeTab === 'admin_students' && adminStudents.map(s => (
                <tr key={s.id} className="bg-white border-b hover:bg-neutral-50">
                  <td className="px-6 py-4 font-medium text-neutral-900">{s.name}</td>
                  <td className="px-6 py-4">{s.identifier}</td>
                  <td className="px-6 py-4">{s.class}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleAdminAction('edit', 'student', s.id)} className="font-medium text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleAdminAction('delete', 'student', s.id)} className="font-medium text-red-600 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
              {activeTab === 'admin_teachers' && adminTeachers.map(t => (
                <tr key={t.id} className="bg-white border-b hover:bg-neutral-50">
                  <td className="px-6 py-4 font-medium text-neutral-900">{t.name}</td>
                  <td className="px-6 py-4">{t.identifier}</td>
                  <td className="px-6 py-4">{t.subject}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => handleAdminAction('edit', 'teacher', t.id)} className="font-medium text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => handleAdminAction('delete', 'teacher', t.id)} className="font-medium text-red-600 hover:underline">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <AnimatePresence>
      {isModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-6">{editingItem ? 'Edit' : 'Tambah'} {modalType}</h3>
            <form onSubmit={saveAdminData} className="space-y-4">
              {modalType === 'class' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">ID</label>
                    <input 
                      type="text" 
                      value={editingItem ? formData.id : ''} 
                      placeholder="Otomatis"
                      className="w-full p-2 border rounded bg-neutral-100 text-neutral-500 cursor-not-allowed"
                      disabled 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">CLASS</label>
                    <input 
                      type="text" 
                      placeholder="Contoh: 12-A"
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                      className="w-full p-2 border rounded" 
                      required 
                    />
                  </div>
                </>
              )}
              {modalType === 'student' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">NIS</label>
                    <input type="text" placeholder="Nomor Induk Siswa" value={formData.identifier || ''} onChange={e => setFormData({...formData, identifier: e.target.value})} className="w-full p-2 border rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">NAMA</label>
                    <input type="text" placeholder="Nama Lengkap Siswa" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">KELAS</label>
                    <input type="text" placeholder="Contoh: 12-A" value={formData.class || ''} onChange={e => setFormData({...formData, class: e.target.value})} className="w-full p-2 border rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">PASSWORD</label>
                    <input type="password" placeholder="Kosongkan jika tidak diubah" onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-2 border rounded" />
                  </div>
                </>
              )}
              {modalType === 'teacher' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">NIP</label>
                    <input type="text" placeholder="Nomor Induk Pegawai" value={formData.identifier || ''} onChange={e => setFormData({...formData, identifier: e.target.value})} className="w-full p-2 border rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">NAMA</label>
                    <input type="text" placeholder="Nama Lengkap Guru" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">MATA PELAJARAN</label>
                    <input type="text" placeholder="Contoh: Matematika" value={formData.subject || ''} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full p-2 border rounded" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-2">PASSWORD</label>
                    <input type="password" placeholder="Kosongkan jika tidak diubah" onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-2 border rounded" />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg bg-neutral-100 text-neutral-700 font-semibold">Batal</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-neutral-800 text-white font-semibold">Simpan</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);





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

  // Teacher Create Exam State
  const [newExamSubject, setNewExamSubject] = useState('');
  const [newExamClass, setNewExamClass] = useState('');
  const [newQuestions, setNewQuestions] = useState<Partial<Question>[]>([]);

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
        fetch('/api/admin/classes'),
        fetch('/api/admin/students'),
        fetch('/api/admin/teachers')
      ]);
      const classesData = await safeJsonParse(classesRes);
      const studentsData = await safeJsonParse(studentsRes);
      const teachersData = await safeJsonParse(teachersRes);
      setAdminClasses(classesData || []);
      setAdminStudents(studentsData || []);
      setAdminTeachers(teachersData || []);
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    }
  };

  const fetchExams = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/exams?role=${user.role}&userId=${user.id}&studentClass=${user.class || ''}`);
      const data = await safeJsonParse(res);
      setExams(data || []);
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
      const res = await fetch(endpoint);
      const data = await safeJsonParse(res);
      setSubmissions(data || []);
    } catch (err) {
      console.error("Failed to fetch submissions", err);
    }
  };

  const fetchAnalysis = async (examId: number) => {
    try {
      console.log(`Requesting analysis for exam: ${examId}`);
      const res = await fetch(`/api/exams/${examId}/analysis`);
      if (!res.ok) {
        const text = await res.text();
        console.error(`Analysis request failed with status ${res.status}: ${text.substring(0, 100)}`);
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await safeJsonParse(res);
      setAnalysisData(data);
      setSelectedExamId(examId);
    } catch (err) {
      console.error("Failed to fetch analysis", err);
    }
  };

  const fetchSubmissionDetails = async (submissionId: number) => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}/details`);
      const data = await safeJsonParse(res);
      if (!data) throw new Error("No submission details found");
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
    } catch (err) {
      console.error("Failed to fetch submission details", err);
    }
  };

  // --- Admin Actions ---
  const handleAdminAction = async (action: 'add' | 'edit' | 'delete', type: 'class' | 'student' | 'teacher', id?: number) => {
    if (action === 'delete') {
      if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
      try {
        const res = await fetch(`/api/admin/${type}s/${id}`, { method: 'DELETE' });
        if (res.ok) fetchAdminData();
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
    const url = `/api/admin/${modalType}s${editingItem ? `/${editingItem.id}` : ''}`;
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setIsModalOpen(false);
        fetchAdminData();
      } else {
        const data = await safeJsonParse(res);
        alert(data?.message || 'Terjadi kesalahan');
      }
    } catch (err) { console.error(err); }
  };

  const submitGrades = async () => {
    if (!activeSubmission) return;
    try {
      const res = await fetch(`/api/submissions/${activeSubmission.submission.id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grades: gradingScores })
      });
      const data = await safeJsonParse(res);
      if (data?.success) {
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
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, password, role })
      });
      const data = await safeJsonParse(res);
      if (data?.success) {
        setUser(data.user);
        if (data.user.role === 'admin') {
          setView('admin');
          setActiveTab('admin_classes');
        } else {
          setView('dashboard');
        }
      } else {
        setError(data?.message);
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
      const res = await fetch(`/api/exams/${exam.id}/questions`);
      const data = await safeJsonParse(res);
      setQuestions(data || []);
      setActiveExam(exam);
      setStudentAnswers({});
      setView('exam');
    } catch (err) {
      console.error("Failed to fetch questions", err);
    }
  };

  const submitExam = async () => {
    if (!activeExam || !user) return;
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: user.id,
          exam_id: activeExam.id,
          answers: studentAnswers
        })
      });
      const data = await safeJsonParse(res);
      if (data?.success) {
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
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: user.id,
          subject: newExamSubject,
          class: newExamClass,
          questions: newQuestions
        })
      });
      const data = await safeJsonParse(res);
      if (data?.success) {
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
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-6xl font-display font-bold text-neutral-900 mb-4 tracking-tight">EduSmart</h1>
        <p className="text-neutral-500 text-lg">Sistem Manajemen Ujian Sekolah Terpadu</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setRole('student'); setView('login'); }}
          className="bg-white p-8 rounded-3xl shadow-lg shadow-primary/10 border-2 border-transparent hover:border-primary transition-all group"
        >
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors duration-300">
            <GraduationCap className="w-10 h-10 text-primary group-hover:text-white transition-colors duration-300" />
          </div>
          <span className="text-2xl font-bold font-display text-neutral-800">SISWA</span>
          <p className="text-neutral-500 mt-2 text-sm">Masuk sebagai peserta ujian</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setRole('teacher'); setView('login'); }}
          className="bg-white p-8 rounded-3xl shadow-lg shadow-secondary/10 border-2 border-transparent hover:border-secondary transition-all group"
        >
          <div className="w-20 h-20 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-secondary transition-colors duration-300">
            <User className="w-10 h-10 text-secondary group-hover:text-white transition-colors duration-300" />
          </div>
          <span className="text-2xl font-bold font-display text-neutral-800">GURU</span>
          <p className="text-neutral-500 mt-2 text-sm">Masuk sebagai pengajar</p>
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02, y: -5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => { setRole('admin'); setView('login'); }}
          className="bg-white p-8 rounded-3xl shadow-lg shadow-neutral-400/10 border-2 border-transparent hover:border-neutral-600 transition-all group md:col-span-2"
        >
          <div className="w-20 h-20 bg-neutral-200/50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-neutral-800 transition-colors duration-300">
            <UserCircle className="w-10 h-10 text-neutral-600 group-hover:text-white transition-colors duration-300" />
          </div>
          <span className="text-2xl font-bold font-display text-neutral-800">ADMIN</span>
          <p className="text-neutral-500 mt-2 text-sm">Masuk sebagai administrator</p>
        </motion.button>
      </div>
    </div>
  );

  const renderLogin = () => (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-10 rounded-3xl shadow-2xl shadow-neutral-900/10 border border-neutral-200/50 w-full max-w-md"
      >
        <button 
          onClick={() => setView('landing')}
          className="text-neutral-400 hover:text-neutral-600 mb-6 flex items-center gap-1 text-sm font-bold"
        >
          Kembali
        </button>
        
        <div className="flex items-center gap-4 mb-8">
          <div className={`p-4 rounded-2xl ${ 
            role === 'student' ? 'bg-primary/10 text-primary' : 
            role === 'teacher' ? 'bg-secondary/10 text-secondary' : 
            'bg-neutral-200/50 text-neutral-600'
          }`}>
            {role === 'student' ? <GraduationCap size={28} /> : 
             role === 'teacher' ? <User size={28} /> : 
             <ShieldCheck size={28} />}
          </div>
          <div>
            <h2 className="text-3xl font-bold font-display text-neutral-900">
              Log In {role === 'student' ? 'Siswa' : role === 'teacher' ? 'Guru' : 'Admin'}
            </h2>
            <p className="text-neutral-500 text-sm">Silakan masukkan kredensial Anda</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {role !== 'admin' && (
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-2">
                {role === 'student' ? 'NIS (Nomor Induk Siswa)' : 'NIP (Nomor Induk Pegawai)'}
              </label>
              <input 
                type="text" 
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border-2 border-neutral-200 bg-neutral-50 focus:ring-2 focus:border-transparent outline-none transition-all ${ 
                  role === 'student' ? 'focus:ring-primary' : 'focus:ring-secondary'
                }`}
                placeholder={role === 'student' ? 'Contoh: 12345' : 'Contoh: 98765'}
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-2">
              {role === 'admin' ? 'Password Admin' : 'Password'}
            </label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border-2 border-neutral-200 bg-neutral-50 focus:ring-2 focus:border-transparent outline-none transition-all ${ 
                role === 'student' ? 'focus:ring-primary' : 
                role === 'teacher' ? 'focus:ring-secondary' : 
                'focus:ring-neutral-900'
              }`}
              placeholder="••••••••"
              required
            />
          </div>
          
          {error && (
            <p className="text-red-600 text-sm bg-red-100 p-3 rounded-lg border border-red-200 font-semibold">{error}</p>
          )}

          <button 
            type="submit"
            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${ 
              role === 'student' ? 'bg-primary hover:bg-primary-dark shadow-primary/20' : 
              role === 'teacher' ? 'bg-secondary hover:bg-secondary-dark shadow-secondary/20' : 
              'bg-neutral-800 hover:bg-neutral-900 shadow-neutral-900/20'
            }`}
          >
            Masuk Sekarang
          </button>
        </form>
      </motion.div>
    </div>
  );

  const renderDashboard = () => (
    <div className="min-h-screen bg-neutral-50 font-sans">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-neutral-200/80 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold font-display text-neutral-900 tracking-tight">EduSmart</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-bold text-neutral-900">{user?.name}</p>
              <p className="text-xs text-neutral-500 uppercase tracking-wider">{user?.role === 'student' ? `Kelas ${user.class}` : 'Pengajar'}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-100 rounded-xl transition-all"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 rounded-3xl shadow-lg shadow-neutral-900/5 border border-neutral-200/60"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-neutral-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-inner">
                <UserCircle className="w-16 h-16 text-neutral-300" />
              </div>
              <h3 className="text-2xl font-bold font-display text-neutral-900">{user?.name}</h3>
              <p className="text-neutral-500 text-sm mb-6">{user?.role === 'student' ? `NIS: ${user.identifier}` : `NIP: ${user.identifier}`}</p>
              
              <div className="w-full space-y-3">
                <div className="flex justify-between p-3 bg-neutral-100 rounded-xl text-sm">
                  <span className="text-neutral-500">Status</span>
                  <span className="font-bold text-primary uppercase">{user?.role}</span>
                </div>
                {user?.role === 'student' && (
                  <div className="flex justify-between p-3 bg-neutral-100 rounded-xl text-sm">
                    <span className="text-neutral-500">Kelas</span>
                    <span className="font-bold text-neutral-900">{user.class}</span>
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
              className="w-full bg-secondary hover:bg-secondary-dark text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-secondary/20 transition-all active:scale-95"
            >
              <PlusCircle size={20} />
              Buat Soal Ujian
            </motion.button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex bg-white p-1.5 rounded-2xl border border-neutral-200/80 shadow-sm">
              <button 
                onClick={() => { setActiveTab('exams'); setSelectedExamId(null); }}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'exams' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-neutral-500 hover:bg-neutral-100'}`}
              >
                <ClipboardList size={18} />
                Daftar Ujian
              </button>
              <button 
                onClick={() => { setActiveTab('grades'); setSelectedExamId(null); }}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'grades' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-neutral-500 hover:bg-neutral-100'}`}
              >
                <Award size={18} />
                Nilai Ujian
              </button>
              {user?.role === 'teacher' && (
                <button 
                  onClick={() => { setActiveTab('analysis'); setSelectedExamId(null); setAnalysisData(null); }}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'analysis' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-neutral-500 hover:bg-neutral-100'}`}
                >
                  <BarChart3 size={18} />
                  Analisis Soal
                </button>
              )}
            </div>
            
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold self-start sm:self-center">
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
                      className="bg-white p-6 rounded-2xl border border-neutral-200/70 shadow-sm hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-neutral-100 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <FileText className="text-neutral-400 group-hover:text-primary transition-colors" />
                          </div>
                          <div>
                            <h4 className="text-lg font-bold font-display text-neutral-900">{exam.subject}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-neutral-500 flex items-center gap-1.5">
                                <LayoutDashboard size={12} /> Kelas {exam.class}
                              </span>
                              {user?.role === 'student' && (
                                <span className="text-xs text-neutral-500 flex items-center gap-1.5">
                                  <User size={12} /> {exam.teacher_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {user?.role === 'student' ? (
                          <button 
                            onClick={() => startExam(exam)}
                            className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-primary/20 flex items-center gap-1.5 transition-all"
                          >
                            Kerjakan <ChevronRight size={16} />
                          </button>
                        ) : (
                          <div className="text-xs text-neutral-400 italic">
                            Dibuat pada {new Date(exam.created_at).toLocaleDateString('id-ID')}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-neutral-200 text-center">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ClipboardList className="text-neutral-300 w-8 h-8" />
                    </div>
                    <p className="text-neutral-500 font-medium">Belum ada ujian yang tersedia untuk saat ini.</p>
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
                        className="bg-white p-6 rounded-2xl border border-neutral-200/70 shadow-sm hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                              <BarChart3 className="text-primary w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold font-display text-neutral-900">{exam.subject}</h4>
                              <p className="text-xs text-neutral-500">Kelas {exam.class}</p>
                            </div>
                          </div>
                          <ChevronRight className="text-neutral-300 group-hover:text-primary transition-colors" />
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-neutral-200 text-center">
                      <p className="text-neutral-500 font-medium">Belum ada ujian untuk dianalisis.</p>
                    </div>
                  )
                ) : (
                  /* Detailed Question Analysis */
                  <div className="space-y-6">
                    <button 
                      onClick={() => { setSelectedExamId(null); setAnalysisData(null); }}
                      className="text-primary font-bold text-sm flex items-center gap-1 mb-2 hover:underline"
                    >
                      ← Kembali ke Daftar Analisis
                    </button>
                    
                    <div className="bg-primary p-8 rounded-3xl text-white shadow-2xl shadow-primary/20 mb-8">
                      <h3 className="text-2xl font-bold font-display mb-2">Analisis Soal: {exams.find(e => e.id === selectedExamId)?.subject}</h3>
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
                            className="bg-white p-6 rounded-2xl border border-neutral-200/70 shadow-sm"
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded-md uppercase tracking-wider">
                                    Soal {idx + 1} • {q.type === 'multiple_choice' ? 'Pilihan Ganda' : 'Essay'}
                                  </span>
                                </div>
                                <p className="text-neutral-800 font-medium leading-relaxed">{q.question_text}</p>
                              </div>

                              <div className="flex items-center gap-8 min-w-[200px] justify-end">
                                <div className="text-center">
                                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Benar</span>
                                  <span className="text-xl font-black text-primary">{q.correct_count}</span>
                                </div>
                                <div className="text-center">
                                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Persentase</span>
                                  <span className="text-xl font-black text-secondary">{percentage.toFixed(1)}%</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, delay: idx * 0.1 }}
                                className={`h-full ${percentage > 70 ? 'bg-secondary' : percentage > 40 ? 'bg-accent' : 'bg-red-500'}`}
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
                            className="bg-white p-6 rounded-2xl border border-neutral-200/70 shadow-sm hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex gap-4">
                                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                  <BookOpen className="text-primary w-6 h-6" />
                                </div>
                                <div>
                                  <h4 className="text-lg font-bold font-display text-neutral-900">{firstSub.subject}</h4>
                                  <p className="text-xs text-neutral-500">Kelas {firstSub.class} • {count} Siswa Mengumpulkan</p>
                                </div>
                              </div>
                              <ChevronRight className="text-neutral-300 group-hover:text-primary transition-colors" />
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-neutral-200 text-center">
                        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Award className="text-neutral-300 w-8 h-8" />
                        </div>
                        <p className="text-neutral-500 font-medium">Belum ada nilai ujian yang tercatat.</p>
                      </div>
                    )
                  ) : (
                    /* Teacher: List of Students for Selected Exam */
                    <div className="space-y-4">
                      <button 
                        onClick={() => setSelectedExamId(null)}
                        className="text-primary font-bold text-sm flex items-center gap-1 mb-2 hover:underline"
                      >
                        ← Kembali ke Daftar Mata Pelajaran
                      </button>
                      <h3 className="text-lg font-bold text-neutral-800 mb-4">
                        Siswa yang mengumpulkan: {submissions.find(s => s.exam_id === selectedExamId)?.subject}
                      </h3>
                      {submissions.filter(s => s.exam_id === selectedExamId).map((sub, idx) => (
                        <motion.div
                          key={sub.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-white p-6 rounded-2xl border border-neutral-200/70 shadow-sm hover:border-primary/50 transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex gap-4">
                              <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center">
                                <User className="text-neutral-400 w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-md font-bold text-neutral-900">{sub.student_name}</h4>
                                <p className="text-xs text-neutral-500">NIS: {sub.student_nis}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Skor</span>
                                <span className="text-xl font-black text-primary">{(sub.score ?? 0).toFixed(1)}</span>
                              </div>
                              <button 
                                onClick={() => fetchSubmissionDetails(sub.id)}
                                className="p-2 bg-neutral-100 hover:bg-primary hover:text-white text-neutral-500 rounded-xl transition-all"
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
                        className="bg-white p-6 rounded-2xl border border-neutral-200/70 shadow-sm hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                              <Trophy className="text-primary w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="text-lg font-bold font-display text-neutral-900">{sub.subject}</h4>
                              <p className="text-xs text-neutral-500">Oleh {sub.teacher_name}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Skor Akhir</span>
                              <span className="text-2xl font-black text-primary">{(sub.score ?? 0).toFixed(1)}</span>
                            </div>
                            <button 
                              onClick={() => fetchSubmissionDetails(sub.id)}
                              className="p-2 bg-neutral-100 hover:bg-primary hover:text-white text-neutral-500 rounded-xl transition-all"
                              title="Lihat Detail"
                            >
                              <Search size={20} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-neutral-200 text-center">
                      <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Award className="text-neutral-300 w-8 h-8" />
                      </div>
                      <p className="text-neutral-500 font-medium">Belum ada nilai ujian yang tercatat.</p>
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
    <ExamUI
      activeExam={activeExam}
      questions={questions}
      studentAnswers={studentAnswers}
      setStudentAnswers={setStudentAnswers}
      submitExam={submitExam}
    />
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

  return (
    <div className="font-sans antialiased text-neutral-900">
      {view === 'landing' && renderLanding()}
      {view === 'login' && renderLogin()}
      {view === 'dashboard' && renderDashboard()}
      {view === 'exam' && renderExam()}
      {view === 'create_exam' && renderCreateExam()}
      {view === 'grade_submission' && renderGradeSubmission()}
      {view === 'admin' && (
        <AdminUI
          user={user}
          handleLogout={handleLogout}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          adminClasses={adminClasses}
          adminStudents={adminStudents}
          adminTeachers={adminTeachers}
          handleAdminAction={handleAdminAction}
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          modalType={modalType}
          editingItem={editingItem}
          formData={formData}
          setFormData={setFormData}
          saveAdminData={saveAdminData}
        />
      )}
    </div>
  );
}
