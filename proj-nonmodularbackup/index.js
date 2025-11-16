const express = require("express");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// File paths
const filePath = path.join(__dirname, "questions.xlsx");
const testsFilePath = path.join(__dirname, "tests.json");

// -----------------------------
// UTILITY FUNCTIONS
// -----------------------------
function getAllQuestionsRaw() {
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return xlsx.utils.sheet_to_json(sheet);
}

function normalizeQuestion(q) {
  const options = {
    A: q["Option A"],
    B: q["Option B"],
    C: q["Option C"],
    D: q["Option D"]
  };

  return {
    id: Number(q.id),
    description: q.Description,
    options,
    correctAnswer: mapCorrectAnswer(q["Correct answer"], options)
  };
}

function mapCorrectAnswer(correctText, options) {
  if (!correctText) return null;

  const normalized = correctText.toString().trim().toLowerCase();

  const found = Object.entries(options).find(
    ([key, val]) => val.toString().trim().toLowerCase() === normalized
  );

  return found ? found[0] : null;
}

function getAllTests() {
  if (!fs.existsSync(testsFilePath)) return [];
  return JSON.parse(fs.readFileSync(testsFilePath));
}

function saveAllTests(tests) {
  fs.writeFileSync(testsFilePath, JSON.stringify(tests, null, 2));
}

// -------------------------------------
// ROUTES
// -------------------------------------

// Get questions for admin
app.get("/questions", (req, res) => {
  const raw = getAllQuestionsRaw();
  const questions = raw.map(normalizeQuestion);
  res.json(questions);
});

// Admin create test
app.post("/admin/create-test", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const raw = getAllQuestionsRaw();
  const questions = raw.map(normalizeQuestion);

  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 5);

  const testId = uuidv4();
  let tests = getAllTests();

  tests.push({
    testId,
    email,
    questions: selected,
    createdAt: new Date().toISOString(),
    submitted: false,
    score: null,
    isActiveSession: false,
    submittedAt: null
  });

  saveAllTests(tests);

  res.json({
    message: "Test created!",
    link: `http://localhost:3000/test/${testId}`,
    testId
  });
});

// Add question
app.post("/admin/add-question", (req, res) => {
  const { id, description, A, B, C, D, correct } = req.body;

  if (!id || !description || !A || !B || !C || !D || !correct) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const existing = xlsx.utils.sheet_to_json(sheet);

  existing.push({
    id,
    Description: description,
    "Option A": A,
    "Option B": B,
    "Option C": C,
    "Option D": D,
    "Correct answer": correct
  });

  workbook.Sheets[workbook.SheetNames[0]] = xlsx.utils.json_to_sheet(existing);
  xlsx.writeFile(workbook, filePath);

  res.json({ message: "Question added!" });
});

// Load test (without correct answers)
app.get("/test/:testId", (req, res) => {
  const { testId } = req.params;
  let tests = getAllTests();
  let found = tests.find(t => t.testId === testId);

  if (!found) return res.status(404).json({ error: "Test not found" });

  if (found.submitted) {
    return res.json({ alreadySubmitted: true, email: found.email });
  }

  if (found.isActiveSession) {
    return res.json({ needsConfirmation: true, email: found.email });
  }

  found.isActiveSession = true;
  saveAllTests(tests);

  const q = found.questions.map(q => ({
    id: q.id,
    description: q.description,
    options: q.options
  }));

  res.json({
    email: found.email,
    questions: q,
    alreadySubmitted: false,
    needsConfirmation: false
  });
});

// Force activate session
app.post("/test/:testId/force-activate", (req, res) => {
  const { testId } = req.params;
  let tests = getAllTests();
  let found = tests.find(t => t.testId === testId);

  if (!found) return res.status(404).json({ error: "Test not found" });

  if (found.submitted) {
    return res.json({ alreadySubmitted: true, email: found.email });
  }

  found.isActiveSession = true;
  saveAllTests(tests);

  const sanitized = found.questions.map(q => ({
    id: q.id,
    description: q.description,
    options: q.options
  }));

  res.json({
    forced: true,
    email: found.email,
    questions: sanitized
  });
});

// Submit test
function saveResultToExcel(result) {
  const resultsPath = path.join(__dirname, "results.xlsx");

  let workbook, sheet;

  if (fs.existsSync(resultsPath)) {
    workbook = xlsx.readFile(resultsPath);
    sheet = workbook.Sheets[workbook.SheetNames[0]];
  } else {
    workbook = xlsx.utils.book_new();
    sheet = xlsx.utils.json_to_sheet([]);
    xlsx.utils.book_append_sheet(workbook, sheet, "Results");
  }

  const existing = xlsx.utils.sheet_to_json(sheet);
  existing.push(result);

  workbook.Sheets[workbook.SheetNames[0]] = xlsx.utils.json_to_sheet(existing);
  xlsx.writeFile(workbook, resultsPath);
}

app.post("/submit-test/:testId", (req, res) => {
  const { answers } = req.body;
  const { testId } = req.params;

  let tests = getAllTests();
  let index = tests.findIndex(t => t.testId === testId);

  if (index === -1)
    return res.status(404).json({ error: "Test not found" });

  const found = tests[index];
  let score = 0;

  found.questions.forEach(q => {
    const userAnswer = answers.find(a => a.id === q.id);
    if (!userAnswer) return;
    if (!q.correctAnswer) return;

    if (q.correctAnswer.toLowerCase() === userAnswer.answer.toLowerCase()) {
      score++;
    }
  });

  tests[index].score = score;
  tests[index].submitted = true;
  tests[index].isActiveSession = false;
  tests[index].submittedAt = new Date().toISOString();
  tests[index].submittedAnswers = answers;
  saveAllTests(tests);

  saveResultToExcel({
    testId,
    email: found.email,
    score,
    submittedAt: new Date().toISOString(),
    answers: JSON.stringify(answers)
  });

  res.json({ message: "Submitted!", score });
});

// Session status check
app.get("/test/:testId/status", (req, res) => {
  const { testId } = req.params;

  let tests = getAllTests();
  let found = tests.find(t => t.testId === testId);

  if (!found) return res.status(404).json({ error: "Test not found" });

  res.json({
    submitted: found.submitted,
    isActiveSession: found.isActiveSession
  });
});

// Admin results
app.get("/admin/results", (req, res) => {
  const tests = getAllTests();

  const out = tests.map(t => ({
    testId: t.testId,
    email: t.email,
    createdAt: t.createdAt,
    submittedAt: t.submittedAt || null,
    score: t.score ?? null
  }));

  res.json(out);
});

// Root
app.get("/", (_, res) => {
  res.send("Server running!");
});

// Start server
const PORT = 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
