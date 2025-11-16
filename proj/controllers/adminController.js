const path = require("path");
const { v4: uuidv4 } = require("uuid");
const excel = require("../utils/excel");
const file = require("../utils/file");
const { normalizeQuestion } = require("../utils/questionParser");

const questionsPath = path.join(__dirname, "../data/questions.xlsx");
const testsPath = path.join(__dirname, "../data/tests.json");

exports.getQuestions = (req, res) => {
  const raw = excel.readExcel(questionsPath);
  res.json(raw.map(normalizeQuestion));
};

exports.createTest = (req, res) => {
  const { email } = req.body;

  const raw = excel.readExcel(questionsPath);
  const questions = raw.map(normalizeQuestion);

  const selected = [...questions].sort(() => Math.random() - 0.5).slice(0, 5);

  const tests = file.readJSON(testsPath);
  const testId = uuidv4();

  tests.push({
    testId,
    email,
    questions: selected,
    createdAt: new Date(),
    submitted: false,
    isActiveSession: false
  });

  file.writeJSON(testsPath, tests);

  res.json({
    message: "Test created!",
    testId,
    link: `http://localhost:3000/test/${testId}`
  });
};

exports.getResults = (req, res) => {
  const tests = file.readJSON(testsPath);

  res.json(
    tests.map(t => ({
      testId: t.testId,
      email: t.email,
      createdAt: t.createdAt,
      submittedAt: t.submittedAt || null,
      score: t.score ?? null
    }))
  );
};
