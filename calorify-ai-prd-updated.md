**CSE471: System Analysis and Design**

**Assignment on Functional Requirements**

**Proposed Project Title: Calorify**

| **Group No: 09, CSE471 Lab Section: 02,  [Summer] [2026]** | | |
| --- | --- | --- |
| **SL** | **ID** | **Name** |
| 1 | 24341140 | Evan Masrur Jaber |
| 2 | 23101261 | Jarin Tasnim Dia |
| 3 | 23101253 | Mohammed Mashrekin Yakub |
| 4 | 23301063 | Noorani Faiza Khan |

**Submission Date: 7th July, 2026**

# **Project Overview**

Calorify is an all in one AI-powered nutrition and diet management web application designed to cater to the needs of Bangladesh citizens. This system has two different types of users: General Users and Administrators. It offers an AI designed calorie counter to calculate calories for Bangladeshi food by analyzing photos uploaded by users, a smart grocery recommendation feature to find online grocery shop products, and an email notification system that alerts users to upcoming health risks, such as diabetes, based on their dietary habits.

**Tech Stack:**

* Language: Javascript
* Framework: React.js + Vite (Frontend), Node.js + Express.js (Backend)
* Styling: TailwindCSS
* Database: MongoDB
* Deployment: Vercel (Frontend), Render/Railway (Backend), HuggingFace Spaces (ML)
* External APIs:
  + **Gemini API:** For AI driven diet plan generation and document processing
  + **Gmail API:** For meal reminders and weekly plan reset notifications
  + **Calorie Counting API:** For counting calories and nutrients from food pictures
  + **Google Health API:** For automatically logging user data like daily steps and calorie burn from wearables.
  + **Bkash Payment API:** For Pro version subscription payment

**Third Party API Implementation & Responsibility Mapping :**

| **Name** | **Associated API(s)** | **Implementation** |
| --- | --- | --- |
| Evan Masrur Jaber | Gemini API | Personalized Diet Plan Generator and Smart Medical Report Parser (Module 1 and 3) |
| Google Health API | Automated Wearable Data Ingestion (Module 2) |
| Jarin Tasnim Dia | Gemini API | AI Calorie Estimator (Image Upload) (Module 1) and AI Meal Log (Module 2) |
| Calorie Counter API | Calculation for calories (Module 2) |
| Mohammed Mashrekin Yakub | Gemini API | AI Recipe Generator (Module 1) |
| Bkash Payment API | Pro Subscription & Payment Gateway (Module 3) |
| Noorani Faiza Khan | Gemini API | AI Ingredient Trivia & Fact Generator (Module 3) |
| Gmail API | Email Notification System (Module 3) |

**User Roles**

# **User:** The primary role of this group is to register, set up a health profile, receive AI generated meal plans, log meals, scan food photos for calorie estimation, browse grocery recommendations.

# **Admin:** Manages and monitors the entire platform. The admin has access to all registered users, and can monitor platform growth over 7/30/90 day periods, DAU/MAU, total diet plans generated, calorie scans performed, and notification delivery rate.

**Functional Requirements**

| SL | Common Workflows |
| --- | --- |
| 1 | Registration and Login System: Users register with name, email, phone number, password and basic health information (age, weight, height). All sessions are secured by JWT-based authentication. |
| 2 | Admin Role: Admin can get access to all users who are registered on the platform, statistics to track the growth of platform (new users for 7 days/30 days/90 days), DAU/MAU, total diet plan generated, calorie scan done, growth of post in community and notification delivery. |
| 3 | Profile Management: Users are able to edit details, health information (weight, goals, medical conditions) and notification settings from their profile dashboard. |

| Module 1 | |
| --- | --- |
| Member | Feature Description |
| 1 | **Personalized Diet Plan Generator:** Users fill a health profile form and the system sends a structured prompt to the Gemini API, which returns a full 7-day meal plan broken down by breakfast, lunch, dinner, and snacks with calorie and macronutrient details. The plan is stored in MongoDB and displayed on the dashboard. |
| 2 | **AI Calorie Estimator (Image Upload):** Users upload a meal photo which is sent to a FastAPI microservice. The model detects food items, estimates portion sizes and returns total calorie and macronutrient breakdowns. |
| 3 | **AI Recipe Generator:** The Gemini API will also generate the recipe if the user clicks on the “Generate Recipe” button when viewing a specific item from the diet chart. |
| 4 | **Daily Intake Tracker:** A daily summary view shows total calories consumed versus the user's daily calorie target with a visual progress bar for calories, carbs, protein, and fat. Weekly summaries are aggregated and stored for use in the monthly health report. |

| Module 2 | |
| --- | --- |
| Member | Feature Description |
| 1 | **Automated Wearable Data Ingestion:** Instead of manual entry, the system uses Google Health API Webhooks to autonomously capture data. When a user tracks an exercise or hits a step goal, an automated POST request sends a data payload to an Express.js route, mapping daily steps and calorie burn directly to the user's MongoDB log. |
| 2 | **AI Meal Log:** Users can log meals by entering the food items they have eaten and the Gemini API will log the estimated calorie and micro nutrients of the food in the database or via the “AI Calorie Estimator(Image Upload)” feature. |
| 3 | **Progress Tracker:** Users log daily weight and plan adherence status. The system plots weight over time using a line chart and tracks a daily adherence streak. Progress data is linked to the calorie log and stored in MongoDB for use in the monthly health report. |
| 4 | **Gamified Healthy Habit Challenges:** This feature encourages positive lifestyle changes by providing users with daily micro challenges (e.g., "Drink 2L Water", "Walk 5000 Steps"). Users track and log these activities; upon hitting the "Complete Challenge" button, the system updates their progress profile in MongoDB, calculating and awarding corresponding points. Accumulating these points automatically unlocks tier-based milestones and visual badges (Healthy Starter, Nutrition Master, Diet Legend) to enhance user engagement. |

| Module 3 | |
| --- | --- |
| Member | Feature Description |
| 1 | **Ingredient Shopping List Generator:** It’s about creating and displaying a list. The job of this feature is to take the weekly meal plan, process it, and produce a clean, usable shopping list. It extracts every ingredient from all 7 days, removes duplicates, consolidates quantities, groups items by category, and renders them as a checkable list on screen. The user's interaction here is with the list itself reading it, ticking items off, and using it as a reference while shopping. This feature lives on its own dedicated page or section. |
| 1 | **Smart Medical Report Parser:** Users can upload PDFs of physical lab reports or diagnostic records. The Node.js backend reads the file and utilizes the Gemini API to extract critical medical data such as diagnoses, HbA1c levels, and allergic constraints converting it into a structured JSON object saved directly to the database. |
| 2 | **Monthly Health Report Generator:** At the end of each calendar month the system compiles the user's calorie data, average nutrient intake, weight trend, plan adherence percentage, and streak history into a structured report rendered as a downloadable PDF with charts and personalized suggestions. |
| 2 | **Online Marketplace Integration:** Each ingredient in the shopping list has a "Buy Online" button that constructs a platform specific search URL using string interpolation and opens it in a new browser tab. Users select their preferred platform (Chaldal or Shopno) from a dropdown before browsing. |
| 3 | **Pro Subscription & Payment Gateway:** A monetization module allowing users to upgrade to a premium tier for advanced features, such as unlimited AI food scans. This utilizes the Bkash Payment API to process secure checkout transactions. Upon successful payment, the system updates the user's subscription status in MongoDB and unlocks restricted platform capabilities. |
| 4 | **Email Notification System:** The system sends email alerts for daily meal reminders, weekly plan refreshes, and registration or plan generation confirmations via the Gmail API. Users can manage notification preferences from their profile. |
| 4 | **AI Ingredient Trivia & Fact Generator:** When a user triggers the "Generate Recipe" action, the system modifies the structured prompt sent to the Gemini API. Alongside the standard cooking instructions, the API is instructed to return 2–3 localized health, nutritional, or historical facts about the recipe's core ingredients (e.g., the benefits of lentils or mustard oil in a Bangladeshi diet). This data is parsed from a structured JSON response and dynamically rendered on the recipe page to educate users on their dietary choices |