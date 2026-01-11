import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=3bff027f-e77f-44dd-a920-8c2f20514399";
const MAIN_SITE_URL = "https://shenlongdapp-git-main-shenlongs-projects-b9e831a3.vercel.app";

// FOMO Configuration
const SHEN_LAUNCH_PRICE = 0.01; // $0.01
const SOL_PRICE_ESTIMATE = 210; // Fixed for speed

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
  res.setHeader('X-Blockchain-Ids', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
  res.setHeader('X-Action-Version', '1');

  if (req.method === 'OPTIONS') return res.status(200).end();
  const BLINK_HOST = `https://${req.headers.host}`; 

  // --- GET: THE AI RADAR ---
  if (req.method === 'GET') {
    return res.json({
      // GIF: Radar/Network Scan
      icon: "https://i.pinimg.com/originals/a4/09/25/a409257bb5776a39d8923a1df82df23f.gif", 
      title: "Shenlong AI: Deep Wallet Scan",
      description: "Analyze your wallet for hidden Rent and map your network connections. See how much capital you are wasting.",
      label: "Start AI Scan",
      links: {
        actions: [
          {
            label: "🕵️ Run Deep Scan",
            href: `${BLINK_HOST}/api/scan?address={address}`,
            parameters: [{ name: "address", label: "Paste your Wallet Address...", required: true }]
          }
        ]
      }
    });
  }

  // --- POST: THE RESULT (REAL RENT + AI NARRATIVE) ---
  if (req.method === 'POST') {
    try {
      const targetAddress = req.query.address as string; 
      const body = req.body || {};
      const signerAccount = body.account; 

      if (!signerAccount) return res.status(400).json({ error: "Wallet required" });

      const connection = new Connection(RPC_URL, 'confirmed');
      const signerPubkey = new PublicKey(signerAccount);

      // --- 1. REAL RENT SCAN ---
      let resultTitle = "";
      let resultDesc = "";
      let gifUrl = ""; 
      let hasJunk = false;

      try {
        const targetPubkey = new PublicKey(targetAddress);
        // Fetch Token Accounts
        const accounts = await connection.getParsedTokenAccountsByOwner(targetPubkey, {
          programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        });

        let totalRent = 0;
        let junkCount = 0;
        
        // Analyze for Junk (Balance 0, has Rent)
        for (const acc of accounts.value) {
          const bal = acc.account.data.parsed.info.tokenAmount.uiAmount;
          const lamports = acc.account.lamports;
          if (bal === 0 && lamports > 0) {
            totalRent += lamports;
            junkCount++;
          }
        }
        const rentSol = totalRent / LAMPORTS_PER_SOL;

        // --- 2. FOMO MATH ---
        const rentInUsd = rentSol * SOL_PRICE_ESTIMATE;
        const tokensAtLaunch = rentInUsd / SHEN_LAUNCH_PRICE;
        const valAt10x = rentInUsd * 10; 

        // --- 3. AI NARRATIVE GENERATION ---
        if (junkCount > 0) {
          hasJunk = true;
          // GIF: Network Alert / Red
          gifUrl = "https://i.pinimg.com/originals/e8/35/6d/e8356da35623091e0892095cc1b06877.gif";
          
          resultTitle = `🔴 ALERT: ${rentSol.toFixed(4)} SOL DETECTED`;
          
          resultDesc = `⚠️ CRITICAL REPORT:\n
          • 🗑️ Junk Accounts: **${junkCount}**
          • 💸 Dead Capital: **$${rentInUsd.toFixed(2)} USD**
          • 🕸️ Network Risk: **High (3 Connections)**\n
          🔥 FOMO SIMULATOR:
          Convert this into ~${tokensAtLaunch.toFixed(0)} $SHEN.
          Potential Value (10x): **$${valAt10x.toFixed(2)}**`;

        } else {
          // Clean Wallet
          gifUrl = "https://cdn.dribbble.com/users/1758660/screenshots/6255395/check.gif";
          resultTitle = "🟢 WALLET STATUS: OPTIMIZED";
          resultDesc = "No junk accounts found. Your efficiency score is 100%. However, our AI detected potential opportunities in your extended network. Connect to the App to view the full Bubble Map.";
        }

      } catch (e) {
        resultDesc = "Invalid Wallet Address. Please try again.";
        gifUrl = "https://media.tenor.com/images/a742721ea2075bc3956a2ff62c98ade3/tenor.gif"; 
      }

      // --- 4. VALIDATION TRANSACTION (0 SOL) ---
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({ fromPubkey: signerPubkey, toPubkey: signerPubkey, lamports: 0 })
      );
      transaction.feePayer = signerPubkey;
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      const payload = transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');

      return res.json({
        type: "transaction",
        transaction: payload,
        message: "Scan Complete",
        links: {
          next: {
            type: "inline",
            action: {
              icon: gifUrl, // Dynamic GIF (Red or Green)
              title: resultTitle,
              description: resultDesc,
              label: "Actions",
              links: {
                actions: [
                  {
                    label: "🚀 View Network Map (App)",
                    href: `${MAIN_SITE_URL}/dashboard?autoScan=${targetAddress}`,
                    type: "external"
                  },
                  {
                    label: "💰 Claim Rent Now",
                    href: `${MAIN_SITE_URL}/dashboard?autoScan=${targetAddress}`, // Direct to dashboard for action
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
      return res.status(500).json({ error: "System Error" });
    }
  }
}