import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Configuração de Headers (CORS e Versão do Action)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Encoding, Accept-Encoding');
  res.setHeader('X-Blockchain-Ids', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
  res.setHeader('X-Action-Version', '1'); // <--- A LINHA QUE FALTAVA PARA O ERRO VERMELHO

  // 2. Responder rápido a pedidos de verificação (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Definição das URLs
  const BLINK_HOST = `https://${req.headers.host}`; 
  // O link do teu site principal (para onde o usuário vai depois)
  const MAIN_SITE_URL = "https://shenlongdapp-git-main-shenlongs-projects-b9e831a3.vercel.app";

  // 4. Lógica do GET (O que aparece no feed do Twitter)
  if (req.method === 'GET') {
    return res.json({
      // Usamos um logo público fiável para testar se a imagem aparece
      icon: "https://cryptologos.cc/logos/solana-sol-logo.png", 
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
      message: `Análise concluída.`,
      links: {
        next: {
          type: "inline",
          action: {
            icon: "https://cryptologos.cc/logos/solana-sol-logo.png",
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