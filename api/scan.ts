import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

// O TEU RPC DA HELIUS
const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=3bff027f-e77f-44dd-a920-8c2f20514399";
// O LINK DO TEU SITE NA VERCEL (Onde o utilizador vai parar)
const MAIN_SITE_URL = "https://shenlongdapp-git-main-shenlongs-projects-b9e831a3.vercel.app";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CONFIGURAÇÃO CORS E HEADERS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
  res.setHeader('X-Blockchain-Ids', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
  res.setHeader('X-Action-Version', '1');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const BLINK_HOST = `https://${req.headers.host}`; 

  // 1. GET: A MONTRA (O que aparece no Twitter)
  if (req.method === 'GET') {
    return res.json({
      icon: "https://cryptologos.cc/logos/solana-sol-logo.png", 
      title: "Shenlong Wallet Audit",
      description: "Verifica agora quanto SOL tens perdido em contas de lixo (Rent).",
      label: "Escanear Carteira",
      links: {
        actions: [
          {
            label: "Verificar Grátis",
            href: `${BLINK_HOST}/api/scan?address={address}`,
            parameters: [{ name: "address", label: "Cola o teu endereço Solana...", required: true }]
          }
        ]
      }
    });
  }

  // 2. POST: O CÉREBRO
  if (req.method === 'POST') {
    try {
      const targetAddress = req.query.address as string; 
      const body = req.body || {};
      const signerAccount = body.account; 

      if (!signerAccount) {
        return res.status(400).json({ error: "Conta não fornecida" });
      }

      const connection = new Connection(RPC_URL, 'confirmed');
      const signerPubkey = new PublicKey(signerAccount);

      // --- LÓGICA DE SCAN ---
      let rentMessage = "Análise concluída.";
      let hasJunk = false;

      try {
        const targetPubkey = new PublicKey(targetAddress);
        const accounts = await connection.getParsedTokenAccountsByOwner(targetPubkey, {
          programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
        });

        let totalRent = 0;
        let junkCount = 0;

        for (const acc of accounts.value) {
          const balance = acc.account.data.parsed.info.tokenAmount.uiAmount;
          const lamports = acc.account.lamports;
          if (balance === 0 && lamports > 0) {
            totalRent += lamports;
            junkCount++;
          }
        }

        const rentInSol = totalRent / LAMPORTS_PER_SOL;

        if (junkCount > 0) {
          rentMessage = `🚨 Encontrámos ${rentInSol.toFixed(4)} SOL presos em ${junkCount} contas! [Clica aqui para recuperar](${MAIN_SITE_URL}/dashboard?autoScan=${targetAddress})`;
          hasJunk = true;
        } else {
          rentMessage = `✅ Carteira limpa! Mas podes [comprar $SHEN aqui](${MAIN_SITE_URL}/presale).`;
        }

      } catch (e) {
        rentMessage = "Erro ao ler endereço. Verifique se está correto.";
      }

      // --- TRANSAÇÃO (Self-Transfer 0 SOL) ---
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: signerPubkey,
          toPubkey: signerPubkey,
          lamports: 0, 
        })
      );

      transaction.feePayer = signerPubkey;
      // MUDANÇA IMPORTANTE: Usar 'confirmed' em vez de 'finalized' para ser mais rápido e evitar erros
      const { blockhash } = await connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;

      const payload = transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');

      return res.json({
        type: "transaction",
        transaction: payload,
        message: rentMessage,
        links: {
          next: {
            type: "inline",
            action: {
              icon: hasJunk ? "https://cryptologos.cc/logos/solana-sol-logo.png" : "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Green_tick.svg/1024px-Green_tick.svg.png",
              title: hasJunk ? "⚠️ RECUPERAÇÃO DISPONÍVEL" : "AUDITORIA FINALIZADA",
              description: rentMessage,
              label: "Ações",
              links: {
                actions: [
                  {
                    label: "💰 Recuperar SOL (App)",
                    href: `${MAIN_SITE_URL}/dashboard?autoScan=${targetAddress}`,
                    type: "external"
                  },
                  {
                    label: "🐉 Comprar $SHEN",
                    href: `${MAIN_SITE_URL}/presale`,
                    type: "external"
                  }
                ]
              }
            }
          }
        }
      });

    } catch (error) {
      console.error("Erro:", error);
      return res.status(500).json({ error: "Falha técnica. Tente novamente." });
    }
  }
}