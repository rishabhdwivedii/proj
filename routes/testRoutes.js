const express = require("express");
const router = express.Router();
const test = require("../controllers/testController");

router.get("/:testId", test.loadTest);
router.post("/:testId/force-activate", test.forceActivate);
router.get("/:testId/status", test.getStatus);
router.post("/submit/:testId", test.submitTest);

module.exports = router;
