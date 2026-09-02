# ESC
# 🚀 COMET — AI Personalized Learning Assistant

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-passing-blue)
![License](https://img.shields.io/badge/license-MIT-yellow)

> **AI Personalized Learning Assistant**
> Recommends study plans and learning resources based on student performance.

---

## 📌 Overview

**COMET** is an AI-powered system that helps students learn more effectively by analyzing their performance and generating **personalized study plans and curated learning resources**.

Instead of one-size-fits-all learning, COMET adapts continuously using a simple but powerful loop:

```
Test → Analyze → Recommend → Learn → Re-test
```

This ensures every student gets a learning path tailored to their strengths and weaknesses.

---

## ✨ Features

* 📊 **Performance-Based Personalization**

  * Adapts study plans based on student scores

* 🧠 **Learning Memory**

  * Tracks progress, weak topics, and time spent

* 📅 **Dynamic Study Plans**

  * Generates daily/weekly learning schedules

* 📚 **Smart Resource Recommendations**

  * Suggests videos, articles, PDFs, and practice questions

* 📝 **Quiz & Evaluation System**

  * MCQ-based testing for continuous feedback

* 🔁 **Adaptive Feedback Loop**

  * Improves recommendations over time

---

## 🏗️ How It Works

```
        Student
           ↓
        Takes Quiz
           ↓
     Performance Analysis
           ↓
   Identify Weak Topics
           ↓
 Generate Study Plan + Resources
           ↓
        Learning
           ↓
        Re-test
```

---

## ⚡ Quickstart

### 1. Clone Repository

```bash
git clone https://github.com/your-username/comet.git
cd comet
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Application

```bash
uvicorn src.app:app --reload
```

App will run on:

```
http://localhost:8000
```

---

## 🐳 Run with Docker

```bash
docker build -t comet .
docker run -p 8000:8000 comet
```

---

## ⚙️ Configuration

Set environment variables:

| Variable       | Description          |
| -------------- | -------------------- |
| OPENAI_API_KEY | API key for AI model |
| LLM_PROVIDER   | openai / anthropic   |
| DATABASE_URL   | sqlite:///comet.db   |

Example:

```bash
export OPENAI_API_KEY=your_api_key
export LLM_PROVIDER=openai
```

---

## 📡 Usage

### 1. Create a Student

```bash
curl -X POST http://localhost:8000/user \
-H "Content-Type: application/json" \
-d '{"name": "John"}'
```

---

### 2. Submit Quiz

```bash
curl -X POST http://localhost:8000/quiz \
-H "Content-Type: application/json" \
-d '{"user_id": 1, "answers": [1,2,3,4]}'
```

---

### 3. Generate Study Plan

```bash
curl http://localhost:8000/plan/1
```

---

### 4. Get Learning Resources

```bash
curl http://localhost:8000/resources/1
```

---

### Python Example

```python
import requests

response = requests.get("http://localhost:8000/plan/1")
print(response.json())
```

---

## 🧠 Personalization Model

COMET stores and updates student performance over time.

### Example Student Data

```json
{
  "user_id": 1,
  "scores": [60, 75, 80],
  "weak_topics": ["Algebra", "Physics"],
  "time_spent": 150
}
```

---

## 📁 Project Structure

```
COMET/
│── src/              # Backend API
│── agents/           # Logic for planning, evaluation, recommendation
│── examples/         # Sample quizzes and data
│── tests/            # Unit tests
│── requirements.txt
│── Dockerfile
│── README.md
```

---

## 🎥 Demo Walkthrough (2–3 Minutes)

1. Create a student
2. Run a quiz
3. Show identified weak topics
4. Generate personalized study plan
5. Display recommended learning resources

---

## 🛣️ Roadmap

* 📱 Web dashboard UI
* 🎤 Voice-based tutor
* 📈 Advanced analytics
* 🌐 Integration with real learning platforms

---

## 🤝 Contributing

Contributions are welcome!
Please read `CONTRIBUTING.md` for guidelines.

---

## 📄 License

MIT License

---

## 🙌 Acknowledgements

Built for hackathons, students, and the future of personalized education 🚀

---

## ⚡ 60-Second Demo Script

* “This is COMET, an AI-powered personalized learning assistant.”
* “Student takes a quiz.”
* “System identifies weak topics automatically.”
* “Generates a personalized study plan.”
* “Recommends resources tailored to the student.”
* “As the student improves, the system adapts.”

---

## 📄 Hackathon Summary

COMET is an AI Personalized Learning Assistant that recommends study plans and learning resources based on student performance. Traditional learning systems treat all students the same, but COMET adapts dynamically to each individual.

The system evaluates student performance through quizzes, identifies weak areas, and generates targeted study plans. It also recommends curated learning resources such as videos, articles, and practice problems.

A feedback loop (Test → Analyze → Recommend → Learn → Re-test) ensures continuous improvement and personalization. Over time, the system builds a memory of student progress, making recommendations smarter and more effective.

COMET is built using Python, FastAPI, and modern AI models, making it scalable and easy to extend. It can be used by students, educators, or integrated into educational platforms.

---

## 🏆 Why This Wins

* 🎯 Solves real problem: personalized learning
* 🔁 Continuous improvement via feedback loop
* 📊 Data-driven recommendations
* 🧠 Adapts to each student individually
* 🚀 More effective than static or generic learning tools

---

If you want, I can also generate a ready-to-paste GitHub Actions CI workflow file and a sample Docker Compose for local demo—say **"generate CI & docker-compose"**.
