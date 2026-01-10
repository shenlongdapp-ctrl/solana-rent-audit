import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Configuração de CORS e Headers (Essencial para o Dialect aceitar)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
  res.setHeader('X-Blockchain-Ids', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');

  // 2. Responder rápido a pedidos de verificação (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Definição das URLs
  // O link deste próprio Blink
  const BLINK_HOST = `https://${req.headers.host}`; 
  // O link do teu site principal (Usa o da Vercel para garantir que não há bloqueios de imagem)
  const MAIN_SITE_URL = "https://shenlongdapp-git-main-shenlongs-projects-b9e831a3.vercel.app";

  // 4. Lógica do GET (O que aparece no feed do Twitter)
  if (req.method === 'GET') {
    return res.json({
      icon: `${MAIN_SITE_URL}/favicon.png`, 
      title: "Shenlong Wallet Audit",
      description: "Verifica se tens SOL 'preso' em contas lixo. Digita o endereço abaixo.",
      label: "Escanear Carteira",
      links: {
        actions: [
          {
            label: "Verificar Agora",
            href: `${BLINK_HOST}/api/scan?address={address}`,
            parameters: [
              {
                name: "address",
                label: "Endereço da Carteira Solana",
                required: true
              }
            ]
          }
        ]
      }
    });
  }

  // 5. Lógica do POST (O que acontece ao clicar - Redirecionamento)
  if (req.method === 'POST') {
    const { address } = req.query;

    return res.json({
      type: "transaction",
      message: `Análise concluída para a carteira.`,
      links: {
        next: {
          type: "inline",
          action: {
            icon: `${MAIN_SITE_URL}/favicon.png`,
            title: "Relatório de Auditoria",
            description: "Encontrámos ineficiências. Para recuperar o SOL ou converter em $SHEN, usa a App Segura.",
            label: "Ações",
            links: {
              actions: [
                {
                  label: "💰 Recuperar SOL (Ir para App)",
                  href: `${MAIN_SITE_URL}/dashboard?autoScan=${address}`,
                  type: "external"
                },
                {
                  label: "🐉 Comprar $SHEN (Pré-Venda)",
                  href: `${MAIN_SITE_URL}/presale`,
                  type: "external"
                }
              ]
            }
          }
        }
      }
    });
  }
}