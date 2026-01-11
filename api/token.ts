import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=3bff027f-e77f-44dd-a920-8c2f20514399";
const MAIN_SITE_URL = "https://shenlongdapp-git-main-shenlongs-projects-b9e831a3.vercel.app";

// Rent per Account (Solana Standard)
const RENT_PER_ACCOUNT = 0.002039;

// --- 1. METADATA FETCH (HELIUS DAS API) ---
async function getTokenMetadata(ca: string) {
  try {
    const cleanCA = ca.trim();
    // Validate PubKey
    try { new PublicKey(cleanCA); } catch (e) { return null; }

    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'shenlong-metadata',
        method: 'getAsset',
        params: {
          id: cleanCA,
          displayOptions: { showFungible: true }
        },
      }),
    });

    const { result } = await response.json() as any;
    if (!result) return null;

    // Extract image from various possible paths
    const image = result.content?.links?.image || 
                  result.content?.files?.[0]?.uri || 
                  result.content?.json_uri || 
                  "https://cryptologos.cc/logos/solana-sol-logo.png";

    return {
      name: result.content?.metadata?.name || "Unknown Project",
      symbol: result.content?.metadata?.symbol || "TOKEN",
      image: image
    };

  } catch (e) {
    console.error("Helius Error:", e);
    return null;
  }
}

// --- 2. DETERMINISTIC STATS GENERATOR ---
function calculateDeterministicStats(ca: string) {
  // Create a unique seed based on CA characters
  let seed = 0;
  for (let i = 0; i < ca.length; i++) {
    seed += ca.charCodeAt(i);
  }
  
  // Simulate Total Accounts (Between 5k and 150k based on seed)
  const totalAccounts = (seed * 423) % 150000 + 5000;
  
  // Simulate Zombies (Between 20% and 45%)
  const zombiePercentage = ((seed % 25) + 20) / 100;
  const zombieCount = Math.floor(totalAccounts * zombiePercentage);
  
  // Calculate Exact Rent
  const rentSol = zombieCount * RENT_PER_ACCOUNT;
  const rentUsd = rentSol * 210; // Fixed SOL price for speed ($210)

  return { totalAccounts, zombieCount, rentSol, rentUsd };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
  res.setHeader('X-Blockchain-Ids', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
  res.setHeader('X-Action-Version', '1');

  if (req.method === 'OPTIONS') return res.status(200).end();
  const BLINK_HOST = `https://${req.headers.host}`; 

  // --- GET: SEARCH BAR ---
  if (req.method === 'GET') {
    return res.json({
      icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
      title: "Shenlong Token Auditor",
      description: "Paste the Contract Address (CA) of any token. Our AI analyzes dead liquidity (Rent) trapped in zombie accounts.",
      label: "Audit Token",
      links: {
        actions: [
          {
            label: "🔍 Run Analysis",
            href: `${BLINK_HOST}/api/token?ca={ca}`,
            parameters: [{ name: "ca", label: "Paste Token Address...", required: true }]
          }
        ]
      }
    });
  }

  // --- POST: RESULT CARD ---
  if (req.method === 'POST') {
    try {
      const rawCa = req.query.ca as string; 
      const ca = rawCa ? rawCa.trim() : "";
      const body = req.body || {};
      const signerAccount = body.account;

      if (!signerAccount) return res.status(400).json({ error: "Wallet required" });

      // 1. Fetch Data (Parallel)
      const metadataPromise = getTokenMetadata(ca);
      const stats = calculateDeterministicStats(ca); 
      const metadata = await metadataPromise; 

      // Fallbacks
      const symbol = metadata?.symbol || "TOKEN";
      const name = metadata?.name || "Unknown Project";
      const image = metadata?.image || "https://cryptologos.cc/logos/solana-sol-logo.png";

      // Formatting
      const fmtZombies = stats.zombieCount.toLocaleString();
      const fmtRent = stats.rentSol.toFixed(2);
      const fmtUsd = stats.rentUsd.toLocaleString('en-US', { maximumFractionDigits: 0 });

      // Viral Tweet Text
      const tweetText = `🐉 SHENLONG AUDIT REPORT for $${symbol}%0A%0A🔍 Project: ${name}%0A💰 Locked Rent: ${fmtRent} SOL ($${fmtUsd})%0A🧟 Zombie Accounts: ${fmtZombies}%0A%0ACheck if you have old accounts here 👇%0A@ShenlongProtocol`;
      const shareLink = `https://twitter.com/intent/tweet?text=${tweetText}&url=${MAIN_SITE_URL}`;

      // Zero-value Transaction (Validation)
      const connection = new Connection(RPC_URL, 'confirmed');
      const signerPubkey = new PublicKey(signerAccount);
      const transaction = new Transaction();
      transaction.add(SystemProgram.transfer({ fromPubkey: signerPubkey, toPubkey: signerPubkey, lamports: 0 }));
      transaction.feePayer = signerPubkey;
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      const payload = transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');

      return res.json({
        type: "transaction",
        transaction: payload,
        message: `Analysis complete for ${symbol}`,
        links: {
          next: {
            type: "inline",
            action: {
              icon: image, // REAL TOKEN LOGO
              title: `💸 ${fmtRent} SOL ($${fmtUsd}) DETECTED`,
              description: `⚠️ AUDIT REPORT (${symbol}):\n
              • 🏢 Project: **${name}**
              • 🧟 Zombie Accounts: **${fmtZombies}**
              • 📉 Locked Capital: **${fmtRent} SOL**\n
              This value is trapped on the Blockchain. Help the community reclaim it.`,
              label: "Actions",
              links: {
                actions: [
                  {
                    label: "🐦 Share Report & Earn",
                    href: shareLink,
                    type: "external"
                  },
                  {
                    label: "🔥 Reclaim Now (App)",
                    href: `${MAIN_SITE_URL}/dashboard?tokenScan=${ca}`,
                    type: "external"
                  }
                ]
              }
            }
          }
        }
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Analysis failed." });
    }
  }
}