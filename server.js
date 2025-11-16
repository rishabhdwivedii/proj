const express = require("express");
const cors = require("cors");
const path = require("path");

const adminRoutes = require("./routes/adminRoutes");
const testRoutes = require("./routes/testRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// ROUTES
app.use("/admin", adminRoutes);
app.use("/test", testRoutes);

app.get("/", (_, res) => {
  res.send("Server running!");
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
