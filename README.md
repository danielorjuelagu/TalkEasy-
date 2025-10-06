TalkEasy - PWA (Frontend + Backend)
----------------------------------

This package contains two folders:

1) frontend/  -> Vite + React PWA (installable)
2) backend/   -> Node.js + Express + SQLite (saves sessions)

Quick local test:

Backend:
  cd backend
  npm install
  npm start
  # server runs on http://localhost:4000

Frontend:
  cd frontend
  npm install
  npm run build
  npx serve -s dist
  # open http://localhost:5173 or serve output

Deploy:
- Frontend: Vercel (set VITE_API_BASE env to your backend URL)
- Backend: Render or Railway (Node service)

Your app name: TalkEasy

Enjoy!
