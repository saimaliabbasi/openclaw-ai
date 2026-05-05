# 🧠 OpenClaw — Autonomous AI Agent System

OpenClaw is an AI-powered autonomous agent system that can perform real-world digital work such as:
- Searching the web for businesses
- Extracting structured contact information (emails, phones, websites)
- Cleaning and organizing data using automated “nanobot” functions
- Exporting results into Excel files
- Sending automated email campaigns through Gmail

Instead of simply answering questions like a chatbot, OpenClaw behaves like a **digital worker** that executes full workflows from start to finish.

---

# 🚀 Key Idea

Traditional AI systems only respond to prompts.

OpenClaw is different:

> It takes a goal → plans steps → uses tools → processes data → produces real-world output.

Example:

User: Find 10 software companies in Dubai


OpenClaw will:
1. Search the web
2. Collect business data
3. Extract emails and websites
4. Clean the results
5. Show a structured table
6. Allow export to Excel or email automation

---

# ⚙️ System Architecture

OpenClaw follows a modular AI agent architecture:


Frontend (UI Dashboard)
↓
Backend (Node.js Server)
↓
AI Orchestrator (Groq LLaMA 3 / OpenAI)
↓
Tool Layer (Search, Email, Excel, Nanobots)
↓
Output Layer (Table / Excel / Email)


---

# 🧠 How It Works (Step-by-Step)

## 1. User Input
The user enters a query like:
> "Find gyms in Islamabad"

---

## 2. AI Orchestration (Brain Layer)
The AI (LLaMA 3 via Groq) analyzes the request and decides:
- what to search
- what data is needed
- what tools to use

It converts the request into a structured plan.

---

## 3. Web Search Tool
The system uses **Tavily API** to search the internet and retrieve:
- business listings
- websites
- snippets of text

---

## 4. Data Extraction (AI Processing)
The AI reads raw web data and extracts:
- Business Name
- Email
- Phone Number
- Website
- Location

It converts unstructured text into structured JSON.

---

## 5. Nanobot Cleaning Layer
Small utility functions ("Nanobots") clean and improve the data:
- Remove duplicates
- Fix broken URLs
- Normalize formatting
- Validate emails

---

## 6. Output Generation
The final cleaned data is displayed as:
- Interactive table
- Exportable Excel file
- Email-ready dataset

---

## 7. Action Tools
Users can:

### 📊 Export Excel
Uses SheetJS to generate `.xlsx` files.

### 📧 Send Emails
Uses Nodemailer with Gmail App Password to send bulk personalized emails.

---

# 🧰 Tech Stack

### Frontend
- HTML
- CSS
- JavaScript

### Backend
- Node.js
- Express.js

### AI Models
- Groq (LLaMA 3 70B / 8B)
- Optional OpenAI API

### APIs
- Tavily Search API
- Gmail SMTP / Nodemailer

### Libraries
- SheetJS (Excel export)

---

# 🧩 Project Structure


OpenClaw/
│
├── frontend/
│ ├── index.html
│ ├── app.js
│ ├── styles.css
│
├── backend/
│ ├── server.js
│ ├── ai.js
│
│ ├── tools/
│ │ ├── search.js
│ │ ├── email.js
│ │ ├── excel.js
│ │ ├── nanobots.js
│
├── config/
│ ├── .env.example
│
├── package.json
├── README.md


---

# 🔐 Environment Variables

Create a `.env` file:


GROQ_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here
GMAIL_USER=your_email@gmail.com

GMAIL_APP_PASSWORD=your_app_password


---
# screenshot
<img width="1365" height="665" alt="image" src="https://github.com/user-attachments/assets/e0745e7b-7197-4f61-a015-3ef2d70d8da3" />

# ⚡ How to Run Locally

```bash
# Install dependencies
npm install

# Start server
npm start

Then open:

http://localhost:3000




