import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { ethers } from "ethers";
import guardianChainAbi from "./guardianChainAbi.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

/* =========================
   STRIPE CONFIG
========================= */

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não definida");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* =========================
   BLOCKCHAIN CONFIG
========================= */

if (!process.env.GUARDIANCHAIN_PRIVATE_KEY) {
  throw new Error("GUARDIANCHAIN_PRIVATE_KEY não definida");
}

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

/* =========================
   ROUTES
========================= */

// Health check
app.get("/", (req, res) => {
  res.send("GuardianChain backend online");
});

// 💳 STRIPE CHECKOUT (ISOLADO E ESTÁVEL)
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"], // PIX será ativado depois
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: "Registro GuardianChain"
            },
            unit_amount: 2900
          },
          quantity: 1
        }
      ],
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel"
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("STRIPE ERROR:", error);
    res.status(500).json({
      error: "Stripe error",
      message: error.message
    });
  }
});

// 🔗 REGISTRO ON-CHAIN (MANUAL / FUTURO AUTOMÁTICO)
app.post("/register", async (req, res) => {
  try {
    const { proofHash } = req.body;

    if (!proofHash) {
      return res.status(400).json({ error: "proofHash ausente" });
    }

    const tx = await contract.registerProof("0x" + proofHash);
    await tx.wait();

    res.json({
      success: true,
      txHash: tx.hash
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao registrar na blockchain" });
  }
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`GuardianChain backend rodando na porta ${PORT}`);
});
