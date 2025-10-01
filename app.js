// const express=require("express");
// const app=express();
// const mongoose=require("mongoose");

// main().then(()=>{
//     console.log("connected to db");
// }).catch((err)=>{
//     console.log("error detected");
// });
// async function main() {
//     await mongoose.connect("mongodb://127.0.0.1:27017/stock")
// }

// app.get("/",(req,res)=>{
//     res.send("hii i am stock");
// });

//  app.listen(5000,()=>{
//     console.log("app is listning on port 5000");
//  });

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");

const multer = require("multer");

const storage = multer.memoryStorage();

const fs = require("fs");
const csv = require("csv-parser");
const session = require("express-session"); 
const upload = multer({ dest: "uploads/" });


const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));



app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: "mySecretKey",   
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // set true only if using https
  })
);

//  Schema & Model
const stockSchema = new mongoose.Schema({
    SerialNo: { type: Number, required: true },
  PONo: { type: String },
  PODate: { type: String },  
  Description: { type: String},
  Qty: { type: Number, required: true, min: 0 },
  Cost: { type: Number, required: true, min: 0 },
  BillNo: { type: String },
  Supplier: { type: String },
  ReceiptDate: { type: String },  
  DeptLab: { type: String },
  Dept: { type: String },
  FoundOK: { type: String },
  Shortage: { type: Number },
  Excess: { type: Number },
  Location: { type: String },
  Remarks: { type: String }
});
const Stock = mongoose.model("Stock", stockSchema);
// user schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model("User", userSchema);

//  Connect to DB

async function main() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/stock";
  await mongoose.connect(uri);   
}


main()
  .then(() => console.log("Connected to DB"))
  .catch((err) => console.error(" DB Error:", err));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/register.html"));
});
  

// signup User
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = new User({ username, password });
    await user.save();
     
     res.redirect("/index.html");
    
    
  } catch (err) {
    res.status(400).send({ error: err.message });
  }
});



// login route
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      // Send popup alert and redirect back to login page
      return res.send(`
        <script>
          alert("User not found");
          window.location.href = "/login.html";
        </script>
      `);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.send(`
        <script>
          alert("Invalid credentials");
          window.location.href = "/login.html";
        </script>
      `);
    }

    //  store session
    req.session.user = { id: user._id, username: user.username };

    res.redirect("/index.html");
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).send("Server error");
  }
});




// Logout User
app.post("/logout", (req, res) => {
  req.session.destroy();
  
    res.redirect("/register.html");
  res.send({ message: " Logged out" });
});

// Middleware to protect routes
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.status(401).send({ error: " Unauthorized" });
}


//  API Routes
app.post("/add", async (req, res) => {
  try {
    const stock = new Stock(req.body);
    await stock.save();
    res.status(201).send(stock);
  } catch (err) {
    res.status(400).send(err);
  }
});
// Get all stock items
app.get("/stocks", async (req, res) => {
  try {
    const stocks = await Stock.find();
    res.json(stocks);
  } catch (err) {
    res.status(500).json({ error: "Error fetching stocks" });
  }
});

// Delete stock item
app.delete("/stocks/:id", async (req, res) => {
  try {
    await Stock.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Stock deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Error deleting stock" });
  }
});
// Get single stock by ID
app.get("/stocks/:id", async (req, res) => {
  try {
    const stock = await Stock.findById(req.params.id);
    if (!stock) return res.status(404).send("Stock not found");
    res.json(stock);
  } catch (err) {
    res.status(500).send("Error fetching stock");
  }
});

// Update stock
app.put("/stocks/:id", async (req, res) => {
  try {
    const stock = await Stock.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(stock);
  } catch (err) {
    res.status(500).send("Error updating stock");
  }
});

app.post("/upload-csv", upload.single("csvFile"), (req, res) => {
  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        // map CSV keys -> Schema keys
        const mapped = results.map(r => ({
          SerialNo: r["SerialNo"],
          PONo: r["PO No"],
          PODate: r["PO Date"],
          Description: r["Description"],
          Qty: r["Qty"],
          Cost: r["Cost"],
          BillNo: r["Bill No"],
          Supplier: r["Supplier"],
          ReceiptDate: r["Receipt Date"],
          DeptLab: r["Dept/Lab"],
          Dept: r["Dept"],
          FoundOK: r["Items OK"],
          Shortage: r["Shortage"],
          Excess: r["Excess"],
          Location: r["Location"],
          Remarks: r["Remarks"]
        }));

        await Stock.insertMany(mapped);
        fs.unlinkSync(req.file.path);

        res.json({ success: true, message: "CSV uploaded successfully!" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error saving CSV data" });
      }
    });

});

// Start Server
app.listen(5000, () => {
  console.log(" App is listening on port 5000");
});







// require("dotenv").config();
// const express = require("express");
// const mongoose = require("mongoose");
// const bodyParser = require("body-parser");
// const path = require("path");
// const bcrypt = require("bcrypt");
// const session = require("express-session");   // ✅ added session
// const multer = require("multer");
// const csv = require("csv-parser");
// const { Readable } = require("stream");

// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// const app = express();

// // Middleware
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static("public"));

// // ✅ Session middleware (important for login/logout)
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET || "mySecretKey",
//     resave: false,
//     saveUninitialized: false,
//   })
// );

// // Schema & Model
// const stockSchema = new mongoose.Schema({
//   SerialNo: { type: Number, required: true },
//   PONo: { type: String },
//   PODate: { type: String },
//   Description: { type: String },
//   Qty: { type: Number, required: true, min: 0 },
//   Cost: { type: Number, required: true, min: 0 },
//   BillNo: { type: String },
//   Supplier: { type: String },
//   ReceiptDate: { type: String },
//   DeptLab: { type: String },
//   Dept: { type: String },
//   FoundOK: { type: String },
//   Shortage: { type: Number },
//   Excess: { type: Number },
//   Location: { type: String },
//   Remarks: { type: String },
// });
// const Stock = mongoose.model("Stock", stockSchema);

// // user schema
// const userSchema = new mongoose.Schema({
//   username: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
// });

// // Hash password before saving
// userSchema.pre("save", async function (next) {
//   if (this.isModified("password")) {
//     this.password = await bcrypt.hash(this.password, 10);
//   }
//   next();
// });

// const User = mongoose.model("User", userSchema);

// // ✅ Connect to MongoDB (Atlas in production, local in dev)
// async function main() {
//   const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/stock";
//   // await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
//   async function main() {
//   await mongoose.connect(process.env.MONGODB_URI);
// }
// }
// main()
//   .then(() => console.log(" Connected to DB"))
//   .catch((err) => console.error(" DB Error:", err));
  

// // ---------------- AUTH ROUTES ----------------
// app.post("/register", async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     const user = new User({ username, password });
//     await user.save();
//     res.status(201).send({ message: "User registered" });
//   } catch (err) {
//     res.status(400).send({ error: err.message });
//   }
// });

// app.post("/login", async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     const user = await User.findOne({ username });
//     if (!user) return res.status(400).send({ error: "User not found" });

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(400).send({ error: "Invalid credentials" });

//     req.session.user = { id: user._id, username: user.username };
//     res.redirect("/index.html");
//   } catch (err) {
//     console.error("Login Error:", err);
//     res.status(500).send("Server error");
//   }
// });

// app.post("/logout", (req, res) => {
//   req.session.destroy(() => {
//     res.send({ message: "Logged out" });
//   });
// });

// // Middleware to protect routes
// function isAuthenticated(req, res, next) {
//   if (req.session.user) return next();
//   res.status(401).send({ error: "Unauthorized" });
// }

// // ---------------- STOCK ROUTES ----------------
// app.post("/add", isAuthenticated, async (req, res) => {
//   try {
//     const stock = new Stock(req.body);
//     await stock.save();
//     res.status(201).send(stock);
//   } catch (err) {
//     res.status(400).send(err);
//   }
// });

// app.get("/stocks", isAuthenticated, async (req, res) => {
//   try {
//     const stocks = await Stock.find();
//     res.json(stocks);
//   } catch (err) {
//     res.status(500).json({ error: "Error fetching stocks" });
//   }
// });

// app.delete("/stocks/:id", isAuthenticated, async (req, res) => {
//   try {
//     await Stock.findByIdAndDelete(req.params.id);
//     res.json({ success: true, message: "Stock deleted successfully" });
//   } catch (err) {
//     res.status(500).json({ error: "Error deleting stock" });
//   }
// });

// app.get("/stocks/:id", isAuthenticated, async (req, res) => {
//   try {
//     const stock = await Stock.findById(req.params.id);
//     if (!stock) return res.status(404).send("Stock not found");
//     res.json(stock);
//   } catch (err) {
//     res.status(500).send("Error fetching stock");
//   }
// });

// app.put("/stocks/:id", isAuthenticated, async (req, res) => {
//   try {
//     const stock = await Stock.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//     });
//     res.json(stock);
//   } catch (err) {
//     res.status(500).send("Error updating stock");
//   }
// });

// // ✅ Upload CSV
// app.post("/upload-csv", isAuthenticated, upload.single("csvFile"), (req, res) => {
//   if (!req.file) return res.status(400).json({ error: "No file uploaded" });

//   const results = [];
//   const stream = Readable.from(req.file.buffer.toString());

//   stream
//     .pipe(csv())
//     .on("data", (data) => results.push(data))
//     .on("end", async () => {
//       try {
//         const mapped = results.map((r) => ({
//           SerialNo: r["SerialNo"],
//           PONo: r["PO No"],
//           PODate: r["PO Date"],
//           Description: r["Description"],
//           Qty: r["Qty"],
//           Cost: r["Cost"],
//           BillNo: r["Bill No"],
//           Supplier: r["Supplier"],
//           ReceiptDate: r["Receipt Date"],
//           DeptLab: r["Dept/Lab"],
//           Dept: r["Dept"],
//           FoundOK: r["Items OK"],
//           Shortage: r["Shortage"],
//           Excess: r["Excess"],
//           Location: r["Location"],
//           Remarks: r["Remarks"],
//         }));

//         await Stock.insertMany(mapped);
//         res.json({ success: true, message: "CSV uploaded successfully!" });
//       } catch (err) {
//         console.error(err);
//         res.status(500).json({ error: "Error saving CSV data" });
//       }
//     });
// });

// // ---------------- START SERVER ----------------
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });
