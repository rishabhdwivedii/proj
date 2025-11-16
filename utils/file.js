const fs = require("fs");

module.exports = {
  readJSON(path) {
    if (!fs.existsSync(path)) return [];
    return JSON.parse(fs.readFileSync(path));
  },

  writeJSON(path, data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
  }
};
