# SenpAI

SenpAI is a an AI teacher that can help you learn new things and improve your knowledge. It differentiates from other AIs by providing multiple tools that are designed to improve your learning experience.

## Features

- Socratic method based chat for interactive learning.
- Image analysis: Upload an image (photo, screenshot, diagram) and ask questions about it.
- Automatic Flashcard creation and management.
- Automatic and manual creation of quizzes.

## Local Development Setup

Follow these steps to set up and run the project on your local machine.

### 1. Prerequisites

- Python 3.8+
- Node.js 16+
- npm

### 2. Clone the Repository

```bash
git clone <repository-url>
cd SenpAI
```

### 3. Install Frontend Dependencies

This will install all the necessary packages for the React user interface.

```bash
npm install
```

### 4. Set Up Python Backend

This will set up a virtual environment and install the Python packages for the backend server.

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
.\venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Return to the root directory
cd ..
```

### 5. Configure Backend API Keys

The backend requires API keys for its AI and image hosting services. You will need to create a `.env` file to store these keys.

1.  **Navigate to the `backend` directory.**
2.  **Copy the example file:** Copy the `backend/.env.example` file to a new file named `backend/.env`.
3.  **Edit `.env`** and add your API keys. You will need to get keys from the following services:

    -   `CEREBRAS_API_KEY`: For text-only chat generation.
        -   Get your key from: [Cerebras Model-as-a-Service](https://www.cerebras.net/model-as-a-service/)

    -   `OPENROUTER_API_KEY`: For the image analysis model.
        -   Get your key from: [OpenRouter.ai](https://openrouter.ai/keys)

    -   `IMGBB_API_KEY`: For hosting uploaded images to get a public URL.
        -   Get your key from: [imgbb API](https://api.imgbb.com/)

    Your `backend/.env` file should look like this:

    ```
    CEREBRAS_API_KEY="your_cerebras_key_here"
    OPENROUTER_API_KEY="your_openrouter_key_here"
    IMGBB_API_KEY="your_imgbb_key_here"
    ```

### 6. Run the Application

You need to run two services simultaneously in two separate terminals.

**Terminal 1: Start the Backend**

```bash
# Navigate to the backend directory
cd backend

# Make sure your virtual environment is activated
source venv/bin/activate

# Run the Flask server
python main.py
```

The backend will be running at `http://127.0.0.1:5001`.

**Terminal 2: Start the Frontend**

```bash
# From the root directory
npm run dev
```

The application will be available at `http://localhost:8080/`.

## Project Structure

- `backend/` - Python Flask API for AI features
- `src/` - React frontend application
- `database/` - JSON-based data storage