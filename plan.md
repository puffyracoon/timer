# Timer Site Rewrite Plan (Node.js + React + Tailwind + Framer Motion)

## 1. Objective
- **Phase 1:** Recreate the exact functionality of the current timer site from [puffyracoon/timer](https://github.com/puffyracoon/timer) using **React**, **Tailwind CSS**, and **Framer Motion**.
- **Phase 2:** Redesign and expand functionality (multiple timers, persistent storage, authentication, animations, real-time sync).

---

## 2. Source Repo
Clone the existing timer repo:
```bash
git clone https://github.com/puffyracoon/timer
````

Use:

* `index.html` → for structure
* `style.css` → for current look (convert to Tailwind classes)
* `main.js` → for timer logic (convert to React state + hooks)

---

## 3. Project Structure

```
timer-react-node/
├─ backend/
│  ├─ server.js
│  ├─ package.json
│  └─ .env
├─ frontend/
│  ├─ package.json
│  ├─ vite.config.js
│  ├─ tailwind.config.js
│  ├─ postcss.config.js
│  └─ src/
│     ├─ main.jsx
│     ├─ App.jsx
│     ├─ components/
│     │  └─ Timer.jsx
│     └─ index.css
└─ README.md
```

---

## 4. Dependencies

**Backend (`backend/package.json`):**

```bash
npm init -y
npm install express cors dotenv
npm install -D nodemon
```

**Frontend (`frontend/package.json`):**

```bash
npm create vite@latest frontend --template react
cd frontend
npm install framer-motion
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## 5. Tailwind Setup

`tailwind.config.js`:

```js
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

`src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 6. Timer Component Conversion

`src/components/Timer.jsx`:

```jsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function Timer() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => setTime(t => t + 1), 1000); // from main.js
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center p-4"
    >
      <div className="text-4xl font-bold">{time}</div>
      <button
        onClick={() => setIsRunning(!isRunning)}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        {isRunning ? "Pause" : "Start"}
      </button>
      <button
        onClick={() => setTime(0)}
        className="mt-2 px-4 py-2 bg-red-500 text-white rounded"
      >
        Reset
      </button>
    </motion.div>
  );
}
```

---

## 7. Serving React via Node.js Backend

`backend/server.js`:

```js
const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "../frontend/dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

## 8. Build & Run

```bash
# In frontend/
npm run build

# In backend/
npm run dev
```

Visit: `http://localhost:3000` — the app should behave exactly like the original site.

---

## 9. Phase 2 Ideas

* Multiple timers
* Dark/light mode
* Persistent storage via MongoDB/PostgreSQL
* User authentication
* Real-time sync with Socket.io
* Enhanced animations

---

## 10. Deployment (Static Hosting Tier 0)
Current Implementation:
* Frontend decoupled from backend API: fetches `/events.json` and `/meta-spec.json` from `public/`.
* GitHub Pages workflow added at `.github/workflows/deploy-pages.yml` (builds `frontend` and publishes `dist`).

Remaining Tasks for Tier 0 Completion:
1. Populate full production data into `frontend/public/events.json` (currently trimmed) and `frontend/public/meta-spec.json` (placeholder).
2. Verify asset paths (fonts, audio, images) resolve correctly on Pages; adjust `<base>` or Vite `base` if deploying under subpath.
3. Remove legacy backend instructions from README or mark them optional.

Future Deployment Enhancements (Later Tiers):
* PWA service worker + offline cache (Tier 7)
* Data validation & unit tests enforced in CI before deploy (Tier 10)
* Automatic schedule diff reporting in PR comments.

```

