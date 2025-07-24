🥦 CaloriAI – Smart Food Tracker

CaloriAI is a mobile nutrition app built with Expo + React Native, designed to help users track meals, analyze macronutrients, plan diets, and interact with an AI assistant.
This project aims for a production-ready release – no MVP phase.

⸻

✨ Key Features

🟢 Free version
• Manual meal logging or from saved list
• History of all meals with nutrient breakdown
• Weekly nutrition statistics (calories, macros, trends)
• Pie/line charts (calories, protein, fat, carbs)
• Nutrition survey with TDEE calculation
• Meal planning with local notifications
• Built-in AI chatbot (limited messages/day)
• Partial cloud backup (Firestore)
• Export meals as CSV
• Dark/light theme support
• Polish & English language (auto-detected)

🟡 Premium features
• Unlimited access to AI assistant
• Meal recognition from photo (AI Vision)
• Full cloud backup of user data
• Personalized diet suggestions from AI
• Paywall integration + subscriptions
• Early access to new features

⸻

📱 Tech Stack
• Expo + React Native – core framework
• TypeScript – static typing
• Firebase – authentication, Firestore, partial backup
• OpenAI API – dietitian chatbot
• i18next – multilingual support (PL/EN)
• react-native-gifted-charts – pie/line charts
• WatermelonDB – offline data caching
• RevenueCat or Stripe (planned) – for subscriptions

⸻

📦 Project Structure (modular)

/components ← UI, common, modal components
/context ← global app contexts (auth, user, meal)
/feature ← feature-based modules (Meals, Auth, AI, etc.)
/hooks ← custom reusable hooks
/navigation ← React Navigation config
/services ← API and Firebase access
/theme ← design system (typography, colors, spacing)
/types ← shared types
/utils ← helper functions
/docs ← documentation (privacy, checklist, etc.)

🧪 Testing
npm run test

Includes:
• Unit/component tests via Jest
• Testing Library for UI
• Coverage support (planned)

CaloriAI respects your privacy:
• All data stays on your device unless you opt for cloud backup
• No ads, no trackers, no hidden data sharing
• Built-in account deletion (RODO compliant)

⸻

🧑‍💻 Author

Developed by Łukasz Kurczab
📧 lukasz.kurczab@gmail.com

This app is 100% free to use with optional premium features.

MIT License © 2025 Łukasz Kurczab
