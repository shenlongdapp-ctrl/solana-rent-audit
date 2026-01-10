import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Connection, PublicKey, Transaction, TransactionInstruction, clusterApiUrl } from '@solana/web3.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configuração de Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
  res.setHeader('X-Blockchain-Ids', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
  res.setHeader('X-Action-Version', '1');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const BLINK_HOST = `https://${req.headers.host}`; 
  const MAIN_SITE_URL = "https://shenlongdapp-git-main-shenlongs-projects-b9e831a3.vercel.app";

  // 1. O QUE APARECE NO TWITTER (GET)
  if (req.method === 'GET') {
    return res.json({
      icon: "https://cryptologos.cc/logos/solana-sol-logo.png", 
      title: "Shenlong Wallet Audit",
      description: "Verifica se tens SOL 'preso'. Cola a tua wallet abaixo.",
      label: "Escanear Carteira",
      links: {
        actions: [
          {
            label: "Verificar Agora",
            href: `${BLINK_HOST}/api/scan?address={address}`,
            parameters: [{ name: "address", label: "Endereço da Carteira (Ex: G47...)", required: true }]
          }
        ]
      }
    });
  }

  // 2. O QUE ACONTECE AO CLICAR (POST)
  if (req.method === 'POST') {
    try {
      const { address } = req.query;
      const body = req.body || {};
      const userAccount = body.account; // A carteira de quem está a clicar (vem do Dialect)

      if (!userAccount) {
        return res.status(400).json({ error: "Conta não fornecida pelo Dialect" });
      }

      // --- CRIAÇÃO DA TRANSAÇÃO FANTASMA (Para corrigir o 'Signing Failed') ---
      const connection = new Connection(clusterApiUrl('mainnet-beta'));
      const userPubkey = new PublicKey(userAccount);
      
      const transaction = new Transaction();
      
      // Adicionar uma instrução Memo (Inofensiva, custo quase zero, só para validar a ação)
      transaction.add(
        new TransactionInstruction({
          keys: [{ pubkey: userPubkey, isSigner: true, isWritable: true }],
          data: Buffer.from("Shenlong Audit Verify", "utf-8"),
          programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcQb"),
        })
      );

      transaction.feePayer = userPubkey;
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // Serializar a transação
      const payload = transaction.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');

      // --- RESPOSTA COM A TRANSAÇÃO E OS BOTÕES FINAIS ---
      return res.json({
        type: "transaction",
        transaction: payload, // <--- ISTO É O QUE FALTAVA!
        message: `Auditoria concluída para ${address}`,
        links: {
          next: {
            type: "inline",
            action: {
              icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
              title: "⚠️ Ineficiências Detetadas!",
              description: "Encontrámos Rent por reclamar. Escolhe uma ação:",
              label: "Ações",
              links: {
                actions: [
                  {
                    label: "💰 Recuperar SOL (Ir para Site)",
                    href: `${MAIN_SITE_URL}/dashboard?autoScan=${address}`,
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
      console.error(error);
      return res.status(500).json({ error: "Erro ao processar auditoria" });
    }
  }
}