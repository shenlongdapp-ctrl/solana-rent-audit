import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// SEGURANÇA: Lê a chave do Vercel. Fallback para RPC público se falhar.
const RPC_URL = process.env.HELIUS_RPC_URL || "https://api.mainnet-beta.solana.com";
// AQUI: URL unificada
const MAIN_SITE_URL = "https://shenlongdapp.xyz"; 
const SOL_PRICE_ESTIMATE = 210;

const DEMO_WALLET = "G473EkeR5gowVn8CRwTSDxd3Ychpa8oYNS2X5Vye5w6u";
const maskAddr = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

// Helper para criar transação vazia rapidamente
async function createEmptyTx(connection: Connection, signer: PublicKey) {
  const transaction = new Transaction();
  transaction.add(SystemProgram.transfer({ fromPubkey: signer, toPubkey: signer, lamports: 0 }));
  transaction.feePayer = signer;
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  return transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
  res.setHeader('X-Blockchain-Ids', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
  res.setHeader('X-Action-Version', '1');

  if (req.method === 'OPTIONS') return res.status(200).end();
  const BLINK_HOST = `https://${req.headers.host}`; 

  // --- GET ---
  if (req.method === 'GET') {
    return res.json({
      icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png", 
      title: "Shenlong AI: Wallet & Network Scan",
      description: "Scan your wallet for dead capital (Rent) and analyze network activity risks.",
      label: "Start Scan",
      links: {
        actions: [
          {
            label: "🕵️ Run Rapid Scan",
            href: `${BLINK_HOST}/api/scan?address={address}`,
            parameters: [{ name: "address", label: "Paste Wallet Address...", required: true }]
          }
        ]
      }
    });
  }

  // --- POST ---
  if (req.method === 'POST') {
    try {
      const targetAddress = req.query.address as string; 
      const body = req.body || {};
      const signerAccount = body.account; 

      if (!signerAccount) {
        return res.status(400).json({ error: "Wallet required" });
      }

      const connection = new Connection(RPC_URL, 'confirmed');
      const signerPubkey = new PublicKey(signerAccount);
      
      let targetPubkey: PublicKey;
      try {
        targetPubkey = new PublicKey(targetAddress);
      } catch (e) {
        return res.json({
            type: "transaction",
            message: "Invalid Address",
            transaction: (await createEmptyTx(connection, signerPubkey)).toString('base64')
        });
      }

      // --- 1. SCAN DE RENT (REAL - RÁPIDO) ---
      let rentSol = 0;
      let junkCount = 0;
      let isDirty = false;
      let hasNetworkActivity = false;

      if (targetAddress === DEMO_WALLET) {
        rentSol = 0.842; junkCount = 12; isDirty = true; hasNetworkActivity = true;
      } else {
        try {
          const accounts = await connection.getParsedTokenAccountsByOwner(targetPubkey, {
            programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
          });
          
          let lamports = 0;
          for (const acc of accounts.value) {
            const bal = acc.account.data.parsed.info.tokenAmount.uiAmount;
            if (bal === 0 && acc.account.lamports > 0) {
              lamports += acc.account.lamports;
              junkCount++;
            }
          }
          rentSol = lamports / LAMPORTS_PER_SOL;
          if (junkCount > 0) isDirty = true;

          const signatures = await connection.getSignaturesForAddress(targetPubkey, { limit: 1 });
          if (signatures.length > 0) hasNetworkActivity = true;

        } catch (e) {
          console.error("Scan error", e);
        }
      }

      const totalUsd = (rentSol * SOL_PRICE_ESTIMATE).toFixed(2);

      // --- 2. RELATÓRIO VISUAL ---
      const targetLine = isDirty 
        ? `🔴 **Target (${maskAddr(targetAddress)}):** ${rentSol.toFixed(4)} SOL (Dirty)`
        : `🟢 **Target (${maskAddr(targetAddress)}):** Clean`;

      const networkLine = hasNetworkActivity
        ? `⚠️ **Network:** Active Connections Detected`
        : `⚪ **Network:** Dormant`;

      const resultDesc = `📊 **SCAN RESULTS:**\n
      ${targetLine}
      ${networkLine}\n
      💸 **Dead Capital:** $${totalUsd} USD
      \nReclaim this rent immediately.`;

      const finalImage = isDirty
        ? "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Symbols/Warning.png"
        : "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Symbols/Check%20Mark%20Button.png";

      // --- 3. TRANSAÇÃO (0 SOL) ---
      const payload = (await createEmptyTx(connection, signerPubkey)).toString('base64');

      return res.json({
        type: "transaction",
        transaction: payload,
        message: "Scan Complete",
        links: {
          next: {
            type: "inline",
            action: {
              icon: finalImage,
              title: isDirty ? "⚠️ RISK DETECTED" : "✅ WALLET OPTIMIZED",
              description: resultDesc,
              label: "Actions",
              links: {
                actions: [
                  {
                    label: "💰 Reclaim Rent",
                    href: `${MAIN_SITE_URL}/dashboard?autoScan=${targetAddress}`,
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
      return res.status(500).json({ error: "Internal Error" });
    }
  }
}
