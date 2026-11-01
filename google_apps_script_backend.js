/**
 * ARENA AI SKILLS ASSESSMENT — GOOGLE APPS SCRIPT BACKEND
 * Author: Lian Mollick (Project Coordinator Jr.)
 * 
 * ⚠️ QUICK FIX INSTRUCTIONS (If you see "form is not defined"):
 * 1. Open your Apps Script editor in Google Sheets (Extensions -> Apps Script)
 * 2. In Code.gs, press Ctrl+A (Select All) and DELETE everything
 * 3. Paste this ENTIRE code file from line 1 to the end
 * 4. Click Save (Floppy disk icon or Ctrl+S)
 * 5. Click "Deploy" -> "Manage deployments" -> Click the Pencil (Edit) icon
 * 6. Under Version, select "New version" -> Click "Deploy"
 * 7. Done! Now both Google Sheet and Web App are 100% active and error-free!
 * 
 * OPTIONAL: GITHUB REPO PARALLEL BACKUP
 * If you paste your GitHub Personal Access Token below into GITHUB_TOKEN,
 * every submission will automatically save to Google Sheet AND commit to
 * data/submissions.json on your GitHub repository in parallel!
 */

// OPTIONAL: Paste your GitHub Personal Access Token here for server-side GitHub parallel auto-commit:
var GITHUB_BACKUP_TOKEN = ""; // e.g. "ghp_xxxxxxxxxxxx" (leave empty if using client-side sync)
var GITHUB_REPO_OWNER = "MevrickNeal";
var GITHUB_REPO_NAME = "arena-ai-skills-assessment";
var GITHUB_REPO_PATH = "data/submissions.json";

// ════════════════════════════════════════════════════════════
// 1. WEB APP API (RECEIVES LIVE SUBMISSIONS & SERVES DATA)
// ════════════════════════════════════════════════════════════

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var sheet = getOrCreateResponsesSheet();
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    
    // Check if updating an existing record (by EmpId or ID) or inserting new
    var empId = payload.empId || '';
    var rowIndex = findRowByEmpId(sheet, empId, payload.id);
    
    var rowData = [
      new Date().toLocaleString(),
      payload.name || '',
      payload.empId || '',
      payload.department || '',
      payload.title || '',
      payload.project || '',
      payload.role || '',
      payload.overallScore || '—',
      payload.avgKnowledge || '—',
      payload.avgSkills || '—',
      payload.aiPotential || '',
      (payload.languages || []).join(', '),
      (payload.aiTools || []).join(', '),
      payload.aiProjects || 'no',
      payload.aiProjectCount || '0',
      payload.aiProjectDesc || '',
      payload.wantedTraining || '',
      payload.noteImpression || '',
      JSON.stringify(payload) // Full raw JSON in last column for complete recovery
    ];
    
    if (rowIndex > 0) {
      // Update existing developer row
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // Append new developer row
      sheet.appendRow(rowData);
    }
    
    // Parallel backup to GitHub repository if token is configured
    try {
      if (GITHUB_BACKUP_TOKEN) {
        parallelPushToGitHub();
      }
    } catch(ghErr) {
      Logger.log("GitHub parallel push warning: " + ghErr);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Assessment saved successfully for " + (payload.name || payload.empId),
      id: payload.id
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var sheet = getOrCreateResponsesSheet();
    var values = sheet.getDataRange().getValues();
    var assessments = [];
    
    // Column 19 (index 18) stores the full JSON object
    for (var i = 1; i < values.length; i++) {
      var jsonStr = values[i][18];
      if (jsonStr) {
        try {
          var item = JSON.parse(jsonStr);
          assessments.push(item);
        } catch (err) {}
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      count: assessments.length,
      data: assessments
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateResponsesSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Live Submissions");
  if (!sheet) {
    sheet = ss.insertSheet("Live Submissions");
    var headers = [
      "Timestamp", "Developer Name", "Employee ID", "Department", "Designation",
      "Assigned Project", "Role", "Overall AI Score", "AI Knowledge Score", "Tech Skills Score",
      "AI Potential", "Languages", "Daily AI Tools", "AI Projects Done", "AI Project Count",
      "Significant AI Project", "Requested Training", "Coordinator Notes", "Raw JSON Data"
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function findRowByEmpId(sheet, empId, id) {
  if (!empId && !id) return -1;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var rowEmpId = String(data[i][2]).trim();
    if (empId && rowEmpId && rowEmpId.toLowerCase() === String(empId).trim().toLowerCase()) {
      return i + 1; // 1-based index in Sheet
    }
  }
  return -1;
}

// ════════════════════════════════════════════════════════════
// 2. PARALLEL GITHUB REPO COMMIT ENGINE (AUTO-BACKUP)
// ════════════════════════════════════════════════════════════

function parallelPushToGitHub() {
  var token = GITHUB_BACKUP_TOKEN || PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!token) return;
  
  var sheet = getOrCreateResponsesSheet();
  var values = sheet.getDataRange().getValues();
  var list = [];
  for (var i = 1; i < values.length; i++) {
    var rawJson = values[i][18];
    if (rawJson) {
      try { list.push(JSON.parse(rawJson)); } catch(e) {}
    }
  }
  
  var apiUrl = "https://api.github.com/repos/" + GITHUB_REPO_OWNER + "/" + GITHUB_REPO_NAME + "/contents/" + GITHUB_REPO_PATH;
  
  // Get current SHA
  var sha = "";
  try {
    var getRes = UrlFetchApp.fetch(apiUrl, {
      method: "get",
      headers: {
        "Authorization": "token " + token,
        "User-Agent": "Arena-Apps-Script",
        "Accept": "application/vnd.github.v3+json"
      },
      muteHttpExceptions: true
    });
    if (getRes.getResponseCode() === 200) {
      var body = JSON.parse(getRes.getContentText());
      sha = body.sha;
    }
  } catch(e) {}
  
  var jsonContent = JSON.stringify(list, null, 2);
  var base64Content = Utilities.base64Encode(Utilities.newBlob(jsonContent).getBytes());
  
  var payload = {
    message: "chore: Parallel auto-sync " + list.length + " developer dossiers from Google Apps Script",
    content: base64Content,
    branch: "main"
  };
  if (sha) payload.sha = sha;
  
  UrlFetchApp.fetch(apiUrl, {
    method: "put",
    contentType: "application/json",
    headers: {
      "Authorization": "token " + token,
      "User-Agent": "Arena-Apps-Script",
      "Accept": "application/vnd.github.v3+json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
}

// ════════════════════════════════════════════════════════════
// 3. OPTIONAL: AUTOMATIC GOOGLE FORM GENERATOR
// ════════════════════════════════════════════════════════════

function createOfficialGoogleForm() {
  if (typeof FormApp === "undefined") {
    throw new Error("FormApp is only available inside Google Workspace.");
  }
  
  var form = FormApp.create("Arena — Developer AI Skills & Expertise Assessment");
  form.setDescription("Official developer skills and AI readiness assessment authorized by Managing Director Sir. Please fill in your responses accurately. Responses will be reviewed by Project Coordinator Lian Mollick.");
  form.setCollectEmail(true);
  
  // Section 1: Developer Info
  var s1 = form.addSectionHeaderItem();
  s1.setTitle("Section A: Developer Information & Assignment");
  
  form.addTextItem().setTitle("Full Name").setRequired(true);
  form.addTextItem().setTitle("Employee ID").setRequired(true);
  form.addTextItem().setTitle("Department / Team").setHelpText("e.g. Engineering, Mobile, QA, IoT").setRequired(true);
  form.addTextItem().setTitle("Designation / Job Title").setHelpText("e.g. Senior Software Engineer").setRequired(true);
  form.addTextItem().setTitle("Current Project(s) Assigned").setHelpText("e.g. OSRMS, Arena HRM, Logistics ERP").setRequired(true);
  
  var roleItem = form.addMultipleChoiceItem();
  roleItem.setTitle("Role in Current Project");
  roleItem.setChoiceValues(["Lead Developer", "Senior Developer", "Sole Developer (Individual)", "Full Stack Developer", "Backend Developer", "Frontend Developer", "QA / Automation Engineer", "Junior Developer"]);
  
  form.addTextItem().setTitle("Years in Company").setRequired(false);
  form.addTextItem().setTitle("Total Years of Professional Experience").setRequired(false);
  
  var langItem = form.addCheckboxItem();
  langItem.setTitle("Primary Programming Languages");
  langItem.setChoiceValues(["Python", "JavaScript", "TypeScript", "C# / .NET", "Java", "PHP", "Dart / Flutter", "C / C++", "Go (Golang)", "Rust", "Kotlin", "Swift", "SQL"]);
  langItem.showOtherOption(true);
  
  // Section 2: AI Knowledge
  var s2 = form.addSectionHeaderItem();
  s2.setTitle("Section B: AI Knowledge & Conceptual Awareness (Scale 1 to 5)");
  s2.setHelpText("1 = No Knowledge | 2 = Basic Awareness | 3 = Working Knowledge | 4 = Proficient | 5 = Expert");
  
  var domains = [
    "Core AI/ML Concepts (Supervised, Unsupervised, Reinforcement Learning)",
    "Deep Learning & Neural Architectures (CNNs, Transformers)",
    "Natural Language Processing (NLP)",
    "Computer Vision & Image/Video Processing",
    "Generative AI & LLMs (Prompting, Fine-Tuning, Diffusion)",
    "AI Ethics, Responsible AI & Data Privacy",
    "Current AI Trends & Industry Awareness"
  ];
  
  domains.forEach(function(d) {
    var scaleItem = form.addScaleItem();
    scaleItem.setTitle(d);
    scaleItem.setBounds(1, 5);
    scaleItem.setLabels("No Knowledge", "Expert");
    form.addTextItem().setTitle(d + " — Remarks / Specific Experience");
  });
  
  // Section 3: Tech Stacks
  var s3 = form.addSectionHeaderItem();
  s3.setTitle("Section C: Hands-On AI/ML Tech Stacks & Tools");
  s3.setHelpText("Rate your hands-on proficiency with tools and mention specific versions or projects in the remarks.");
  
  var tools = [
    "Python for AI/ML (NumPy, Pandas)",
    "PyTorch",
    "TensorFlow / Keras",
    "Scikit-learn",
    "Hugging Face Transformers",
    "OpenAI API / GPT Integration",
    "Google Gemini / Vertex AI",
    "LangChain / LlamaIndex",
    "Prompt Engineering",
    "RAG (Retrieval-Augmented Generation)",
    "Vector Databases (Pinecone, Chroma, etc.)",
    "Fine-Tuning LLMs (LoRA, QLoRA)",
    "MLOps & Deployment (FastAPI, Docker, ONNX)",
    "Cloud AI (AWS SageMaker, Azure AI, GCP)"
  ];
  
  tools.forEach(function(t) {
    var scale = form.addScaleItem();
    scale.setTitle(t + " — Proficiency");
    scale.setBounds(1, 5);
    scale.setLabels("Never Used", "Expert");
    
    var workChoice = form.addMultipleChoiceItem();
    workChoice.setTitle(t + " — Used Professionally at Work?");
    workChoice.setChoiceValues(["Yes", "No"]);
    
    form.addTextItem().setTitle(t + " — Remarks / Projects");
  });
  
  form.addParagraphTextItem().setTitle("Any Other AI Tools / Tech Stacks Not Listed Above (Add your custom tools & proficiency)");
  
  // Section 4: Projects
  var s4 = form.addSectionHeaderItem();
  s4.setTitle("Section D: AI Project Experience");
  
  var projChoice = form.addMultipleChoiceItem();
  projChoice.setTitle("Have you worked on any AI/ML projects?");
  projChoice.setChoiceValues(["Yes", "No"]);
  
  form.addTextItem().setTitle("Total AI Projects Completed");
  form.addParagraphTextItem().setTitle("Describe your most significant AI project (tech stack, what it did, your role)");
  
  var prodChoice = form.addMultipleChoiceItem();
  prodChoice.setTitle("Have you deployed an AI model to production?");
  prodChoice.setChoiceValues(["Yes", "No"]);
  
  // Section 5: Daily AI Usage & Training
  var s5 = form.addSectionHeaderItem();
  s5.setTitle("Section E: Daily AI Usage & Upskilling Interests");
  
  var dailyTools = form.addCheckboxItem();
  dailyTools.setTitle("Which AI tools do you use in your daily workflow?");
  dailyTools.setChoiceValues(["GitHub Copilot", "ChatGPT Plus / Team", "Google Gemini", "Claude", "Cursor IDE", "Windsurf", "Tabnine", "Ollama / Local LLMs"]);
  dailyTools.showOtherOption(true);
  
  form.addParagraphTextItem().setTitle("How has AI improved your coding productivity?");
  form.addParagraphTextItem().setTitle("Where in your CURRENT Arena project could AI be applied?");
  form.addParagraphTextItem().setTitle("What AI training topics would you like Arena to sponsor?");
  
  // Link form to active sheet
  form.setDestination(FormApp.DestinationType.SPREADSHEET, SpreadsheetApp.getActiveSpreadsheet().getId());
  
  Logger.log("FORM CREATED SUCCESSFULLY!");
  Logger.log("Form URL: " + form.getPublishedUrl());
  Logger.log("Edit URL: " + form.getEditUrl());
}
