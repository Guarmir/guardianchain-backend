import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ethers } from "ethers";
import guardianChainAbi from "./guardianChainAbi.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* -----------------------------
   BLOCKCHAIN CONFIG
----------------------------- */

const CONTRACT_ADDRESS = "0xef89BC5D33D6E65C47131a0331CcAF7e780Dc985";
const RPC_URL = "https://polygon-rpc.com";

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(
  process.env.GUARDIANCHAIN_PRIVATE_KEY,
  provider
);

const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  guardianChainAbi,
  wallet
);

/* -----------------------------
   ROUTES
----------------------------- */

// Health check
app.get("/", (req, res) => {
  res.send("GuardianChain backend online");
});

// REGISTER PROOF (🔥 ESSENCIAL 🔥)
app.post("/register", async (req, res) => {
  try {
    const { proofHash } = req.body;

    if (!proofHash) {
      return res.status(400).json({ error: "proofHash ausente" });
    }

    console.log("📥 Registrando hash:", proofHash);

    const tx = await contract.registerProof("0x" + proofHash);
    await tx.wait();

    console.log("✅ Registro confirmado:", tx.hash);

    res.json({
      success: true,
      txHash: tx.hash,
    });
  } catch (err) {
    console.error("❌ Erro ao registrar:", err);
    res.status(500).json({ error: "Erro ao registrar na blockchain" });
  }
});

/* -----------------------------
   START SERVER
----------------------------- */

app.listen(PORT, () => {
  console.log(`GuardianChain backend rodando na porta ${PORT}`);
});
