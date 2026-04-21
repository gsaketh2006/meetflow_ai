# 🚀 MeetFlow AI: Notes-to-Action Assistant

MeetFlow AI is a unified, end-to-end Flask application that transforms meeting notes into structured action plans using Groq-powered AI orchestration.

## 🛠️ Features
- **Unified Architecture:** A single Flask app for both logic and UI.
- **Premium UI:** Glassmorphism design with responsive task cards.
- **AI Orchestration:** Multi-step tool-calling logic (Tasks, Deadlines, Assignees, Priority).
- **Fast & Efficient:** Powered by Groq's Llama-3.1 model.

## ⚙️ Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Prepare NLP Models
```bash
python -m spacy download en_core_web_sm
```

### 3. Environment Configuration
Create a `.env` file with your Groq API key:
```env
GROQ_API_KEY=gsk_...
LOG_LEVEL=INFO
```

## 🚀 Running the Application
```bash
python app.py
```
Visit `http://127.0.0.1:5000` in your browser.

## 🧪 Testing
1. Drag and drop the provided `sample_data/sample_notes.txt` into the upload zone.
2. Click **Generate Action Plan**.
3. Watch the real-time AI analysis results.

---
Developed for Enterprise Productivity.
