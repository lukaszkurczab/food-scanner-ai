Food Scanner AI

Food Scanner AI is a mobile app built with React Native (Expo) that helps users take a photo of their meal, recognize ingredients using AI, estimate nutritional values, and track meal history over time.

---

✨ Features

-Take a photo of your meal using the camera
-Detect ingredients with AI (mocked or real)
-Estimate macronutrients per ingredient (kcal, protein, fat, carbs)
-Display nutrition breakdown with charts
-Save meals to history
-Clear meal history
-View weekly nutrition analysis (calories, protein, fat, carbs)
-Ask a built-in AI dietitian chatbot (powered by OpenAI)
-Edit detected ingredients and amounts before saving

---

📱 Tech Stack

React Native (Expo) – front-end & camera access
TypeScript – static typing
AsyncStorage – meal history persistence
USDA FoodData Central API – for real nutrition data
OpenAI API – for chat with AI dietitian
react-native-gifted-charts – for macro charts

---

🚀 Getting Started

1. Clone the repo
   git clone https://github.com/yourusername/food-scanner-ai.git
   cd food-scanner-ai

2. Install dependencies
   npm install

3. Set up environment variables
   Create a .env file at the root:

OPENAI_API_KEY=your-openai-api-key

⚠️ Do not commit .env to version control!

4. Start the app
   npx expo start

---

🧑‍💻 Author

Developed by Łukasz Kurczab as a portfolio project. Connect with me:
lukasz.kurczab@gmail.com

This app is 100% free to use and works fully offline (except for chat & nutrition data). No accounts. No ads.

MIT License © 2025 Łukasz Kurczab
