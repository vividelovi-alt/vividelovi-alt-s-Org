import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL ERROR: SUPABASE_URL or SUPABASE_KEY is not defined in environment variables.");
  if (!process.env.VERCEL) process.exit(1);
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

const app = express();
const PORT = 3000;

app.use(express.json());

// API Routes
app.post("/api/login", async (req, res) => {
  let { identifier, password, role } = req.body;
  identifier = identifier?.trim();
  
  console.log(`Login attempt: ${identifier} as ${role}`);

  // Emergency check for admin user
  if (role === 'admin' && identifier === 'admin') {
    const { data: adminExists } = await supabase.from('users').select('*').eq('identifier', 'admin').single();
    if (!adminExists) {
      console.log("Admin user missing during login attempt, creating now...");
      await supabase.from('users').insert([{ role: 'admin', identifier: 'admin', name: 'Administrator', password: 'admin123' }]);
    }
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
});

app.get("/api/exams", async (req, res) => {
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
});

app.post("/api/exams", async (req, res) => {
  const { teacher_id, subject, class: targetClass, questions } = req.body;
  
  try {
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
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

app.get("/api/exams/:id/questions", async (req, res) => {
  const { data: questions } = await supabase.from('questions').select('*').eq('exam_id', req.params.id);
  res.json(questions || []);
});

app.post("/api/submissions", async (req, res) => {
  const { student_id, exam_id, answers } = req.body;

  try {
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
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

app.get("/api/submissions/teacher/:teacherId", async (req, res) => {
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
});

app.get("/api/submissions/student/:studentId", async (req, res) => {
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
});

app.get("/api/submissions/:id/details", async (req, res) => {
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
});

app.post("/api/submissions/:id/grade", async (req, res) => {
  const { grades } = req.body;
  
  try {
    for (const answerId in grades) {
      await supabase.from('answers').update({ score: grades[answerId] }).eq('id', answerId);
    }

    const { data: allAnswers } = await supabase.from('answers').select('score').eq('submission_id', req.params.id);
    const totalScore = allAnswers?.reduce((sum, a) => sum + (a.score || 0), 0) || 0;

    await supabase.from('submissions').update({ score: totalScore }).eq('id', req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

app.get("/api/exams/:id/analysis", async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ success: false, message: (error as Error).message });
  }
});

// Admin API
app.get("/api/admin/classes", async (req, res) => {
  const { data: classes } = await supabase.from('classes').select('*').order('name', { ascending: true });
  res.json(classes || []);
});

app.post("/api/admin/classes", async (req, res) => {
  const { name } = req.body;
  const { error } = await supabase.from('classes').insert([{ name }]);
  if (error) return res.status(400).json({ success: false, message: "Kelas sudah ada atau data tidak valid" });
  res.json({ success: true });
});

app.put("/api/admin/classes/:id", async (req, res) => {
  const { name } = req.body;
  const { error } = await supabase.from('classes').update({ name }).eq('id', req.params.id);
  if (error) return res.status(400).json({ success: false, message: "Gagal update kelas" });
  res.json({ success: true });
});

app.delete("/api/admin/classes/:id", async (req, res) => {
  const { error } = await supabase.from('classes').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ success: false, message: "Gagal hapus kelas" });
  res.json({ success: true });
});

app.get("/api/admin/students", async (req, res) => {
  const { data: students } = await supabase.from('users').select('*').eq('role', 'student').order('class', { ascending: true }).order('name', { ascending: true });
  res.json(students || []);
});

app.post("/api/admin/students", async (req, res) => {
  const { identifier, name, password, class: studentClass } = req.body;
  const { error } = await supabase.from('users').insert([{ role: 'student', identifier, name, password, class: studentClass }]);
  if (error) return res.status(400).json({ success: false, message: "NIS sudah terdaftar atau data tidak valid" });
  res.json({ success: true });
});

app.put("/api/admin/students/:id", async (req, res) => {
  const { identifier, name, password, class: studentClass } = req.body;
  const { error } = await supabase.from('users').update({ identifier, name, password, class: studentClass }).eq('id', req.params.id);
  if (error) return res.status(400).json({ success: false, message: "Gagal update siswa" });
  res.json({ success: true });
});

app.delete("/api/admin/students/:id", async (req, res) => {
  await supabase.from('users').delete().eq('id', req.params.id);
  res.json({ success: true });
});

app.get("/api/admin/teachers", async (req, res) => {
  const { data: teachers } = await supabase.from('users').select('*').eq('role', 'teacher').order('name', { ascending: true });
  res.json(teachers || []);
});

app.post("/api/admin/teachers", async (req, res) => {
  const { identifier, name, password, subject } = req.body;
  const { error } = await supabase.from('users').insert([{ role: 'teacher', identifier, name, password, subject }]);
  if (error) return res.status(400).json({ success: false, message: "NIP sudah terdaftar atau data tidak valid" });
  res.json({ success: true });
});

app.put("/api/admin/teachers/:id", async (req, res) => {
  const { identifier, name, password, subject } = req.body;
  const { error } = await supabase.from('users').update({ identifier, name, password, subject }).eq('id', req.params.id);
  if (error) return res.status(400).json({ success: false, message: "Gagal update guru" });
  res.json({ success: true });
});

app.delete("/api/admin/teachers/:id", async (req, res) => {
  await supabase.from('users').delete().eq('id', req.params.id);
  res.json({ success: true });
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
