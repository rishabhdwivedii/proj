function mapCorrectAnswer(correctText, options) {
  if (!correctText) return null;

  const normalized = correctText.toString().trim().toLowerCase();

  const found = Object.entries(options).find(
    ([_, val]) => val.toString().trim().toLowerCase() === normalized
  );

  return found ? found[0] : null;
}

module.exports = {
  normalizeQuestion(q) {
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
};
