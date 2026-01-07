import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { ethers } from "ethers";
import Stripe from "stripe";
import bodyParser from "body-parser";
import guardianChainAbi from "./guardianChainAbi.js";

dotenv.config();

const app = express();

/* -----------------------------
   CONFIGURAÇÕES
----------------------------- */

const PORT = process.env.PORT || 3001;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const PRIVATE_KEY = process.env.GUARDIANCHAIN_PRIVATE_KEY;

const CONTRACT_ADDRESS = "0xef89BC5D33D6E65C47131a0331CcAF7e780Dc985";
const RPC_URL = "https://polygon-rpc.com";

/* -----------------------------
   STRIPE
----------------------------- */

const stripe = new Stripe(STRIPE_SECRET_KEY);

/* -----------------------------
   BLOCKCHAIN
----------------------------- */

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  CONTRACT_ADDRESS,
  guardianChainAbi,
  wallet
);

/* -----------------------------
   MIDDLEWARE
----------------------------- */

// IMPORTANTE: webhook usa RAW body
app.post(
  "/stripe-webhook",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    let event;

    try {
      const sig = req.headers["stripe-signature"];
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("❌ Webhook inválido:", err.message);
      return res.status(400).send(`Webhook Error`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const hash = session.metadata?.hash;

      if (!hash) {
        console.error("❌ Hash não encontrado no metadata");
        return res.status(400).json({ error: "Hash ausente" });
      }

      try {
        console.log("✅ Pagamento confirmado. Registrando hash...");
        const tx = await contract.registerProof("0x" + hash);
        await tx.wait();

        console.log("🔗 Registrado na blockchain:", tx.hash);
      } catch (err) {
        console.error("❌ Erro ao registrar na blockchain:", err);
      }
    }

    res.json({ received: true });
  }
);

/* -----------------------------
   ROTAS NORMAIS
----------------------------- */

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("GuardianChain backend online");
});

app.listen(PORT, () => {
  console.log(`GuardianChain backend rodando na porta ${PORT}`);
});
