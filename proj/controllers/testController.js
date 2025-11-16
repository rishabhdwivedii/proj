// const path = require("path");
// const excel = require("../utils/excel");
// const file = require("../utils/file");
// const { calculateScore } = require("../services/testService");

// const testsPath = path.join(__dirname, "../data/tests.json");
// const resultsPath = path.join(__dirname, "../data/results.xlsx");

// // -----------------------------
// // Load test
// // -----------------------------
// exports.loadTest = (req, res) => {
//   const { testId } = req.params;
//   const { deviceId } = req.query;

//   const tests = file.readJSON(testsPath);
//   const test = tests.find(t => t.testId === testId);

//   if (!test) return res.status(404).json({ error: "Test not found" });

//   // Already submitted
//   if (test.submitted)
//     return res.json({ alreadySubmitted: true });

//   // If device mismatch = session active on another device
//   if (test.isActiveSession && test.activeDeviceId !== deviceId) {
//     return res.json({
//       needsConfirmation: true,
//       email: test.email
//     });
//   }

//   // Activate session for this device
//   test.isActiveSession = true;
//   test.activeDeviceId = deviceId;
//   file.writeJSON(testsPath, tests);

//   return res.json({
//     email: test.email,
//     questions: test.questions.map(q => ({
//       id: q.id,
//       description: q.description,
//       options: q.options
//     }))
//   });
// };

// // -----------------------------
// // Force activation (kill old device)
// // -----------------------------
// exports.forceActivate = (req, res) => {
//   const { testId } = req.params;
//   const { deviceId } = req.body;

//   const tests = file.readJSON(testsPath);
//   const test = tests.find(t => t.testId === testId);

//   if (!test) return res.status(404).json({ error: "Test not found" });

//   if (test.submitted)
//     return res.json({ alreadySubmitted: true });

//   // Force transfer session
//   test.isActiveSession = true;
//   test.activeDeviceId = deviceId;
//   file.writeJSON(testsPath, tests);

//   return res.json({
//     email: test.email,
//     questions: test.questions
//   });
// };

// // -----------------------------
// // Status check (for auto-close on old devices)
// // -----------------------------
// exports.getStatus = (req, res) => {
//   const { testId } = req.params;
//   const { deviceId } = req.query;

//   const tests = file.readJSON(testsPath);
//   const test = tests.find(t => t.testId === testId);

//   return res.json({
//     submitted: test.submitted,
//     isActiveSession: test.isActiveSession && test.activeDeviceId === deviceId
//   });
// };

// // -----------------------------
// // Submit Test
// // -----------------------------
// exports.submitTest = (req, res) => {
//   const { testId } = req.params;
//   const { answers, deviceId } = req.body;

//   const tests = file.readJSON(testsPath);
//   const test = tests.find(t => t.testId === testId);

//   if (!test) return res.status(404).json({ error: "Test not found" });

//   // Prevent another device from submitting
//   if (test.activeDeviceId !== deviceId) {
//     return res.status(403).json({ error: "Unauthorized device" });
//   }

//   const score = calculateScore(test.questions, answers);

//   // Update test.json
//   test.score = score;
//   test.submitted = true;
//   test.isActiveSession = false;
//   test.submittedAt = new Date().toISOString();
//   test.submittedAnswers = answers;

//   file.writeJSON(testsPath, tests);

//   // Save in Excel also
//   excel.appendResult(resultsPath, {
//     testId: test.testId,
//     email: test.email,
//     score,
//     createdAt: test.createdAt,
//     submittedAt: test.submittedAt
//   });

//   res.json({ message: "Submitted!", score });
// };


const path = require("path");
const excel = require("../utils/excel");
const file = require("../utils/file");
const { calculateScore } = require("../services/testService");

const testsPath = path.join(__dirname, "../data/tests.json");
const resultsPath = path.join(__dirname, "../data/results.xlsx");

// -------------------------
// LOAD TEST
// -------------------------
exports.loadTest = (req, res) => {
  const deviceId = req.headers["x-device-id"];
  const { testId } = req.params;

  const tests = file.readJSON(testsPath);
  const test = tests.find(t => t.testId === testId);

  if (!test) return res.status(404).json({ error: "Test not found" });

  // Already submitted
  if (test.submitted) {
    return res.json({ alreadySubmitted: true, email: test.email });
  }

  // Someone else is active
  if (test.isActiveSession && test.activeDeviceId !== deviceId) {
    return res.json({
      needsConfirmation: true,
      email: test.email
    });
  }

  // Lock session to THIS device
  test.isActiveSession = true;
  test.activeDeviceId = deviceId;
  file.writeJSON(testsPath, tests);

  res.json({
    email: test.email,
    questions: test.questions.map(q => ({
      id: q.id,
      description: q.description,
      options: q.options
    }))
  });
};

// -------------------------
// FORCE ACTIVATE
// -------------------------
exports.forceActivate = (req, res) => {
  const deviceId = req.headers["x-device-id"];
  const { testId } = req.params;

  const tests = file.readJSON(testsPath);
  const test = tests.find(t => t.testId === testId);

  if (test.submitted) return res.json({ alreadySubmitted: true });

  test.isActiveSession = true;
  test.activeDeviceId = deviceId;

  file.writeJSON(testsPath, tests);

  res.json({
    email: test.email,
    questions: test.questions
  });
};

// -------------------------
// STATUS CHECK
// -------------------------
exports.getStatus = (req, res) => {
  const tests = file.readJSON(testsPath);
  const test = tests.find(t => t.testId === req.params.testId);
  const deviceId = req.headers["x-device-id"];

  const sessionLost =
    test.isActiveSession && test.activeDeviceId !== deviceId;

  res.json({
    submitted: test.submitted,
    isActiveSession: test.isActiveSession,
    sessionLost
  });
};

// -------------------------
// SUBMIT TEST
// -------------------------
exports.submitTest = (req, res) => {
  const deviceId = req.headers["x-device-id"];
  const { testId } = req.params;
  const { answers } = req.body;

  let tests = file.readJSON(testsPath);
  let found = tests.find(t => t.testId === testId);

  // Block submit if already submitted
  if (found.submitted) {
    return res.status(400).json({ error: "Test already submitted" });
  }

  // Block submit if wrong device
  if (found.activeDeviceId !== deviceId) {
    return res.status(403).json({ error: "Invalid device" });
  }

  // ---------- Calculate Score ----------
  const score = calculateScore(found.questions, answers);

  found.score = score;
  found.submitted = true;
  found.isActiveSession = false;
  found.activeDeviceId = null;
  found.submittedAt = new Date();
  found.submittedAnswers = answers;

  // Save JSON
  file.writeJSON(testsPath, tests);

  // Save to Excel as well
  const prevData = excel.readExcel(resultsPath);
  prevData.push({
    testId: found.testId,
    email: found.email,
    score,
    submittedAt: found.submittedAt
  });
  excel.writeExcel(resultsPath, prevData);

  res.json({ message: "Submitted!", score });
};
