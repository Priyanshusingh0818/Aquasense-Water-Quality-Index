# AquaSense: Interactive Water Pollution Dashboard

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Flask](https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white)
![Scikit-Learn](https://img.shields.io/badge/scikit_learn-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=Leaflet&logoColor=white)

AquaSense is an AI-powered, full-stack water quality monitoring and prediction platform. It leverages a rigorous Machine Learning architecture combined with Groq-powered Generative AI to provide real-time potability assessments and comprehensive environmental insights based on standard water parameter tests. 

## ✨ Key Features
- **Real-Time ML Predictions**: Upload water parameters (pH, Turbidity, Solids, etc.) to evaluate potability using a customized Scikit-Learn Random Forest Classifier.
- **AI Expert Analysis**: Integrates the `llama-3.3-70b-versatile` language model via the Groq API to provide deep, conversational scientific insights into water safety thresholds. 
- **Interactive Geospatial Monitoring**: Interactive Leaflet maps natively display the water quality statuses of 30 authentic Indian geographic coordinates (e.g., Dal Lake, Yamuna, Godavari). 
- **Complex Analytical Dashboard**: Data-rich interactive visualizations powered by Recharts (Radar, Area, Bar, and Line charts) modeling real Indian river contamination indices over time.

## 🛠️ Technology Stack
- **Frontend Core**: React 18 / TypeScript / Vite
- **UI & Styling**: Tailwind CSS, Framer Motion, Shadcn UI Components
- **Data Visualization**: Recharts, Leaflet Maps
- **Backend Architecture**: Python 3.12, Flask, Flask-CORS 
- **Machine Learning**: Pandas, Scikit-Learn, Joblib
- **Generative AI**: Groq Cloud API, Python Requests Integration
- **Infrastructure**: Vercel Serverless Architecture

---

## 🚀 Getting Started

To run this platform locally on your own machine:

### 1. Backend Server Setup
Navigate into the backend folder, install all python requirements, and start the Flask API.
```sh
cd backend
pip install -r requirements.txt
```

**Note**: Create a `.env` file inside the `backend` folder and add your Groq Token:
```env
GROQ_API_KEY=your_secure_api_token
```

To run the Flask endpoints manually:
```sh
python app.py
```
*The endpoint will boot on `localhost:5000/predict`.*

### 2. Frontend Development Server
In a new terminal window at the project root:
```sh
npm install
npm run dev
```
*The frontend will launch natively on `localhost:5173`.*

---

## ☁️ Deployment Instructions (Vercel)
This application is purposefully structured for deployment onto Vercel. 

The `vercel.json` file configures the Vercel architecture to host the React UI as **Static Assets** and uses the `backend/index.py` WSGI as a secure **Serverless Function** environment to run the Flask ML pipeline.

1. Ensure the `.env` file is excluded from your git index (it is set in `.gitignore`).
2. Push your code to your remote GitHub repository (`main` branch).
3. Import the repository into the [Vercel Dashboard](https://vercel.com/new).
4. Inject your `GROQ_API_KEY` into Vercel's **Environment Variables** configuration tab.
5. Deploy securely!

---

## 🧠 Machine Learning Engine 

AquaSense uses a **Random Forest Classifier** trained on 3,000+ localized water potability data points encompassing 9 distinct chemical parameters:
- `pH`, `Hardness`, `Solids`, `Chloramines`, `Sulfate`, `Conductivity`, `Organic_carbon`, `Trihalomethanes`, `Turbidity`.

Missing values are programmatically imputed during inference runtime and output predictions dynamically render probability bounds and accuracy tolerances directly into the UI.
