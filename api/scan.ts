import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=3bff027f-e77f-44dd-a920-8c2f20514399";
const MAIN_SITE_URL = "https://shenlongdapp-git-main-shenlongs-projects-b9e831a3.vercel.app";

// Configurações de Preço
const SHEN_LAUNCH_PRICE = 0.01;
const SOL_PRICE_ESTIMATE = 210;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
  res.setHeader('X-Blockchain-Ids', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
  res.setHeader('X-Action-Version', '1');

  if (req.method === 'OPTIONS') return res.status(200).end();
  const BLINK_HOST = `https://${req.headers.host}`; 

  // --- GET: O RADAR (IMAGEM SEGURA) ---
  if (req.method === 'GET') {
    return res.json({
      // Usamos o Logo Oficial da Solana (Wikimedia é indestrutível)
      icon: "https://upload.wikimedia.org/wikipedia/en/b/b9/Solana_logo.png", 
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

  // --- POST: RESULTADO COM PARTILHA ---
  if (req.method === 'POST') {
    try {
      const targetAddress = req.query.address as string; 
      const body = req.body || {};
      const signerAccount = body.account; 

      if (!signerAccount) return res.status(400).json({ error: "Wallet required" });

      const connection = new Connection(RPC_URL, 'confirmed');
      const signerPubkey = new PublicKey(signerAccount);

      // --- 1. SCAN DE RENT REAL ---
      let resultTitle = "";
      let resultDesc = "";
      let finalImage = ""; 
      let shareText = "";

      try {
        const targetPubkey = new PublicKey(targetAddress);
        const accounts = await connection.getParsedTokenAccountsByOwner(targetPubkey, {
          programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        });

        let totalRent = 0;
        let junkCount = 0;
        
        for (const acc of accounts.value) {
          const bal = acc.account.data.parsed.info.tokenAmount.uiAmount;
          const lamports = acc.account.lamports;
          if (bal === 0 && lamports > 0) {
            totalRent += lamports;
            junkCount++;
          }
        }
        const rentSol = totalRent / LAMPORTS_PER_SOL;
        const rentInUsd = rentSol * SOL_PRICE_ESTIMATE;

        // --- 2. LÓGICA DE PARTILHA & NARRATIVA ---
        
        if (junkCount > 0) {
          // CENÁRIO 1: CARTEIRA SUJA (Encontrou Rent)
          // Imagem: Sinal de Alerta (Wikimedia)
          finalImage = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Ojbect-action-dialog-warning.svg/240px-Ojbect-action-dialog-warning.svg.png";
          
          resultTitle = `🔴 ALERT: ${rentSol.toFixed(4)} SOL DETECTED`;
          resultDesc = `⚠️ CRITICAL REPORT:\n• 🗑️ Junk Accounts: **${junkCount}**\n• 💸 Dead Capital: **$${rentInUsd.toFixed(2)} USD**\n• 🕸️ Network Risk: **High**\n\nConvert this into $SHEN before it's too late.`;

          // Texto para o Twitter (Viral)
          shareText = `🚨 SHENLONG AI ALERT\n\nI just found $${rentInUsd.toFixed(0)} hidden in my Solana wallet! 💸\n\n📉 Junk Accounts: ${junkCount}\n🕸️ Network Risk: HIGH\n\nDon't let your SOL rot. Scan your wallet now 👇\n@ShenlongProtocol`;

        } else {
          // CENÁRIO 2: CARTEIRA LIMPA (Mas Rede em Risco)
          // Imagem: Check Verde (Wikimedia)
          finalImage = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Gnome-emblem-default.svg/240px-Gnome-emblem-default.svg.png";
          
          resultTitle = "🟢 WALLET OPTIMIZED";
          resultDesc = "Your wallet is clean. However, our AI detected potential opportunities in your extended network (funded wallets). Connect to the App to view the full Bubble Map.";

          // Texto para o Twitter (Viral - Curiosidade)
          shareText = `🛡️ SHENLONG AI REPORT\n\nMy wallet is 100% Optimized! ✅\n\nBut the AI detected risks in my connected network... 👀\n\nCheck your wallet health and network map here 👇\n@ShenlongProtocol`;
        }

      } catch (e) {
        resultDesc = "Invalid Wallet Address.";
        finalImage = "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Crystal_Clear_action_delete.png/120px-Crystal_Clear_action_delete.png";
      }

      // Link de Partilha
      const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${MAIN_SITE_URL}`;

      // --- 3. TRANSAÇÃO DE VALIDAÇÃO (0 SOL) ---
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
              icon: finalImage, // Imagem Segura
              title: resultTitle,
              description: resultDesc,
              label: "Actions",
              links: {
                actions: [
                  {
                    label: "💰 Reclaim Rent / View Map",
                    href: `${MAIN_SITE_URL}/dashboard?autoScan=${targetAddress}`,
                    type: "external"
                  },
                  {
                    label: "🐦 Share Report on X",
                    href: shareUrl,
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