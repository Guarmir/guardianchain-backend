import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { ethers } from "ethers";
import guardianChainAbi from "./guardianChainAbi.js";

dotenv.config();

const app = express();
app.use(cors());

// ⚠️ IMPORTANTE: raw body só no webhook
app.use(
  "/webhook",
  express.raw({ type: "application/json" })
);
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* ===== BLOCKCHAIN ===== */

const provider = new ethers.JsonRpcProvider("https://polygon-rpc.com");
const wallet = new ethers.Wallet(
  process.env.GUARDIANCHAIN_PRIVATE_KEY,
  provider
);

const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  guardianChainAbi,
  wallet
);

/* ===== ROUTES ===== */

// Criar checkout com metadata
app.post("/create-checkout-session", async (req, res) => {
  const { proofHash } = req.body;

  if (!proofHash) {
    return res.status(400).json({ error: "proofHash ausente" });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    metadata: {
      proofHash
    },
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: 300,
          product_data: {
            name: "Digital Proof Registration"
          }
        },
        quantity: 1
      }
    ],
    success_url: "https://guardianchain-frontend.vercel.app/success",
    cancel_url: "https://guardianchain-frontend.vercel.app/"
  });

  res.json({ url: session.url });
});

// Webhook Stripe
app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature error", err.message);
    return res.status(400).send("Webhook Error");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const hash = session.metadata.proofHash;

    console.log("🔗 Hash recebido:", hash);

    const tx = await contract.registerProof("0x" + hash);
    await tx.wait();

    console.log("✅ Registrado on-chain:", tx.hash);
  }

  res.json({ received: true });
});

app.listen(10000, () => {
  console.log("GuardianChain backend online");
});
