import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// RPC da Polygon
const RPC_URL = "https://polygon-rpc.com";
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Carteira do GuardianChain (paga o gas)
const wallet = new ethers.Wallet(
  process.env.GUARDIANCHAIN_PRIVATE_KEY,
  provider
);

// Contrato GuardianChain
const CONTRACT_ADDRESS = "0xef89BC5D33D6E65C47131a0331CcAF7e780Dc985";

const ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "author", type: "address" },
      { indexed: true, internalType: "bytes32", name: "proofHash", type: "bytes32" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" }
    ],
    name: "ProofRegistered",
    type: "event"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "proofHash", type: "bytes32" }
    ],
    name: "registerProof",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

// Endpoint pago (Stripe / Pix)
app.post("/register-paid", async (req, res) => {
  try {
    const { hash } = req.body;

    if (!hash || !hash.startsWith("0x") || hash.length !== 66) {
      return res.status(400).json({ error: "Hash inválido" });
    }

    const tx = await contract.registerProof(hash);
    await tx.wait();

    res.json({
      success: true,
      txHash: tx.hash
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Falha ao registrar" });
  }
});

// Subir servidor
app.listen(3001, () => {
  console.log("GuardianChain backend rodando na porta 3001");
});
