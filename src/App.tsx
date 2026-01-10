import { useState } from 'react';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Search, Terminal, AlertTriangle, ArrowRight } from 'lucide-react';

// 🟢 O TEU RPC DA HELIUS CONFIGURADO
const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=3bff027f-e77f-44dd-a920-8c2f20514399";

function App() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ rent: number; accounts: number } | null>(null);
  const [error, setError] = useState('');

  const handleAudit = async () => {
    if (!address) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Validação básica de formato
      try {
        new PublicKey(address);
      } catch (e) {
        throw new Error("Invalid Solana address format.");
      }

      // Conexão usando o teu RPC Helius (Mais rápido que o público)
      const connection = new Connection(RPC_ENDPOINT);
      const pubKey = new PublicKey(address);

      // 1. Buscar todas as contas (Token Accounts)
      const accounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
        programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
      });

      let totalRent = 0;
      let junkAccounts = 0;

      // 2. Analisar cada conta
      for (const acc of accounts.value) {
        // Quantidade de Tokens (ex: 0 USDC)
        const balance = acc.account.data.parsed.info.tokenAmount.uiAmount;
        // Quantidade de SOL preso (Rent) em lamports
        const lamports = acc.account.lamports;
        
        // Se tem saldo 0 de token mas tem lamports (rent), é lixo recuperável
        if (balance === 0 && lamports > 0) {
          totalRent += lamports;
          junkAccounts++;
        }
      }

      setResult({
        rent: totalRent / LAMPORTS_PER_SOL,
        accounts: junkAccounts
      });

    } catch (err: any) {
      console.error(err);
      setError("Failed to connect to Solana network. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-mono p-4 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#111_1px,transparent_1px),linear-gradient(to_bottom,#111_1px,transparent_1px)] bg-[size:24px_24px] -z-10"></div>

      <div className="max-w-xl w-full bg-terminal-black border border-terminal-gray p-8 rounded-lg shadow-[0_0_30px_rgba(0,255,65,0.1)]">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 border-b border-terminal-gray pb-4">
          <Terminal className="text-terminal-green w-8 h-8" />
          <div>
            <h1 className="text-2xl font-bold text-white tracking-wider">SHENLONG<span className="text-terminal-green">_AUDIT</span></h1>
            <p className="text-xs text-gray-500 uppercase">v1.0.4 // OPEN SOURCE UTILITY</p>
          </div>
        </div>

        {/* Input Zone */}
        <div className="space-y-4">
          <label className="text-xs uppercase text-gray-400 tracking-widest">Target Wallet Address</label>
          <div className="relative group">
            <input 
              type="text" 
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Paste Solana address..."
              className="w-full bg-black border border-terminal-gray text-terminal-green p-4 pl-4 focus:outline-none focus:border-terminal-green transition-all font-bold placeholder-gray-700"
            />
            <button 
              onClick={handleAudit}
              disabled={loading}
              className="absolute right-2 top-2 bottom-2 bg-terminal-gray hover:bg-terminal-green hover:text-black text-white px-6 transition-colors uppercase text-sm font-bold flex items-center gap-2"
            >
              {loading ? 'Scanning...' : <><Search className="w-4 h-4" /> Audit</>}
            </button>
          </div>
          {error && <p className="text-terminal-red text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</p>}
        </div>

        {/* Results Zone */}
        {result && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`border-l-4 ${result.rent > 0 ? 'border-terminal-red bg-red-950/10' : 'border-terminal-green bg-green-950/10'} p-6`}>
              
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`text-lg font-bold ${result.rent > 0 ? 'text-terminal-red' : 'text-terminal-green'}`}>
                    {result.rent > 0 ? '⚠️ INEFFICIENCY DETECTED' : '✅ WALLET OPTIMIZED'}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">Audit complete via Helius Node.</p>
                </div>
                {result.rent > 0 && <span className="text-3xl">🛑</span>}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/50 p-4 border border-white/5">
                  <div className="text-gray-500 text-xs uppercase mb-1">Dormant SOL</div>
                  <div className="text-2xl font-bold text-white">{result.rent.toFixed(4)} <span className="text-sm font-normal text-gray-600">SOL</span></div>
                </div>
                <div className="bg-black/50 p-4 border border-white/5">
                  <div className="text-gray-500 text-xs uppercase mb-1">Junk Accounts</div>
                  <div className="text-2xl font-bold text-white">{result.accounts}</div>
                </div>
              </div>

              {/* Call to Action - O "Hook" */}
              {result.rent > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 mb-2">ACTIONS AVAILABLE:</p>
                  
                  {/* Link para o teu site Vercel (que funciona) para fazer o claim */}
                  <a 
                    href="https://shenlongdapp-git-main-shenlongs-projects-b9e831a3.vercel.app/" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full bg-terminal-green text-black font-bold py-3 px-4 text-center hover:bg-white transition-colors flex items-center justify-center gap-2"
                  >
                     RECLAIM {result.rent.toFixed(4)} SOL <ArrowRight className="w-4 h-4" />
                  </a>
                  
                  <div className="text-center">
                    <span className="text-[10px] text-gray-500">Redirects to Shenlong Protocol (Secure App)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="absolute bottom-4 text-[10px] text-gray-600">
        Powered by Helius RPC • github.com/shenlongprotocol
      </div>
    </div>
  )
}

export default App;