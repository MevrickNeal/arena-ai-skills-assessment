/**
 * ARENA AI SKILLS ASSESSMENT — 100% CLEAN GOOGLE APPS SCRIPT BACKEND
 * Author: Lian Mollick (Project Coordinator Jr.)
 * 
 * 30-SECOND SETUP IN GOOGLE SHEETS:
 * 1. Open your Google Sheet and click Extensions -> Apps Script
 * 2. In Code.gs, press Ctrl+A (Select All) and DELETE everything
 * 3. Paste this EXACT code below
 * 4. Click Save (Floppy disk icon or Ctrl+S)
 * 5. Click "Deploy" -> "Manage deployments" -> Click the Pencil (Edit) icon
 * 6. Under Version, choose "New version" -> Click "Deploy"
 * 7. Done! Now Google Sheets will record every developer submission in real-time.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Live Submissions");
    if (!sheet) {
      sheet = ss.insertSheet("Live Submissions");
      var headers = [
        "Timestamp", "Developer Name", "Employee ID", "Department", "Designation",
        "Assigned Project", "Role", "Overall Score", "AI Knowledge", "Tech Skills",
        "AI Potential", "Languages", "AI Tools", "AI Projects Done", "Project Details",
        "Requested Training", "Notes", "Full JSON Record"
      ];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f172a").setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
    
    var payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
    }
    
    var row = [
      new Date().toLocaleString(),
      payload.name || '',
      payload.empId || '',
      payload.department || '',
      payload.title || '',
      payload.project || '',
      payload.role || '',
      payload.overallScore || '',
      payload.avgKnowledge || '',
      payload.avgSkills || '',
      payload.aiPotential || '',
      (payload.languages || []).join(', '),
      (payload.aiTools || []).join(', '),
      payload.aiProjects || '',
      payload.aiProjectDesc || '',
      payload.wantedTraining || '',
      payload.noteImpression || '',
      JSON.stringify(payload)
    ];
    
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Saved" })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Live Submissions") || ss.getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    var data = [];
    for (var i = 1; i < rows.length; i++) {
      var jsonCol = rows[i][rows[i].length - 1];
      if (jsonCol) {
        try { data.push(JSON.parse(jsonCol)); } catch(err) {}
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "success", count: data.length, data: data })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
