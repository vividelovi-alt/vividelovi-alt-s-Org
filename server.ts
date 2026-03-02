import express from "express";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to handle async errors in Express routes
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Lazy initialization of Supabase client to prevent crash on startup if keys are missing
let supabaseClient: any = null;

function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
      const missing = [];
      if (!supabaseUrl) missing.push("SUPABASE_URL");
      if (!supabaseKey) missing.push("SUPABASE_KEY");
      console.warn(`Supabase configuration incomplete: ${missing.join(", ")}`);
      return null;
    }

    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey);
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
      return null;
    }
  }
  return supabaseClient;
}

// Proxy object to allow using 'supabase' globally while supporting lazy initialization
const supabase: any = new Proxy({}, {
  get(target, prop) {
    const client = getSupabase();
    if (!client) {
      throw new Error("Supabase client not initialized. Check your environment variables (SUPABASE_URL, SUPABASE_KEY).");
    }
    return client[prop];
  }
});

const app = express();
const PORT = 3000;

app.use(express.json());

// Simple Ping Route
app.get("/api/ping", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "API server is running",
    env: {
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_KEY,
      nodeEnv: process.env.NODE_ENV
    }
  });
});

// Health Check for Supabase
app.get("/api/health/supabase", asyncHandler(async (req, res) => {
  try {
    const client = getSupabase();
    if (!client) {
      return res.status(500).json({ 
        status: "error", 
        message: "Konfigurasi Supabase (URL/Key) belum diatur di Environment Variables." 
      });
    }
    
    // Try to select from users table to verify schema
    const { data, error } = await client.from('users').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error("Supabase Health Check Error:", error);
      
      let friendlyMessage = "Koneksi database gagal";
      if (error.message.includes("relation \"users\" does not exist")) {
        friendlyMessage = "Tabel 'users' tidak ditemukan. Pastikan Anda sudah menjalankan script SQL di Supabase SQL Editor.";
      } else if (error.message.includes("Invalid API key") || error.message.includes("invalid base64") || error.status === 401) {
        friendlyMessage = "API Key Supabase (SUPABASE_KEY) tidak valid atau salah tipe (gunakan service_role).";
      } else if (error.message.includes("Failed to fetch") || error.status === 404) {
        friendlyMessage = "URL Supabase (SUPABASE_URL) tidak valid atau tidak dapat dijangkau.";
      } else if (error.code === 'PGRST301') {
        friendlyMessage = "JWT Token expired atau API Key tidak valid.";
      }

      return res.status(500).json({ 
        status: "error", 
        message: friendlyMessage, 
        details: error.message,
        code: error.code
      });
    }
    res.json({ status: "connected", total_users: data });
  } catch (err: any) {
    console.error("Supabase Initialization Error:", err);
    res.status(500).json({ 
      status: "error", 
      message: err.message || "Konfigurasi environment variable belum lengkap", 
      details: err.stack 
    });
  }
}));

// API Routes
app.post("/api/login", asyncHandler(async (req, res) => {
  let { identifier, password, role } = req.body;
  identifier = identifier?.trim();
  
  console.log(`Login attempt: ${identifier} as ${role}`);
  
  try {
    // Emergency check for admin user
    if (role === 'admin' && identifier === 'admin') {
      const { data: adminExists } = await supabase.from('users').select('*').eq('identifier', 'admin').single();
      if (!adminExists) {
        console.log("Admin user missing during login attempt, creating now...");
        await supabase.from('users').insert([{ role: 'admin', identifier: 'admin', name: 'Administrator', password: 'admin123' }]);
      }
    }

    // Emergency check for demo teacher (98765)
    if (role === 'teacher' && identifier === '98765') {
      const { data: teacherExists } = await supabase.from('users').select('*').eq('identifier', '98765').single();
      if (!teacherExists) {
        console.log("Demo teacher missing during login attempt, creating now...");
        await supabase.from('users').insert([{ 
          role: 'teacher', 
          identifier: '98765', 
          name: 'Diana (Demo)', 
          password: 'guru',
          subject: 'Fisika'
        }]);
      }
    }
  } catch (err) {
    console.warn("Emergency admin check failed (likely table doesn't exist yet):", (err as Error).message);
  }
  
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('identifier', identifier)
    .eq('password', password)
    .eq('role', role)
    .single();
  
  if (user) {
    console.log(`Login success: ${identifier}`);
    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } else {
    console.log(`Login failed: ${identifier} as ${role}`);
    const { data: userExists } = await supabase.from('users').select('*').eq('identifier', identifier).single();
    if (userExists) {
      if (userExists.password !== password) {
        res.status(401).json({ success: false, message: "Password salah" });
      } else if (userExists.role !== role) {
        res.status(401).json({ success: false, message: `Akun ini terdaftar sebagai ${userExists.role.toUpperCase()}, bukan ${role.toUpperCase()}` });
      } else {
        res.status(401).json({ success: false, message: "Identifier atau password salah" });
      }
    } else {
      res.status(401).json({ success: false, message: `Identifier '${identifier}' tidak terdaftar` });
    }
  }
}));

app.post("/api/user/change-password", asyncHandler(async (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  if (!userId || !oldPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  // Verify current password
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, password')
    .eq('id', userId)
    .eq('password', oldPassword)
    .single();

  if (userError || !user) {
    return res.status(401).json({ success: false, message: "Current password incorrect or user not found" });
  }

  // Update password
  const { error: updateError } = await supabase
    .from('users')
    .update({ password: newPassword })
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }

  res.json({ success: true, message: "Password updated successfully" });
}));

app.get("/api/exams", asyncHandler(async (req, res) => {
  const { role, userId, studentClass } = req.query;
  
  if (role === 'teacher') {
    const { data: exams } = await supabase.from('exams').select('*').eq('teacher_id', userId);
    res.json(exams || []);
  } else if (role === 'student') {
    const { data: submissions } = await supabase.from('submissions').select('exam_id').eq('student_id', userId);
    const submittedExamIds = submissions?.map(s => s.exam_id) || [];

    let query = supabase
      .from('exams')
      .select('*, users!exams_teacher_id_fkey(name)')
      .eq('class', studentClass);
    
    if (submittedExamIds.length > 0) {
      query = query.not('id', 'in', `(${submittedExamIds.join(',')})`);
    }

    const { data: exams } = await query;
    
    const formattedExams = exams?.map(e => ({
      ...e,
      teacher_name: (e.users as any)?.name
    })) || [];

    res.json(formattedExams);
  }
}));

app.post("/api/exams", asyncHandler(async (req, res) => {
  const { teacher_id, subject, class: targetClass, questions } = req.body;
  
  const { data: exam, error: examError } = await supabase
    .from('exams')
    .insert([{ teacher_id, subject, class: targetClass }])
    .select()
    .single();

  if (examError) throw examError;

  const questionsToInsert = questions.map((q: any) => ({
    exam_id: exam.id,
    type: q.type,
    question_text: q.question_text,
    option_a: q.option_a || null,
    option_b: q.option_b || null,
    option_c: q.option_c || null,
    option_d: q.option_d || null,
    correct_answer: q.correct_answer || null
  }));

  const { error: questionsError } = await supabase.from('questions').insert(questionsToInsert);
  if (questionsError) throw questionsError;

  res.json({ success: true, examId: exam.id });
}));

app.get("/api/exams/:id/questions", asyncHandler(async (req, res) => {
  const { data: questions } = await supabase.from('questions').select('*').eq('exam_id', req.params.id);
  res.json(questions || []);
}));

app.put("/api/exams/:id", asyncHandler(async (req, res) => {
  const { subject, class: targetClass, questions } = req.body;
  
  // Update exam details
  const { error: examError } = await supabase
    .from('exams')
    .update({ subject, class: targetClass })
    .eq('id', req.params.id);

  if (examError) throw examError;

  // Delete old questions and insert new ones (simplest way to update)
  await supabase.from('questions').delete().eq('exam_id', req.params.id);

  const questionsToInsert = questions.map((q: any) => ({
    exam_id: parseInt(req.params.id),
    type: q.type,
    question_text: q.question_text,
    option_a: q.option_a || null,
    option_b: q.option_b || null,
    option_c: q.option_c || null,
    option_d: q.option_d || null,
    correct_answer: q.correct_answer || null
  }));

  const { error: questionsError } = await supabase.from('questions').insert(questionsToInsert);
  if (questionsError) throw questionsError;

  res.json({ success: true });
}));

app.delete("/api/exams/:id", asyncHandler(async (req, res) => {
  // Supabase should handle cascading deletes if configured, but let's be safe
  await supabase.from('questions').delete().eq('exam_id', req.params.id);
  await supabase.from('submissions').delete().eq('exam_id', req.params.id);
  
  const { error } = await supabase.from('exams').delete().eq('id', req.params.id);
  if (error) throw error;
  
  res.json({ success: true });
}));

app.post("/api/submissions", asyncHandler(async (req, res) => {
  const { student_id, exam_id, answers: studentAnswers } = req.body;

  // Fetch all questions for the exam to get correct answers and total count
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select('*')
    .eq('exam_id', exam_id);

  if (questionsError) throw questionsError;
  if (!questions || questions.length === 0) {
    return res.status(400).json({ success: false, message: "No questions found for this exam." });
  }

  const scorePerQuestion = 100 / questions.length;
  let totalScore = 0;
  const processedAnswers: { question_id: number; answer_text: string; score: number | null }[] = [];

  for (const q of questions) {
    const studentAnswer = studentAnswers[q.id] || '';
    let score: number | null = null;

    if (q.type === 'multiple_choice') {
      if (studentAnswer === q.correct_answer) {
        score = scorePerQuestion;
        totalScore += scorePerQuestion;
      }
    } else {
      // For essay questions, score is initially null, to be graded by teacher
      score = null;
    }
    processedAnswers.push({ question_id: q.id, answer_text: studentAnswer, score });
  }

  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .insert([{ student_id, exam_id, score: totalScore }])
    .select()
    .single();

  if (subError) throw subError;

  const answersToInsert = processedAnswers.map(ans => ({
    submission_id: submission.id,
    question_id: ans.question_id,
    answer_text: ans.answer_text,
    score: ans.score
  }));

  const { error: ansError } = await supabase.from('answers').insert(answersToInsert);
  if (ansError) throw ansError;

  res.json({ success: true });
}));

app.get("/api/submissions/teacher/:teacherId", asyncHandler(async (req, res) => {
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      users!submissions_student_id_fkey(name, identifier),
      exams!submissions_exam_id_fkey(subject, class, teacher_id)
    `)
    .eq('exams.teacher_id', req.params.teacherId)
    .order('submitted_at', { ascending: false });

  const formatted = submissions?.filter(s => s.exams).map(s => ({
    ...s,
    student_name: (s.users as any).name,
    student_nis: (s.users as any).identifier,
    subject: (s.exams as any).subject,
    class: (s.exams as any).class
  })) || [];

  res.json(formatted);
}));

app.get("/api/submissions/student/:studentId", asyncHandler(async (req, res) => {
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      *,
      exams!submissions_exam_id_fkey(
        subject,
        users!exams_teacher_id_fkey(name)
      )
    `)
    .eq('student_id', req.params.studentId)
    .order('submitted_at', { ascending: false });

  const formatted = submissions?.map(s => ({
    ...s,
    subject: (s.exams as any).subject,
    teacher_name: (s.exams as any).users.name
  })) || [];

  res.json(formatted);
}));

app.get("/api/submissions/:id/details", asyncHandler(async (req, res) => {
  const { data: submission } = await supabase
    .from('submissions')
    .select(`
      *,
      users!submissions_student_id_fkey(name),
      exams!submissions_exam_id_fkey(subject)
    `)
    .eq('id', req.params.id)
    .single();

  const { data: answers } = await supabase
    .from('answers')
    .select(`
      *,
      questions!answers_question_id_fkey(question_text, type, correct_answer, option_a, option_b, option_c, option_d)
    `)
    .eq('submission_id', req.params.id);

  const formattedSubmission = {
    ...submission,
    student_name: (submission as any).users.name,
    subject: (submission as any).exams.subject
  };

  const formattedAnswers = answers?.map(a => ({
    ...a,
    question_text: (a.questions as any).question_text,
    type: (a.questions as any).type,
    correct_answer: (a.questions as any).correct_answer,
    option_a: (a.questions as any).option_a,
    option_b: (a.questions as any).option_b,
    option_c: (a.questions as any).option_c,
    option_d: (a.questions as any).option_d
  })) || [];

  res.json({ submission: formattedSubmission, answers: formattedAnswers });
}));

app.post("/api/submissions/:id/grade", asyncHandler(async (req, res) => {
  const { grades } = req.body;
  
  for (const answerId in grades) {
    await supabase.from('answers').update({ score: grades[answerId] }).eq('id', answerId);
  }

  const { data: allAnswers } = await supabase.from('answers').select('score').eq('submission_id', req.params.id);
  const totalScore = allAnswers?.reduce((sum, a) => sum + (a.score || 0), 0) || 0;

  await supabase.from('submissions').update({ score: totalScore }).eq('id', req.params.id);
  res.json({ success: true });
}));

app.get("/api/exams/:id/analysis", asyncHandler(async (req, res) => {
  const examId = req.params.id;
  const { count: totalSubmissions } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('exam_id', examId);
  
  const { data: questions } = await supabase.from('questions').select('*').eq('exam_id', examId);
  const { data: answers } = await supabase.from('answers').select('*, questions!inner(*)').eq('questions.exam_id', examId);

  const questionsAnalysis = questions?.map(q => {
    const correctCount = answers?.filter(a => {
      if (a.question_id !== q.id) return false;
      if (q.type === 'multiple_choice') return a.answer_text === q.correct_answer;
      return (a.score || 0) >= 7;
    }).length || 0;

    return {
      id: q.id,
      question_text: q.question_text,
      type: q.type,
      correct_answer: q.correct_answer,
      correct_count: correctCount
    };
  }) || [];

  res.json({
    totalSubmissions: totalSubmissions || 0,
    questions: questionsAnalysis
  });
}));

app.get("/api/exams/:id/detailed-analysis", asyncHandler(async (req, res) => {
  const examId = req.params.id;
  
  // 1. Ambil info ujian
  const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).single();
  if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
  
  // 2. Ambil daftar soal
  const { data: questions } = await supabase.from('questions').select('*').eq('exam_id', examId).order('id', { ascending: true });
  
  // 3. Ambil SELURUH siswa di kelas tersebut
  const { data: allStudents } = await supabase
    .from('users')
    .select('id, name, identifier')
    .eq('role', 'student')
    .eq('class', exam.class)
    .order('name', { ascending: true });

  // 4. Ambil data pengerjaan siswa yang sudah ada
  const { data: submissions } = await supabase
    .from('submissions')
    .select('*')
    .eq('exam_id', examId);
    
  // 5. Ambil semua jawaban untuk pengerjaan tersebut
  const submissionIds = submissions?.map(s => s.id) || [];
  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .in('submission_id', submissionIds);

  // 6. Gabungkan data: Tampilkan semua siswa, sertakan data submission jika ada
  const detailedData = allStudents?.map(student => {
    const submission = submissions?.find(s => s.student_id === student.id);
    return {
      student_id: student.id,
      student_name: student.name,
      student_nis: student.identifier,
      has_submitted: !!submission,
      submission_id: submission?.id || null,
      score: submission?.score || 0,
      answers: submission ? (answers?.filter(a => a.submission_id === submission.id).map(a => ({
        question_id: a.question_id,
        answer_text: a.answer_text,
        score: a.score
      })) || []) : []
    };
  }) || [];

  res.json({
    exam,
    questions: questions || [],
    submissions: detailedData
  });
}));

// Admin API
app.get("/api/admin/classes", asyncHandler(async (req, res) => {
  const { data: classes } = await supabase.from('classes').select('*').order('name', { ascending: true });
  res.json(classes || []);
}));

app.post("/api/admin/classes", asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { error } = await supabase.from('classes').insert([{ name }]);
  if (error) {
    console.error("Error adding class:", error);
    return res.status(400).json({ success: false, message: error.message || "Gagal menambah kelas" });
  }
  res.json({ success: true });
}));

app.put("/api/admin/classes/:id", asyncHandler(async (req, res) => {
  const { name } = req.body;
  const { error } = await supabase.from('classes').update({ name }).eq('id', parseInt(req.params.id));
  if (error) {
    console.error("Error updating class:", error);
    return res.status(400).json({ success: false, message: error.message || "Gagal update kelas" });
  }
  res.json({ success: true });
}));

app.delete("/api/admin/classes/:id", asyncHandler(async (req, res) => {
  const { error } = await supabase.from('classes').delete().eq('id', parseInt(req.params.id));
  if (error) {
    console.error("Error deleting class:", error);
    return res.status(400).json({ success: false, message: error.message || "Gagal hapus kelas" });
  }
  res.json({ success: true });
}));

app.get("/api/admin/students", asyncHandler(async (req, res) => {
  const { class: studentClass } = req.query;
  let query = supabase.from('users').select('*').eq('role', 'student').order('class', { ascending: true }).order('name', { ascending: true });
  if (studentClass) {
    query = query.eq('class', studentClass);
  }
  const { data: students } = await query;
  res.json(students || []);
}));

app.post("/api/admin/students", asyncHandler(async (req, res) => {
  const { identifier, name, password, class: studentClass } = req.body;
  const { error } = await supabase.from('users').insert([{ role: 'student', identifier, name, password, class: studentClass }]);
  if (error) {
    console.error("Error adding student:", error);
    return res.status(400).json({ success: false, message: error.message || "Gagal menambah siswa" });
  }
  res.json({ success: true });
}));

app.put("/api/admin/students/:id", asyncHandler(async (req, res) => {
  const { identifier, name, password, class: studentClass } = req.body;
  const { error } = await supabase.from('users').update({ identifier, name, password, class: studentClass }).eq('id', parseInt(req.params.id));
  if (error) {
    console.error("Error updating student:", error);
    return res.status(400).json({ success: false, message: error.message || "Gagal update siswa" });
  }
  res.json({ success: true });
}));

app.delete("/api/admin/students/:id", asyncHandler(async (req, res) => {
  const { error } = await supabase.from('users').delete().eq('id', parseInt(req.params.id));
  if (error) {
    console.error("Error deleting student:", error);
    return res.status(400).json({ success: false, message: "Gagal hapus siswa" });
  }
  res.json({ success: true });
}));

app.get("/api/admin/teachers", asyncHandler(async (req, res) => {
  const { data: teachers } = await supabase.from('users').select('*').eq('role', 'teacher').order('name', { ascending: true });
  res.json(teachers || []);
}));

app.post("/api/admin/teachers", asyncHandler(async (req, res) => {
  const { identifier, name, password, subject } = req.body;
  const { error } = await supabase.from('users').insert([{ role: 'teacher', identifier, name, password, subject }]);
  if (error) {
    console.error("Error adding teacher:", error);
    return res.status(400).json({ success: false, message: error.message || "Gagal menambah guru" });
  }
  res.json({ success: true });
}));

app.put("/api/admin/teachers/:id", asyncHandler(async (req, res) => {
  const { identifier, name, password, subject } = req.body;
  const { error } = await supabase.from('users').update({ identifier, name, password, subject }).eq('id', parseInt(req.params.id));
  if (error) {
    console.error("Error updating teacher:", error);
    return res.status(400).json({ success: false, message: error.message || "Gagal update guru" });
  }
  res.json({ success: true });
}));

app.delete("/api/admin/teachers/:id", asyncHandler(async (req, res) => {
  const { error } = await supabase.from('users').delete().eq('id', parseInt(req.params.id));
  if (error) {
    console.error("Error deleting teacher:", error);
    return res.status(400).json({ success: false, message: "Gagal hapus guru" });
  }
  res.json({ success: true });
}));

app.post("/api/admin/students/bulk", asyncHandler(async (req, res) => {
  const { students } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ success: false, message: "Data siswa tidak valid" });
  }

  const studentsToInsert = students.map((s: any) => ({
    role: 'student',
    identifier: String(s.identifier),
    name: s.name,
    password: String(s.password || 'siswa123'),
    class: s.class
  }));

  const { error } = await supabase.from('users').insert(studentsToInsert);
  if (error) {
    console.error("Error bulk adding students:", error);
    return res.status(400).json({ success: false, message: error.message || "Gagal menambah data siswa secara massal" });
  }
  res.json({ success: true, count: studentsToInsert.length });
}));

app.post("/api/admin/teachers/bulk", asyncHandler(async (req, res) => {
  const { teachers } = req.body;
  if (!Array.isArray(teachers) || teachers.length === 0) {
    return res.status(400).json({ success: false, message: "Data guru tidak valid" });
  }

  const teachersToInsert = teachers.map((t: any) => ({
    role: 'teacher',
    identifier: String(t.identifier),
    name: t.name,
    password: String(t.password || 'guru123'),
    subject: t.subject
  }));

  const { error } = await supabase.from('users').insert(teachersToInsert);
  if (error) {
    console.error("Error bulk adding teachers:", error);
    return res.status(400).json({ success: false, message: error.message || "Gagal menambah data guru secara massal" });
  }
  res.json({ success: true, count: teachersToInsert.length });
}));

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error("API Error:", err);
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined
  });
});

async function startServer() {
  console.log("Starting server initialization...");
  const PORT = 3000;
  
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("Environment: Development. Attempting to start Vite...");
      try {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { 
            middlewareMode: true,
            hmr: false
          },
          appType: "spa",
        });
        app.use(vite.middlewares);
        console.log("Vite middleware successfully loaded.");
      } catch (viteErr) {
        console.error("Vite failed to start:", viteErr);
        app.get("/", (req, res) => {
          res.status(500).send(`Vite failed to start: ${viteErr instanceof Error ? viteErr.message : String(viteErr)}`);
        });
      }
    } else {
      console.log("Environment: Production. Serving static files...");
      const distPath = path.join(__dirname, "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is listening on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("CRITICAL ERROR during startServer:", err);
    // Ensure we still listen so the platform doesn't report a total failure
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running in EMERGENCY mode on port ${PORT}`);
    });
  }
}

startServer().catch(err => {
  console.error("FATAL: Failed to start server:", err);
  // Try to listen anyway so the process doesn't just exit and we can see logs
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running in EMERGENCY mode on http://localhost:${PORT}`);
    });
  }
});

export default app;
