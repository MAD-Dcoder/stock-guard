import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowLeft, FiBox, FiZap } from 'react-icons/fi';
import { FundoEstelar } from '../components/FundoEstelar';

interface ProductPreview {
  id: number;
  name: string;
  sku: string;
  stock: number;
  price: number;
}

const INITIAL_DEMO_PRODUCTS: ProductPreview[] = [
  { id: 1, name: 'iPhone 16 Pro 256GB', sku: 'IPH-16P-256', stock: 1, price: 8999.0 },
  { id: 2, name: 'Teclado Mecânico Keychron K2', sku: 'KEY-K2-BR', stock: 12, price: 649.9 },
  { id: 3, name: 'Monitor Dell 27" 4K', sku: 'DELL-U2723', stock: 4, price: 3290.0 },
];

export function Dashboard() {
  const [products, setProducts] = useState<ProductPreview[]>(INITIAL_DEMO_PRODUCTS);
  const [logs, setLogs] = useState<string[]>([
    'Modo preview local: conecte a API .NET 10 para persistir no PostgreSQL.',
  ]);

  const simulateConcurrentBuy = (productId: number) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;

    if (target.stock <= 0) {
      setLogs((prev) => [
        `[409 Conflict] Estoque esgotado para "${target.name}" — nenhuma unidade vendida.`,
        ...prev,
      ]);
      return;
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock: p.stock - 1 } : p)),
    );
    setLogs((prev) => [
      `[201 Created] Compra 1 aprovada para "${target.name}".`,
      `[409 Conflict] Compra 2 simultânea bloqueada por trava atômica!`,
      ...prev,
    ]);
  };

  return (
    <FundoEstelar>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2.5rem',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#9ca3af',
              fontWeight: 600,
            }}
          >
            <FiArrowLeft /> Voltar para Home
          </Link>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              padding: '0.35rem 0.85rem',
              borderRadius: '999px',
              background: 'rgba(16, 185, 129, 0.14)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              color: '#34d399',
            }}
          >
            Painel StockGuard (Preview)
          </span>
        </header>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
          Estoque &amp; Simulador de Concorrência
        </h1>
        <p style={{ color: '#9ca3af', margin: '0 0 2rem' }}>
          Assim que subirmos a API .NET 10 + PostgreSQL, esta tela consumirá os endpoints reais.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem',
          }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              style={{
                background: 'rgba(21, 24, 33, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 18,
                padding: '1.5rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <FiBox style={{ color: '#34d399', fontSize: '1.35rem' }} />
                <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>{product.sku}</span>
              </div>
              <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem' }}>{product.name}</h3>
              <p style={{ margin: '0 0 1rem', color: '#cbd5e1', fontWeight: 600 }}>
                R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color: product.stock > 0 ? '#34d399' : '#f87171',
                  }}
                >
                  Estoque: {product.stock} un.
                </span>
                <button
                  onClick={() => simulateConcurrentBuy(product.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.55rem 0.9rem',
                    borderRadius: 10,
                    border: 'none',
                    background: 'linear-gradient(to right, #10b981, #059669)',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <FiZap /> Simular 2x Compras
                </button>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: '#0f1219',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: '1.25rem',
          }}
        >
          <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: '#e2e8f0' }}>
            Log de Transações
          </h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#9ca3af', lineHeight: 1.7 }}>
            {logs.map((entry, idx) => (
              <li key={idx}>{entry}</li>
            ))}
          </ul>
        </div>
      </div>
    </FundoEstelar>
  );
}
