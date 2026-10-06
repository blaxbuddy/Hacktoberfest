# SafeNet: AI-Powered Emergency Response Platform 🚨

![SafeNet Banner](https://images.unsplash.com/photo-1602980068989-cb21ea50a80e?auto=format&fit=crop&q=80&w=1200&h=400)

**SafeNet** is a next-generation, real-time emergency dashboard built for rapid incident reporting and tactical evacuation planning. Powered by **Google's Gemma 4 AI**, it instantly analyzes field photos to assess danger severity and plots safe evacuation routes away from live disaster zones.

> **Hacktoberfest 2026 Submission** 🎃

## ✨ Key Features

- **📸 Instant AI Reporting**: A massive central camera interface allows users to snap a photo of an emergency. Gemma 4 AI instantly analyzes the image to determine the incident type and severity.
- **🗺️ Live Danger Heatmap**: Interactive map (via Leaflet) displaying real-time incident density and color-coded severity levels.
- **🛡️ Tactical Evacuation Routes**: Calculates and displays safe paths away from active "critical" danger zones, utilizing dynamic spatial routing algorithms.
- **⚡ Real-time Command Center**: Auto-refreshing statistics, timeline views, and critical alert banners for situational awareness.
- **📱 Responsive Glassmorphism UI**: A dark-themed, ultra-modern interface built with Tailwind CSS, featuring subtle glows and professional aesthetics.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **AI Model**: **Gemma 4** (via Google GenAI SDK `gemma-3-27b-it`)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL + Realtime)
- **Mapping**: [Leaflet.js](https://leafletjs.com/) with React-Leaflet
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Lucide Icons

## 🚀 Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/blaxbuddy/Hacktoberfest.git
   cd Hacktoberfest
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_google_ai_studio_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the dashboard.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/blaxbuddy/Hacktoberfest/issues). 

*This project was created as part of Hacktoberfest.*
