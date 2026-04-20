const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const cors = require("cors");
const fs = require("fs");
const { ethers } = require("ethers");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// ================= BLOCKCHAIN SETUP =================
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

const signer = new ethers.Wallet(
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  provider
);

const contractAddress = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";

const abi = [
  "function uploadFile(string memory _name, string memory _hash)",
  "function getFiles() view returns (tuple(string name, string hash, address uploader, uint timestamp)[])"
];

const contract = new ethers.Contract(
  contractAddress,   // ✅ correct
  abi,
  signer
);

// ================= LOCAL DB =================
let filesDB = [];

// ================= UPLOAD API =================
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    console.log("Incoming upload:", req.file);

    const filePath = req.file.path;

    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const fileData = {
      name: req.file.originalname,
      hash: hash,
      path: filePath,
      uploadedAt: new Date(),
    };

    // 🔥 STORE ON BLOCKCHAIN
    console.log("Sending to blockchain...");
    const tx = await contract.uploadFile(fileData.name, hash);
    console.log("TX:", tx.hash);

    await tx.wait();
    console.log("Stored on blockchain!");

    // Save locally
    filesDB.push(fileData);

    res.json({
      message: "File uploaded + stored on blockchain",
      file: fileData,
    });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ================= GET LOCAL FILES =================
app.get("/files", (req, res) => {
  res.json(filesDB);
});

// ================= GET BLOCKCHAIN FILES =================
app.get("/blockchain-files", async (req, res) => {
  try {
    const files = await contract.getFiles();

    // 🔥 Convert BigInt safely
    const formatted = files.map(file => ({
      name: file.name,
      hash: file.hash,
      uploader: file.uploader,
      timestamp: file.timestamp.toString() // ✅ FIX
    }));

    res.json(formatted);

  } catch (err) {
    console.error("BLOCKCHAIN ERROR:", err);
    res.status(500).send("Error fetching blockchain data");
  }
});

// ================= STATIC =================
app.use("/uploads", express.static("uploads"));

// ================= START SERVER =================
app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});


