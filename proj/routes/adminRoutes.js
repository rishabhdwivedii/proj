const express = require("express");
const router = express.Router();
const admin = require("../controllers/adminController");

router.get("/questions", admin.getQuestions);
router.post("/create-test", admin.createTest);
router.get("/results", admin.getResults);

module.exports = router;
