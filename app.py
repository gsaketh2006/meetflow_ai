from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from llm_agent import MeetFlowAgent
from utils import get_logger, validate_config
from supabase_client import supabase
import os
import functools
from werkzeug.utils import secure_filename

# Initialize logger
logger = get_logger(__name__)

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev_key_123")
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB limit

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Validate Groq Config
try:
    validate_config()
except ValueError as e:
    logger.error(str(e))

# Initialize AI Agent
agent = MeetFlowAgent()

# --- Auth Decorator ---
def login_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# --- Routes ---

@app.route('/')
def home():
    if 'user' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        try:
            res = supabase.auth.sign_in_with_password({"email": email, "password": password})
            session['user'] = {
                "id": res.user.id,
                "email": res.user.email,
                "access_token": res.session.access_token
            }
            return jsonify({"success": True, "redirect": url_for('dashboard')})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 401
            
    return redirect(url_for('home'))

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        try:
            res = supabase.auth.sign_up({"email": email, "password": password})
            # If email confirmation is disabled, Supabase returns a session immediately
            if res.session:
                session['user'] = {
                    "id": res.user.id,
                    "email": res.user.email,
                    "access_token": res.session.access_token
                }
                return jsonify({"success": True, "redirect": url_for('dashboard')})
            else:
                return jsonify({"success": True, "message": "Account created! Please sign in."})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 400
            
    return redirect(url_for('home'))

@app.route('/logout')
def logout():
    supabase.auth.sign_out()
    session.clear()
    return redirect(url_for('home'))

def get_authed_client():
    """Returns a Supabase client authenticated with the current user's JWT."""
    token = session['user'].get('access_token')
    supabase.postgrest.auth(token)
    return supabase

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', user=session['user'])

@app.route('/history')
@login_required
def history():
    user_id = session['user']['id']
    try:
        db = get_authed_client()
        # Fetch all tasks for the user, ordered by date descending
        res = db.table('action_plans').select("*").eq('user_id', user_id).order('created_at', desc=True).execute()
        plans = res.data
        
        # Group tasks by date (YYYY-MM-DD)
        grouped_plans = {}
        for plan in plans:
            date_key = plan['created_at'][:10]
            if date_key not in grouped_plans:
                grouped_plans[date_key] = []
            grouped_plans[date_key].append(plan)
            
        # Get sorted dates (latest first)
        sorted_dates = sorted(grouped_plans.keys(), reverse=True)
        
        return render_template('history.html', 
                               grouped_plans=grouped_plans, 
                               sorted_dates=sorted_dates, 
                               user=session['user'],
                               total_tasks=len(plans))
    except Exception as e:
        logger.error(f"History fetch error: {str(e)}")
        return render_template('history.html', grouped_plans={}, sorted_dates=[], error=str(e), user=session['user'], total_tasks=0)

def calculate_confidence(task_obj):
    """
    Calculate confidence based on hybrid logic:
    - Base: 0.6
    - Clearly identified (non-empty): +0.1
    - Deadline detected: +0.1
    - Assignee detected (not 'Team'): +0.1
    - Priority High/Urgent: +0.1
    - AI Refinement: + (value from LLM, 0.0 to 0.1)
    """
    score = 0.6
    
    if task_obj.get('task'):
        score += 0.1
    
    deadline = task_obj.get('deadline', '').lower()
    if deadline and 'no deadline' not in deadline:
        score += 0.1
        
    assignee = task_obj.get('assignee', '').lower()
    if assignee and assignee != 'team':
        score += 0.1
        
    priority = task_obj.get('priority', '').lower()
    if priority == 'high':
        score += 0.1
        
    # AI Refinement (from updated LLM prompt)
    ai_refinement = task_obj.get('ai_confidence_refinement', 0.0)
    score += float(ai_refinement)
    
    return min(1.0, round(score, 2))

@app.route('/upload_notes', methods=['POST'])
@login_required
def upload_notes():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '' or not file.filename.endswith('.txt'):
        return jsonify({"error": "Invalid file. Please upload a .txt file"}), 400
    
    import time
    start_time = time.time()
    
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            notes_text = f.read()
            
        if not notes_text.strip():
            return jsonify({"error": "File is empty"}), 400
            
        # Process via AI Agent
        result = agent.process_notes(notes_text)
        tasks = result.get('tasks', [])
        
        # Calculate confidence for each task
        for t in tasks:
            t['confidence'] = calculate_confidence(t)
            
        # Overall Confidence calculation (Average of all tasks)
        if tasks:
            total_confidence = sum(t['confidence'] for t in tasks)
            result['confidence_score'] = int((total_confidence / len(tasks)) * 100)
        else:
            result['confidence_score'] = 0
            
        result['processing_time'] = round(time.time() - start_time, 2)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Processing error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

@app.route('/save_tasks', methods=['POST'])
@login_required
def save_tasks():
    user_id = session['user']['id']
    tasks = request.json.get('tasks', [])
    
    if not tasks:
        return jsonify({"error": "No tasks to save"}), 400
        
    prepared_tasks = []
    for t in tasks:
        prepared_tasks.append({
            "user_id": user_id,
            "task": t.get('task'),
            "assignee": t.get('assignee'),
            "deadline": t.get('deadline'),
            "priority": t.get('priority'),
            "confidence": t.get('confidence', 0.0)
        })
        
    try:
        db = get_authed_client()
        db.table('action_plans').insert(prepared_tasks).execute()
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"DB insert error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/delete_task/<task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    user_id = session['user']['id']
    try:
        db = get_authed_client()
        # Use task_id as string/id directly to support both bigint and uuid
        res = db.table('action_plans').delete().eq('id', task_id).eq('user_id', user_id).execute()
        return jsonify({"success": True})
    except Exception as e:
        logger.error(f"Delete error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
