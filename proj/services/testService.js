module.exports = {
  calculateScore(questions, submittedAnswers) {
    let score = 0;

    questions.forEach(q => {
      const userAnswer = submittedAnswers.find(a => a.id === q.id);
      if (!userAnswer) return;

      if (
        q.correctAnswer &&
        q.correctAnswer.toLowerCase() === userAnswer.answer.toLowerCase()
      ) {
        score++;
      }
    });

    return score;
  }
};
