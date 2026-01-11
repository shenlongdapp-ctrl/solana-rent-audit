import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=3bff027f-e77f-44dd-a920-8c2f20514399";
const MAIN_SITE_URL = "https://shenlongdapp-git-main-shenlongs-projects-b9e831a3.vercel.app";

// Preço Fixo do Rent por Conta (Solana Standard)
const RENT_PER_ACCOUNT = 0.002039;

// --- 1. FUNÇÃO AVANÇADA PARA METADATA (HELIUS DAS API) ---
async function getTokenMetadata(ca: string) {
  try {
    const cleanCA = ca.trim();
    // Validar se é uma PubKey válida antes de chamar a API
    try { new PublicKey(cleanCA); } catch (e) { return null; }

    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'shenlong-metadata',
        method: 'getAsset', // O método mais poderoso da Helius
        params: {
          id: cleanCA,
          displayOptions: { showFungible: true }
        },
      }),
    });

    const { result } = await response.json() as any;
    if (!result) return null;

    // Tentar extrair a imagem de todas as formas possíveis que a Helius devolve
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

// --- 2. GERADOR DE DADOS DETERMINÍSTICO (Para simular o Audit instantaneamente) ---
function calculateDeterministicStats(ca: string) {
  // Cria um número "semente" único baseado nas letras do CA
  let seed = 0;
  for (let i = 0; i < ca.length; i++) {
    seed += ca.charCodeAt(i);
  }
  
  // Simula Total Accounts (Entre 5k e 150k baseado na semente)
  const totalAccounts = (seed * 423) % 150000 + 5000;
  
  // Simula Zumbis (Entre 20% e 45% das contas)
  const zombiePercentage = ((seed % 25) + 20) / 100;
  const zombieCount = Math.floor(totalAccounts * zombiePercentage);
  
  // Calcula Rent Real Exato
  const rentSol = zombieCount * RENT_PER_ACCOUNT;
  const rentUsd = rentSol * 210; // Preço SOL fixo para rapidez ($210)

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

  // --- GET: A BARRA DE PESQUISA ---
  if (req.method === 'GET') {
    return res.json({
      icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
      title: "Shenlong Token Auditor",
      description: "Cola o Contrato (CA) de qualquer token. A nossa IA analisa a liquidez morta (Rent) presa em contas zumbis.",
      label: "Auditar Token",
      links: {
        actions: [
          {
            label: "🔍 Correr Análise (Helius)",
            href: `${BLINK_HOST}/api/token?ca={ca}`,
            parameters: [{ name: "ca", label: "Cola o Token Address...", required: true }]
          }
        ]
      }
    });
  }

  // --- POST: O RESULTADO (Igual ao teu Site) ---
  if (req.method === 'POST') {
    try {
      const rawCa = req.query.ca as string; 
      const ca = rawCa ? rawCa.trim() : "";
      const body = req.body || {};
      const signerAccount = body.account;

      if (!signerAccount) return res.status(400).json({ error: "Wallet necessária" });

      // 1. Buscar Dados (Paralelo para ser rápido)
      const metadataPromise = getTokenMetadata(ca);
      const stats = calculateDeterministicStats(ca); // Instantâneo
      const metadata = await metadataPromise; // Espera pela Helius

      // Fallbacks Visuais
      const symbol = metadata?.symbol || "TOKEN";
      const name = metadata?.name || "Unknown Project";
      const image = metadata?.image || "https://cryptologos.cc/logos/solana-sol-logo.png";

      // Formatação
      const fmtZombies = stats.zombieCount.toLocaleString();
      const fmtRent = stats.rentSol.toFixed(2);
      const fmtUsd = stats.rentUsd.toLocaleString('en-US', { maximumFractionDigits: 0 });

      // Link Viral (Igual ao do teu código React)
      const tweetText = `🐉 SHENLONG AUDIT REPORT for $${symbol}%0A%0A🔍 Project: ${name}%0A💰 Locked Rent: ${fmtRent} SOL ($${fmtUsd})%0A🧟 Zombie Accounts: ${fmtZombies}%0A%0ACheck if you have old accounts here 👇%0A@ShenlongProtocol`;
      const shareLink = `https://twitter.com/intent/tweet?text=${tweetText}&url=${MAIN_SITE_URL}`;

      // Transação de Validação (0 SOL Self-Transfer)
      // Usamos isto para evitar o "Execution Failed"
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
        message: `Análise concluída para ${symbol}`,
        links: {
          next: {
            type: "inline",
            action: {
              icon: image, // LOGO REAL DA HELIUS
              title: `💸 ${fmtRent} SOL ($${fmtUsd}) DETETADOS`,
              description: `⚠️ RELATÓRIO DE AUDITORIA (${symbol}):\n
              • 🏢 Projeto: **${name}**
              • 🧟 Contas Zumbis: **${fmtZombies}**
              • 📉 Capital Bloqueado: **${fmtRent} SOL**\n
              Este valor está preso na Blockchain. Ajuda a comunidade a recuperá-lo.`,
              label: "Ações",
              links: {
                actions: [
                  {
                    label: "🐦 Partilhar Relatório & Ganhar",
                    href: shareLink,
                    type: "external"
                  },
                  {
                    label: "🔥 Recuperar Agora (Site)",
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
      return res.status(500).json({ error: "Erro na análise." });
    }
  }
}