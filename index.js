import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 10000;

/* ======================
   STRIPE (ISOLADO)
====================== */

if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY NÃO DEFINIDA");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/* ======================
   ROUTES
====================== */

app.get("/", (req, res) => {
  res.send("GuardianChain backend online");
});

app.post("/create-checkout-session", async (req, res) => {
  try {
    console.log("➡️ Criando sessão Stripe...");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
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
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel"
    });

    console.log("✅ Sessão criada:", session.id);

    res.json({ url: session.url });

  } catch (err) {
    console.error("❌ STRIPE ERROR REAL:");
    console.error(err);

    res.status(500).json({
      error: "Stripe error",
      message: err.message,
      type: err.type
    });
  }
});

/* ======================
   START
====================== */

app.listen(PORT, () => {
  console.log(`GuardianChain backend rodando na porta ${PORT}`);
});
