# 🚀 MeetFlow AI: Notes-to-Action Assistant

MeetFlow AI is a sophisticated, AI-powered meeting productivity tool designed to transform raw, messy meeting notes into structured, actionable plans. By leveraging Large Language Models (LLMs) and advanced Natural Language Processing (NLP), the application automatically identifies specific tasks, assigns them to team members, detects deadlines, and categorizes them by priority.

![MeetFlow AI Banner](https://img.shields.io/badge/AI-Powered-blueviolet?style=for-the-badge&logo=openai)
![Python](https://img.shields.io/badge/Python-3.8+-blue?style=for-the-badge&logo=python)
![Flask](https://img.shields.io/badge/Flask-Web_App-lightgrey?style=for-the-badge&logo=flask)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase)

---

## ✨ Key Features

-   **🤖 Automated Task Extraction:** No more manual note-taking for action items. Converts unstructured text into sprint-ready JSON data.
-   **📊 Hybrid Confidence Scoring:** Uses a custom algorithm to score the reliability of each extracted task based on entity detection and AI-provided refinement.
-   **📅 Smart Deadline Detection:** Automatically identifies dates and timeframes (e.g., "next Wednesday", "April 26") and converts them to standard formats.
-   **👥 Assignee Identification:** Leverages SpaCy's Named Entity Recognition (NER) to detect "Who" is responsible for "What".
-   **⚡ Priority Categorization:** Automatically buckets tasks into **High**, **Medium**, and **Low** priority based on keyword urgency (e.g., "ASAP", "Critical").
-   **🌈 Premium Glassmorphism UI:** A stunning, modern dashboard with responsive task cards and real-time processing indicators.
-   **🔐 Secure Authentication:** Integrated user management via Supabase Auth for personal task history.

---

## 🛠️ Technology Stack

| Component      | Technology                                                                 |
| :------------- | :------------------------------------------------------------------------- |
| **Backend**    | Python 3, Flask                                                            |
| **AI Engine**  | Groq API (**Llama-3.3-70b-versatile**)                                     |
| **NLP Tools**  | SpaCy (`en_core_web_sm`), Dateparser                                       |
| **Database**   | Supabase (PostgreSQL)                                                      |
| **Auth**       | Supabase GoTrue                                                            |
| **Frontend**   | HTML5, CSS3 (Glassmorphism), JavaScript (ES6+), Jinja2                     |

---

## 📂 Project Structure

```text
├── app.py              # Main Flask server & orchestrator
├── llm_agent.py        # Core AI module (Groq Integration)
├── tools.py            # NLP utilities (SpaCy, Regex, Dateparsing)
├── supabase_client.py  # Database & Auth initialization
├── utils.py            # Logging & Config validation
├── templates/          # HTML Templates (Dashboard, History, etc.)
├── static/             # CSS (Glassmorphism theme) & JS logic
├── migration.sql       # Database schema setup
└── requirements.txt    # Python dependencies
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- Python 3.8+
- A [Groq Cloud](https://console.groq.com/) API Key.
- A [Supabase](https://supabase.com/) Project (URL and Anon Key).

### 2. Clone and Install
```bash
# Clone the repository
git clone https://github.com/gsaketh2006/meetflow_ai.git
cd meetflow_ai

# Install dependencies
pip install -r requirements.txt

# Download SpaCy NLP model
python -m spacy download en_core_web_sm
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
FLASK_SECRET_KEY=your_secret_key
GROQ_API_KEY=gsk_...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
LOG_LEVEL=INFO
```

### 4. Database Setup
Run the contents of `migration.sql` in your Supabase SQL Editor to prepare the `action_plans` table.

---

## 🚀 How to Use

1.  **Run the App:**
    ```bash
    python app.py
    ```
2.  **Access:** Visit `http://127.0.0.1:5000` and create an account.
3.  **Process Notes:**
    - Go to the **Dashboard**.
    - Drag and drop a `.txt` file containing meeting notes.
    - Click **Generate Action Plan**.
4.  **Manage Tasks:** Review the extracted tasks, check the confidence bars, and save them to your database for future reference in the **History** tab.

---

## 🧪 Example

**Input Notes:**
> "John needs to finish the API docs by Friday. This is urgent. Sarah will check the budget next week."

**AI Output:**
- **Task:** Finish API docs | **Assignee:** John | **Deadline:** Friday | **Priority:** High | **Confidence:** 98%
- **Task:** Check the budget | **Assignee:** Sarah | **Deadline:** Next week | **Priority:** Medium | **Confidence:** 85%

---
