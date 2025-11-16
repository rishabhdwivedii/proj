const xlsx = require("xlsx");
const fs = require("fs");

module.exports = {
  // Read Excel as JSON
  readExcel(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets["Results"] || workbook.Sheets[workbook.SheetNames[0]];
    return xlsx.utils.sheet_to_json(sheet);
  },

  // Overwrite Excel
  writeExcel(filePath, data) {
    const workbook = xlsx.utils.book_new();
    const sheet = xlsx.utils.json_to_sheet(data);
    xlsx.utils.book_append_sheet(workbook, sheet, "Results");
    xlsx.writeFile(workbook, filePath);
  },

  // Append a result row to Excel
  appendResult(filePath, row) {
    let workbook, sheet, sheetData;

    if (fs.existsSync(filePath)) {
      // Load existing
      workbook = xlsx.readFile(filePath);
      sheet = workbook.Sheets["Results"];
      sheetData = sheet ? xlsx.utils.sheet_to_json(sheet) : [];
    } else {
      // Create new file
      workbook = xlsx.utils.book_new();
      sheetData = [];
    }

    // Add the new row
    sheetData.push(row);

    // Convert back to sheet
    const newSheet = xlsx.utils.json_to_sheet(sheetData);
    workbook.Sheets["Results"] = newSheet;
    workbook.SheetNames = ["Results"];

    // Save file
    xlsx.writeFile(workbook, filePath);
  }
};
