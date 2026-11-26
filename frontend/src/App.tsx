import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Moon,
  PackagePlus,
  RefreshCw,
  Search,
  ShoppingCart,
  Sun,
  X,
  Zap,
} from 'lucide-react';
import { stockApi } from './services/api';
import type { Order, Product } from './types/stock';
import './App.css';

type Tab = 'products' | 'orders' | 'concurrency';

interface ConcurrencyResult {
  attempt: number;
  status: number;
  durationMs: number;
  detail: string;
}

export function App() {
  const [tab, setTab] = useState<Tab>('products');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Drawer Novo Produto
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [initialStock, setInitialStock] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  // Lab de Concorrência
  const [selectedProductId, setSelectedProductId] = useState('');
  const [concurrentCount, setConcurrentCount] = useState(10);
  const [runningStress, setRunningStress] = useState(false);
  const [stressResults, setStressResults] = useState<ConcurrencyResult[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, ords] = await Promise.all([stockApi.getProducts(), stockApi.getOrders()]);
      setProducts(prods);
      setOrders(ords);
      if (prods.length > 0 && !selectedProductId) {
        setSelectedProductId(prods[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Verifique se a API .NET está rodando em ${stockApi.baseUrl}.`
          : 'Erro ao carregar dados da API.',
      );
    } finally {
      setLoading(false);
    }
  }, [selectedProductId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term),
    );
  }, [products, search]);

  const totalUnits = useMemo(
    () => products.reduce((sum, p) => sum + p.stockQuantity, 0),
    [products],
  );
  const outOfStockCount = useMemo(
    () => products.filter((p) => p.stockQuantity === 0).length,
    [products],
  );

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await stockApi.createProduct({
        name,
        sku,
        price: Number(price),
        initialStock: Number(initialStock),
      });
      setProducts((prev) => [...prev, created]);
      setSelectedProductId(created.id);
      setDrawerOpen(false);
      setName('');
      setSku('');
      setPrice('');
      setInitialStock('1');
      showToast(`Produto "${created.name}" cadastrado.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao cadastrar produto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickBuy = async (product: Product) => {
    try {
      await stockApi.placeOrder({
        productId: product.id,
        quantity: 1,
        customerEmail: 'cliente@stockguard.dev',
      });
      showToast(`Compra de 1x "${product.name}" confirmada (201).`);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Falha ao comprar.');
    }
  };

  const handleQuickRestock = async (product: Product) => {
    try {
      await stockApi.restockProduct(product.id, 5);
      showToast(`+5 unidades adicionadas em "${product.name}".`);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Falha ao repor estoque.');
    }
  };

  const handleRunConcurrencyTest = async () => {
    if (!selectedProductId) return;
    setRunningStress(true);
    setStressResults([]);
    try {
      const requests = Array.from({ length: concurrentCount }, (_, index) =>
        stockApi
          .placeOrderRaw({
            productId: selectedProductId,
            quantity: 1,
            customerEmail: `concorrente${index + 1}@stockguard.dev`,
          })
          .then((res) => ({ attempt: index + 1, ...res })),
      );

      const results = await Promise.all(requests);
      setStressResults(results);
      await loadData();
    } finally {
      setRunningStress(false);
    }
  };

  const getStockBadge = (qty: number) => {
    if (qty === 0) return <span className="sg-badge sg-badge-danger">Esgotado</span>;
    if (qty <= 3) return <span className="sg-badge sg-badge-warning">Últimas {qty} un.</span>;
    return <span className="sg-badge sg-badge-success">{qty} em estoque</span>;
  };

  return (
    <div className="sg-shell">
      <aside className="sg-sidebar">
        <div>
          <div className="sg-brand">
            <div className="sg-brand-icon">
              <Box size={18} />
            </div>
            <div>
              <div className="sg-brand-name">StockGuard</div>
              <div className="sg-brand-sub">Controle Atômico</div>
            </div>
          </div>

          <nav className="sg-nav">
            <button
              className={`sg-nav-item ${tab === 'products' ? 'active' : ''}`}
              onClick={() => setTab('products')}
            >
              <Box size={16} /> Estoque
            </button>
            <button
              className={`sg-nav-item ${tab === 'orders' ? 'active' : ''}`}
              onClick={() => setTab('orders')}
            >
              <ShoppingCart size={16} /> Pedidos ({orders.length})
            </button>
            <button
              className={`sg-nav-item ${tab === 'concurrency' ? 'active' : ''}`}
              onClick={() => setTab('concurrency')}
            >
              <Zap size={16} /> Lab de Concorrência
            </button>
          </nav>
        </div>

        <div className="sg-sidebar-footer">
          <button
            className="sg-btn"
            onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}
          >
            {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            {theme === 'light' ? 'Modo escuro' : 'Modo claro'}
          </button>
        </div>
      </aside>

      <main className="sg-main">
        <header className="sg-header">
          <div>
            <h1 className="sg-title">
              {tab === 'products' && 'Catálogo & Estoque'}
              {tab === 'orders' && 'Histórico de Pedidos'}
              {tab === 'concurrency' && 'Laboratório de Concorrência'}
            </h1>
            <p className="sg-subtitle">
              {tab === 'products' &&
                'Gerencie produtos e realize baixas com consistência transacional no PostgreSQL.'}
              {tab === 'orders' &&
                'Pedidos confirmados dentro de transações ACID com auditoria de movimentação.'}
              {tab === 'concurrency' &&
                'Dispare requisições simultâneas reais contra a API para validar bloqueio de overselling.'}
            </p>
          </div>

          <div className="sg-actions">
            <button className="sg-btn" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw size={15} /> Atualizar
            </button>
            <button className="sg-btn sg-btn-primary" onClick={() => setDrawerOpen(true)}>
              <PackagePlus size={15} /> Novo produto
            </button>
          </div>
        </header>

        {error && (
          <div className="sg-alert">
            <span>{error}</span>
            <button className="sg-btn" onClick={() => void loadData()}>
              Tentar novamente
            </button>
          </div>
        )}

        <section className="sg-kpi-grid">
          <div className="sg-card">
            <div className="sg-kpi-label">Produtos cadastrados</div>
            <div className="sg-kpi-value tabular">{products.length}</div>
          </div>
          <div className="sg-card">
            <div className="sg-kpi-label">Unidades disponíveis</div>
            <div className="sg-kpi-value tabular">{totalUnits}</div>
          </div>
          <div className="sg-card">
            <div className="sg-kpi-label">Itens esgotados</div>
            <div className="sg-kpi-value tabular">{outOfStockCount}</div>
          </div>
          <div className="sg-card">
            <div className="sg-kpi-label">Pedidos confirmados</div>
            <div className="sg-kpi-value tabular">{orders.length}</div>
          </div>
        </section>

        {tab === 'products' && (
          <section className="sg-card" style={{ padding: 0 }}>
            <div className="sg-toolbar">
              <div className="sg-search">
                <Search size={15} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {filteredProducts.length} item(ns)
              </span>
            </div>

            {loading ? (
              <div className="sg-empty">Carregando estoque...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="sg-empty">
                Nenhum produto encontrado. Cadastre um produto para começar.
              </div>
            ) : (
              <div className="sg-table-wrap">
                <table className="sg-table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>SKU</th>
                      <th>Preço</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td style={{ fontWeight: 600 }}>{product.name}</td>
                        <td className="tabular" style={{ color: 'var(--text-muted)' }}>
                          {product.sku}
                        </td>
                        <td className="tabular">
                          R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td>{getStockBadge(product.stockQuantity)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            <button
                              className="sg-btn"
                              onClick={() => void handleQuickRestock(product)}
                            >
                              +5 un.
                            </button>
                            <button
                              className="sg-btn sg-btn-primary"
                              onClick={() => void handleQuickBuy(product)}
                            >
                              Comprar 1
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'orders' && (
          <section className="sg-card" style={{ padding: 0 }}>
            {orders.length === 0 ? (
              <div className="sg-empty">Nenhum pedido registrado ainda.</div>
            ) : (
              <div className="sg-table-wrap">
                <table className="sg-table">
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Produto</th>
                      <th>Cliente</th>
                      <th>Qtd</th>
                      <th>Total</th>
                      <th>Data (UTC)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="tabular" style={{ color: 'var(--text-muted)' }}>
                          #{order.id.slice(0, 8)}
                        </td>
                        <td style={{ fontWeight: 600 }}>{order.productName}</td>
                        <td>{order.customerEmail}</td>
                        <td className="tabular">{order.quantity}</td>
                        <td className="tabular">
                          R$ {order.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="tabular" style={{ color: 'var(--text-muted)' }}>
                          {new Date(order.createdAtUtc).toLocaleString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'concurrency' && (
          <section className="sg-card">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                alignItems: 'end',
                marginBottom: '1.25rem',
              }}
            >
              <div className="sg-field">
                <label>Produto alvo</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (estoque: {p.stockQuantity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sg-field">
                <label>Requisições simultâneas (Promise.all)</label>
                <input
                  type="number"
                  min={2}
                  max={50}
                  value={concurrentCount}
                  onChange={(e) => setConcurrentCount(Number(e.target.value))}
                />
              </div>
              <button
                className="sg-btn sg-btn-primary"
                style={{ justifyContent: 'center', height: 38 }}
                disabled={!selectedProductId || runningStress}
                onClick={() => void handleRunConcurrencyTest()}
              >
                <Zap size={15} />
                {runningStress ? 'Disparando...' : `Disparar ${concurrentCount} compras`}
              </button>
            </div>

            {stressResults.length > 0 && (
              <div>
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span className="sg-badge sg-badge-success">
                    201 Aprovadas: {stressResults.filter((r) => r.status === 201).length}
                  </span>
                  <span className="sg-badge sg-badge-danger">
                    409 Conflitos bloqueados: {stressResults.filter((r) => r.status === 409).length}
                  </span>
                </div>
                <div className="sg-table-wrap">
                  <table className="sg-table">
                    <thead>
                      <tr>
                        <th>Requisição</th>
                        <th>HTTP Status</th>
                        <th>Tempo</th>
                        <th>Retorno da API</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stressResults.map((res) => (
                        <tr key={res.attempt}>
                          <td className="tabular">#{res.attempt}</td>
                          <td>
                            <span
                              className={`sg-badge ${
                                res.status === 201 ? 'sg-badge-success' : 'sg-badge-danger'
                              }`}
                            >
                              {res.status}
                            </span>
                          </td>
                          <td className="tabular">{res.durationMs} ms</td>
                          <td>{res.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {drawerOpen && (
        <div className="sg-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <form
            className="sg-drawer"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void handleCreateProduct(e)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Cadastrar produto</h2>
              <button
                type="button"
                className="sg-btn"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar"
              >
                <X size={15} />
              </button>
            </div>

            <div className="sg-field">
              <label>Nome</label>
              <input
                required
                placeholder="Ex.: iPhone 16 Pro 256GB"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="sg-field">
              <label>SKU</label>
              <input
                required
                placeholder="Ex.: IPH-16P-256"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>

            <div className="sg-field">
              <label>Preço (R$)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0.01"
                placeholder="8999.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="sg-field">
              <label>Estoque inicial</label>
              <input
                required
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
              />
            </div>

            <button className="sg-btn sg-btn-primary" type="submit" disabled={submitting}>
              {submitting ? 'Salvando...' : 'Salvar produto'}
            </button>
          </form>
        </div>
      )}

      {toast && <div className="sg-toast">{toast}</div>}
    </div>
  );
}

export default App;
