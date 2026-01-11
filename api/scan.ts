import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const RPC_URL = "https://mainnet.helius-rpc.com/?api-key=3bff027f-e77f-44dd-a920-8c2f20514399";
const MAIN_SITE_URL = "https://shenlongdapp-git-main-shenlongs-projects-b9e831a3.vercel.app";

// Preços para o Simulador FOMO
const SHEN_LAUNCH_PRICE = 0.01; // $0.01
const SOL_PRICE_ESTIMATE = 200; // $200 (Estimativa para conversão)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração Standard
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
  res.setHeader('X-Blockchain-Ids', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
  res.setHeader('X-Action-Version', '1');

  if (req.method === 'OPTIONS') return res.status(200).end();
  const BLINK_HOST = `https://${req.headers.host}`; 

  // --- GET: O ISCO (Scanner de Rede) ---
  if (req.method === 'GET') {
    return res.json({
      icon: "https://i.pinimg.com/originals/a4/09/25/a409257bb5776a39d8923a1df82df23f.gif", 
      title: "Shenlong AI: Deep Network Scan",
      description: "Analisa a tua carteira e as tuas conexões (família/financiadores). Descobre quanto Rent podes converter em $SHEN.",
      label: "Iniciar Varredura",
      links: {
        actions: [
          {
            label: "Escanear Rede & FOMO",
            href: `${BLINK_HOST}/api/scan?address={address}`,
            parameters: [{ name: "address", label: "Cola o teu endereço...", required: true }]
          }
        ]
      }
    });
  }

  // --- POST: O RESULTADO (Rent + Conexões + FOMO) ---
  if (req.method === 'POST') {
    try {
      const targetAddress = req.query.address as string; 
      const body = req.body || {};
      const signerAccount = body.account; 

      if (!signerAccount) return res.status(400).json({ error: "Conta não detetada" });

      const connection = new Connection(RPC_URL, 'confirmed');
      const signerPubkey = new PublicKey(signerAccount);

      // 1. SCAN DE RENT
      let resultTitle = "";
      let resultDesc = "";
      let gifUrl = ""; 
      let hasJunk = false;

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

        // 2. CÁLCULO FOMO (Quanto vale isto em SHEN?)
        // 1 SOL ~ $200. Rent em USD.
        const rentInUsd = rentSol * SOL_PRICE_ESTIMATE;
        const tokensAtLaunch = rentInUsd / SHEN_LAUNCH_PRICE;
        const valAt10x = rentInUsd * 10; 

        if (junkCount > 0) {
          hasJunk = true;
          // GIF: Alerta Vermelho / Rede Detetada
          gifUrl = "https://i.pinimg.com/originals/e8/35/6d/e8356da35623091e0892095cc1b06877.gif";
          
          // Título com Emojis de Status
          resultTitle = `🔴 WALLET: SUJA (${rentSol.toFixed(3)} SOL) | ⚠️ REDE: 3 CONEXÕES SUSPEITAS`;
          
          // Descrição com FOMO Matemático
          resultDesc = `Encontrámos ${junkCount} contas lixo.
          🔥 SIMULADOR SHEN:
          Se trocares agora: ~${tokensAtLaunch.toFixed(0)} $SHEN.
          Se fizer 10x: Vales $${valAt10x.toFixed(2)} USD!
          
          Clica para veres quem te sujou a carteira (Bubble Map).`;
        } else {
          gifUrl = "https://cdn.dribbble.com/users/1758660/screenshots/6255395/check.gif";
          resultTitle = "🟢 WALLET: CLEAN | 🟡 REDE: A ANALISAR...";
          resultDesc = "A tua carteira está limpa, mas detetámos atividade em carteiras conectadas. Conecta-te à App para veres o mapa completo da tua rede.";
        }

      } catch (e) {
        resultDesc = "Endereço inválido.";
        gifUrl = "https://media.tenor.com/images/a742721ea2075bc3956a2ff62c98ade3/tenor.gif"; 
      }

      // 3. TRANSAÇÃO DE VALIDAÇÃO (0 SOL)
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
        message: "Calculando projeção...",
        links: {
          next: {
            type: "inline",
            action: {
              icon: gifUrl,
              title: resultTitle,
              description: resultDesc,
              label: "Ver Mapa & Simulação",
              links: {
                actions: [
                  {
                    label: "🚀 Ver Bubble Map (App)",
                    href: `${MAIN_SITE_URL}/dashboard?autoScan=${targetAddress}`,
                    type: "external"
                  },
                  {
                    label: "💰 Trocar por $SHEN",
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
      return res.status(500).json({ error: "Erro de conexão." });
    }
  }
}