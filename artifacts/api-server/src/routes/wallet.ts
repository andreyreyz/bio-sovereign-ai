import { Router } from "express";
import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, clusterApiUrl } from "@solana/web3.js";
import bs58 from "bs58";

const router = Router();
const rpc = new Connection(clusterApiUrl("devnet"), "confirmed");

function getKeypair(): Keypair | null {
  const raw = process.env.POOL_WALLET_PRIVATE_KEY;
  if (!raw) return null;
  try {
    const decoded = bs58.decode(raw);
    return Keypair.fromSecretKey(decoded);
  } catch {
    return null;
  }
}

router.get("/address", async (_req, res) => {
  const kp = getKeypair();
  if (!kp) return res.status(500).json({ error: "POOL_WALLET_PRIVATE_KEY not set" });
  res.json({ address: kp.publicKey.toBase58() });
});

router.get("/balance", async (_req, res) => {
  const kp = getKeypair();
  if (!kp) return res.status(500).json({ error: "POOL_WALLET_PRIVATE_KEY not set" });
  try {
    const lamports = await rpc.getBalance(kp.publicKey);
    const sol = lamports / LAMPORTS_PER_SOL;
    res.json({ address: kp.publicKey.toBase58(), sol, lamports });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/balance/:address", async (req, res) => {
  try {
    const pubkey = new PublicKey(req.params.address);
    const lamports = await rpc.getBalance(pubkey);
    res.json({ address: pubkey.toBase58(), sol: lamports / LAMPORTS_PER_SOL, lamports });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
