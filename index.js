app.post("/create-checkout-session", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"], // 🔒 SOMENTE CARTÃO
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: "Registro GuardianChain",
            },
            unit_amount: 2900,
          },
          quantity: 1,
        },
      ],
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("❌ STRIPE ERROR REAL:", error);
    res.status(500).json({
      message: "Stripe error",
      raw: error.message,
    });
  }
});
