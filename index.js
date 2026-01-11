import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

/* =========================
   STRIPE CONFIG
========================= */

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY não definida");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* =========================
   ROUTES
========================= */

// Health check
app.get("/", (req, res) => {
  res.send("GuardianChain backend online");
});

// Checkout Stripe — USD 3.00
app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: 300,
            product_data: {
              name: "Digital Proof Registration (GuardianChain)"
            }
          },
          quantity: 1
        }
      ],
      // ✅ URLS CANÔNICAS E VÁLIDAS
      success_url: "https://guardianchain-frontend.vercel.app/success",
      cancel_url: "https://guardianchain-frontend.vercel.app/"
    });

    res.json({ url: session.url });

  } catch (err) {
    console.error("❌ STRIPE ERROR:", err);
    res.status(500).json({
      error: "Stripe error",
      message: err.message
    });
  }
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`GuardianChain backend rodando na porta ${PORT}`);
});
