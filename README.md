# SenpAI

SenpAI is a an AI teacher that can help you learn new things and improve your knowledge. It differentiates from other AIs by providing multiple tools that are designed to improve your learning experience.

## Features

- Automatic Flashcard creation and management
- Automatic and manual creation of quizzes
- A canvas where you can write your exercise answers and the AI will analyze your work

## Run the projet

- setup environnement in linux

```sh
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

- then run the following command :

```
python3 backend/main.py
```

- open another tab and run the commands :

```
npm i
npm run dev
```

Finally run the following :

```
cd server/
npm i
npm run dev
```

this should open the web app on : `http://localhost:8080/`
