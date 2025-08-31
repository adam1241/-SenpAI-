

# SenpAI

An AI teacher that helps you learn through interactive tools including flashcards, doodle analysis, and personalized learning experiences.

## Features
- Automatic flashcard creation and management
- Doodle Mentor AI with handwriting recognition
- Interactive notebook interface
- Study reminders and progress tracking

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Installation & Setup

1. **Clone and navigate to the project**
   ```bash
   git clone <repository-url>
   cd SenpAI
   ```

2. **Set up Python backend**
   ```bash
   # Create virtual environment
   python3 -m venv venv
   
   # Activate virtual environment
   # Linux/Mac:
   source venv/bin/activate
   # Windows:
   .\venv\Scripts\activate
   
   # Install Python dependencies
   pip install -r requirements.txt
   ```

3. **Set up Node.js server (for doodle functionality)**
   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Install frontend dependencies**
   ```bash
   npm install
   ```

### Running the Application

You need to run three services simultaneously:

1. **Start the Python backend** (Terminal 1):
   ```bash
   python3 backend/main.py
   ```

2. **Start the Node.js server** (Terminal 2):
   ```bash
   npm run server
   ```

3. **Start the frontend** (Terminal 3):
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173/`

## Project Structure
- `backend/` - Python Flask API for AI features
- `server/` - Node.js server for doodle processing
- `src/` - React frontend application
- `database/` - JSON-based data storage
