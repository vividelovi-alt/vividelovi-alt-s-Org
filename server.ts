import express from "express";
import { createServer as createViteServer } from "vite";
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
      console.error(`ERROR: Missing environment variables: ${missing.join(", ")}`);
      throw new Error(`Konfigurasi Supabase tidak lengkap. Variabel yang hilang: ${missing.join(", ")}`);
    }

    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey);
    } catch (err) {
      console.error("Failed to initialize Supabase client:", err);
      throw err;
    }
  }
  return supabaseClient;
}

// Proxy object to allow using 'supabase' globally while supporting lazy initialization
const supabase: any = new Proxy({}, {
  get(target, prop) {
    return getSupabase()[prop];
  }
});

const app = express();
const PORT = 3000;

app.use(express.json());

// Health Check for Supabase
app.get("/api/health/supabase", asyncHandler(async (req, res) => {
  try {
    const client = getSupabase();
    const { data, error } = await client.from('users').select('count', { count: 'exact', head: true });
    if (error) {
      console.error("Supabase Health Check Error:", error);
      return res.status(500).json({ 
        status: "error", 
        message: "Database connection failed", 
        details: error.message 
      });
    }
    res.json({ status: "connected", total_users: data });
  } catch (err: any) {
    console.error("Supabase Initialization Error:", err);
    res.status(500).json({ 
      status: "error", 
      message: "Supabase initialization failed", 
      details: err.message 
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

app.post("/api/submissions", asyncHandler(async (req, res) => {
  const { student_id, exam_id, answers } = req.body;

  const { data: questions } = await supabase.from('questions').select('id, type, correct_answer').eq('exam_id', exam_id);
  if (!questions) throw new Error("Questions not found");

  let totalScore = 0;
  const processedAnswers = [];

  for (const q of questions) {
    const studentAnswer = answers[q.id];
    let score = 0;
    if (q.type === 'multiple_choice') {
      if (studentAnswer === q.correct_answer) {
        score = 10;
      }
    }
    totalScore += score;
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
  const { data: students } = await supabase.from('users').select('*').eq('role', 'student').order('class', { ascending: true }).order('name', { ascending: true });
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

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error("API Error:", err);
  res.status(err.status || 500).json({ 
    success: false, 
    message: err.message || "Internal Server Error" 
  });
});

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }
}

setupVite();

if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
