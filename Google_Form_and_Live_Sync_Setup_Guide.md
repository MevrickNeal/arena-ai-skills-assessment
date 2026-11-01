# ⚡ Live Google Form & Cloud Sync Setup Guide
### For Project Coordinator: Lian Mollick

---

## Overview

You have two powerful options to collect live data from all developers across the company:

| Option | How It Works | Developer Experience | Coordinator Experience |
|--------|--------------|----------------------|------------------------|
| **Option 1: Web App Portal (Recommended)** | Developers open your GitHub Pages link in **Developer Mode** (`#developer`) | They see a clean, modern form with the Arena logo. They can **only** submit their own information. | Submissions stream live into your **Coordinator Dashboard** and your Google Sheet. You can edit any response, rate potential, add notes, and export to Excel/Word/PDF. |
| **Option 2: Google Form** | Auto-generated official Google Form linked to Google Sheets | Developers fill out a standard Google Form | Responses appear in Google Sheets and can be synced live to your dashboard. |

---

## 2-Minute Setup: Google Sheets & Live Cloud Backend

Follow these steps to connect your dashboard to Google Sheets so all employee submissions update live:

### Step 1: Create a Google Sheet
1. Open your browser and go to [sheets.new](https://sheets.new)
2. Name the sheet: **`Arena AI Skills Assessment - 2026`**

### Step 2: Paste the Apps Script Backend
1. In the top menu of Google Sheets, click **Extensions** → **Apps Script**
2. Delete any existing code in the editor (`function myFunction() {...}`)
3. Open the file [google_apps_script_backend.js](file:///c:/Users/Arena/Downloads/Project%20Coordinator%20Jr/google_apps_script_backend.js) in your project folder, copy all contents, and paste it into the editor.
4. Click the **Save** button (💾 Floppy disk icon).

### Step 3: Deploy as a Free Web App
1. Click the blue **Deploy** button (top right) → **New deployment**
2. Click the gear icon next to *Select type* → choose **Web app**
3. Configure the settings:
   - **Description**: `Arena Assessment API`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone` *(Crucial: allows developers to submit without signing into your Google account)*
4. Click **Deploy**
5. Click **Authorize access** → Select your Google account → Click **Advanced** (small text at bottom) → Click **Go to Arena Assessment API (unsafe)** → Click **Allow**
6. Copy the **Web app URL** (looks like: `https://script.google.com/macros/s/AKfycb.../exec`)

### Step 4: Connect to Your Dashboard
1. Open your dashboard: [https://mevrickneal.github.io/arena-ai-skills-assessment/](https://mevrickneal.github.io/arena-ai-skills-assessment/)
2. Switch to **Coordinator Mode** (login as Lian Mollick, PIN: `2026`)
3. Click the **`☁️ Cloud Sync`** button in the navbar
4. Paste your Web App URL into the field and click **Save & Connect**!

---

## How to Share with Developers

Send this message in Slack / Teams / Email to all developers:

> **Subject / Message:**  
> **Urgent: AI Skills Assessment — Please Fill In Today**  
>  
> Dear Team,  
> As directed by the Managing Director, please take 10 minutes to complete your individual AI skills & expertise profile:  
>  
> 🔗 **Assessment Link:** [https://mevrickneal.github.io/arena-ai-skills-assessment/#developer](https://mevrickneal.github.io/arena-ai-skills-assessment/#developer)  
>  
> - Enter your Employee ID, current project, and rate your technical skills.  
> - You can add remarks for specific libraries and add any custom tools you use.  
> - Your responses are sent directly to Project Coordinator Lian Mollick.  
>  
> Thank you!  
> **Lian Mollick** — Project Coordinator Jr.

---

## Optional: How to Auto-Generate a Google Form in 1 Click

If you prefer using an official Google Form:
1. In the Apps Script editor (from Step 2 above), look at the function dropdown menu at the top (next to "Debug").
2. Select **`createOfficialGoogleForm`**.
3. Click **Run** (▶️ icon).
4. Check the Execution log at the bottom — it will output the live **Google Form link** created in your Google Drive, already linked to your Google Sheet!

---
