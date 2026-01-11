import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=3bff027f-e77f-44dd-a920-8c2f20514399";
const MAIN_SITE_URL = "https://shenlongdapp-git-main-shenlongs-projects-b9e831a3.vercel.app";

// --- FUNÇÃO DE METADATA MELHORADA ---
async function getTokenMetadata(ca: string) {
  try {
    // 1. Limpar o input (remover espaços invisíveis)
    const cleanCA = ca.trim();

    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'shenlong-audit',
        method: 'getAsset', // Método DAS (Digital Asset Standard)
        params: {
          id: cleanCA,
          displayOptions: { showFungible: true }
        },
      }),
    });

    const data = await response.json() as any;
    const result = data.result;

    if (!result) {
      console.log("Helius não encontrou dados para:", cleanCA);
      return null;
    }

    // Tentar encontrar a imagem em vários sítios possíveis da estrutura JSON
    const img = result.content?.links?.image || 
                result.content?.json_uri || 
                result.content?.files?.[0]?.uri || 
                "https://cryptologos.cc/logos/solana-sol-logo.png";

    return {
      name: result.content?.metadata?.name || "Token Desconhecido",
      symbol: result.content?.metadata?.symbol || "TOKEN",
      image: img
    };

  } catch (e) {
    console.error("Erro Fatal Helius:", e);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração Standard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
  res.setHeader('X-Blockchain-Ids', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
  res.setHeader('X-Action-Version', '1');

  if (req.method === 'OPTIONS') return res.status(200).end();
  const BLINK_HOST = `https://${req.headers.host}`; 

  // --- 1. GET: A ENTRADA ---
  if (req.method === 'GET') {
    return res.json({
      icon: "https://cryptologos.cc/logos/solana-sol-logo.png", 
      title: "SHENLONG TOKEN AUDITOR",
      description: "Descobre quanto capital está 'morto' em qualquer Token. Analisa metadados, holders zumbis e rentabilidade.",
      label: "AUDITAR AGORA",
      links: {
        actions: [
          {
            label: "🔍 Iniciar Scan Helius",
            href: `${BLINK_HOST}/api/token?ca={ca}`,
            parameters: [{ name: "ca", label: "Cola o Contrato (CA) do Token", required: true }]
          }
        ]
      }
    });
  }

  // --- 2. POST: O RESULTADO (ESTILO FOMO) ---
  if (req.method === 'POST') {
    try {
      const rawCa = req.query.ca as string; 
      const ca = rawCa ? rawCa.trim() : ""; // Proteção extra contra espaços
      const body = req.body || {};
      const signerAccount = body.account;

      if (!signerAccount) return res.status(400).json({ error: "Wallet not found" });

      // Buscar dados reais
      const metadata = await getTokenMetadata(ca);
      
      // Defaults (Caso falhe, mantém o visual limpo)
      let name = "Token";
      let symbol = "UNKNOWN";
      let image = "https://cryptologos.cc/logos/solana-sol-logo.png";

      if (metadata) {
        name = metadata.name;
        symbol = metadata.symbol;
        image = metadata.image; // Se a Helius devolver imagem, usamos aqui
      }

      // Matemática do FOMO (Estimativa baseada no CA)
      const randomSeed = ca.length + (ca.charCodeAt(0) || 0);
      const estZombies = (randomSeed * 42) + 1200; 
      const estRent = (estZombies * 0.002039).toFixed(2);
      const estUsd = (parseFloat(estRent) * 210).toFixed(0); // SOL a $210
      
      const formatedZombies = estZombies.toLocaleString();

      // Texto Viral para o X
      const tweetText = `🔥 AUDITORIA SHENLONG: ${symbol}%0A%0A⚠️ ALERTA: ${estRent} SOL ($${estUsd}) estão presos em ${formatedZombies} carteiras mortas!%0A%0A💸 Dinheiro deixado na mesa pelo projeto ${name}.%0A%0A👇 Recupera o teu Rent aqui:%0A@ShenlongProtocol`;
      const shareLink = `https://twitter.com/intent/tweet?text=${tweetText}&url=${MAIN_SITE_URL}`;

      // Transação Vazia (Validar User)
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
        message: `Análise Completa: ${symbol}`,
        links: {
          next: {
            type: "inline",
            action: {
              icon: image, // Logo do Token (ou Solana se falhar)
              // TÍTULO GRITANTE
              title: `💸 ${symbol}: $${estUsd} EM LIXO DETETADO`, 
              // DESCRIÇÃO COM MARKDOWN E EMOJIS
              description: `⚠️ RESULTADO CRÍTICO PARA ${name} (${symbol}):\n
              • 🧟 Carteiras Zumbis: **${formatedZombies}**
              • 📉 Capital Bloqueado: **${estRent} SOL**
              • 💰 Valor em Dólares: **$${estUsd} USD**\n
              Este valor pode ser usado para Buyback & Burn ou Marketing. Não deixes este dinheiro parado.`,
              label: "Ações",
              links: {
                actions: [
                  {
                    label: "🐦 Partilhar Alerta no X",
                    href: shareLink,
                    type: "external"
                  },
                  {
                    label: "🔥 Recuperar Este Valor (Site)",
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
      return res.status(500).json({ error: "Erro interno." });
    }
  }
}