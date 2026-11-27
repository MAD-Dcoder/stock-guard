import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Box,
  ExternalLink,
  HelpCircle,
  History,
  Layers,
  Loader2,
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
import type { Order, Product, StockMovement, StockMovementType } from './types/stock';
import './App.css';

type Tab = 'products' | 'orders' | 'movements' | 'concurrency';
type StockFilter = 'all' | 'low';

interface ConcurrencyResult {
  attempt: number;
  status: number;
  durationMs: number;
  detail: string;
}

const MOVEMENT_LABELS: Record<StockMovementType, { label: string; badge: string }> = {
  1: { label: 'Entrada inicial', badge: 'sg-badge-neutral' },
  2: { label: 'Reposição', badge: 'sg-badge-success' },
  3: { label: 'Venda (Pedido)', badge: 'sg-badge-warning' },
  4: { label: 'Estorno (Cancelamento)', badge: 'sg-badge-success' },
};

export function App() {
  const [tab, setTab] = useState<Tab>('products');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [health, setHealth] = useState<{ online: boolean; latencyMs: number }>({
    online: false,
    latencyMs: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  // Drawer Novo Produto
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [initialStock, setInitialStock] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  // Drawer Novo Pedido
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [orderProductId, setOrderProductId] = useState('');
  const [orderQuantity, setOrderQuantity] = useState('1');
  const [orderEmail, setOrderEmail] = useState('cliente@stockguard.dev');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Lab de Concorrência
  const [selectedProductId, setSelectedProductId] = useState('');
  const [concurrentCount, setConcurrentCount] = useState(10);
  const [runningStress, setRunningStress] = useState(false);
  const [stressResults, setStressResults] = useState<ConcurrencyResult[]>([]);
  const [batchDurationMs, setBatchDurationMs] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = (msg: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast(msg);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, prods, ords, movs] = await Promise.all([
        stockApi.checkHealth(),
        stockApi.getProducts(),
        stockApi.getOrders(),
        stockApi.getMovements(),
      ]);
      setHealth(healthRes);
      setProducts(prods);
      setOrders(ords);
      setMovements(movs);
      if (prods.length > 0) {
        setSelectedProductId((prev) => prev || prods[0].id);
        setOrderProductId((prev) => prev || prods[0].id);
      }
    } catch (err) {
      setHealth({ online: false, latencyMs: 0 });
      setError(
        err instanceof Error
          ? `${err.message}. Verifique se a API .NET está rodando em ${stockApi.baseUrl}.`
          : 'Erro ao carregar dados da API.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesTerm =
        !term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
      const matchesFilter = stockFilter === 'all' || p.stockQuantity <= 3;
      return matchesTerm && matchesFilter;
    });
  }, [products, search, stockFilter]);

  const totalUnits = useMemo(
    () => products.reduce((sum, p) => sum + p.stockQuantity, 0),
    [products],
  );
  const lowOrEmptyCount = useMemo(
    () => products.filter((p) => p.stockQuantity <= 3).length,
    [products],
  );
  const confirmedOrders = useMemo(
    () => orders.filter((o) => o.status === 1),
    [orders],
  );
  const totalRevenue = useMemo(
    () => confirmedOrders.reduce((sum, o) => sum + o.totalPrice, 0),
    [confirmedOrders],
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
      setDrawerOpen(false);
      setName('');
      setSku('');
      setPrice('');
      setInitialStock('1');
      setSelectedProductId(created.id);
      showToast(`Produto "${created.name}" cadastrado.`);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao cadastrar produto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickBuy = async (product: Product) => {
    setBusyId(`buy-${product.id}`);
    try {
      await stockApi.placeOrder(
        {
          productId: product.id,
          quantity: 1,
          customerEmail: 'cliente@stockguard.dev',
        },
        crypto.randomUUID(),
      );
      showToast(`Compra de 1x "${product.name}" confirmada (201).`);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Falha ao comprar.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    setBusyId(`cancel-${order.id}`);
    try {
      await stockApi.cancelOrder(order.id);
      showToast(`Pedido #${order.id.slice(0, 8)} cancelado e estoque estornado.`);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Falha ao cancelar pedido.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderProductId) return;
    setSubmittingOrder(true);
    try {
      const created = await stockApi.placeOrder(
        {
          productId: orderProductId,
          quantity: Number(orderQuantity),
          customerEmail: orderEmail,
        },
        crypto.randomUUID(),
      );
      setOrderDrawerOpen(false);
      setOrderQuantity('1');
      showToast(`Pedido #${created.id.slice(0, 8)} confirmado!`);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao criar pedido.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleQuickRestock = async (product: Product) => {
    setBusyId(`restock-${product.id}`);
    try {
      await stockApi.restockProduct(product.id, 5);
      showToast(`+5 unidades adicionadas em "${product.name}".`);
      await loadData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Falha ao repor estoque.');
    } finally {
      setBusyId(null);
    }
  };

  const openStressForProduct = (productId: string) => {
    setSelectedProductId(productId);
    setStressResults([]);
    setBatchDurationMs(null);
    setTab('concurrency');
  };

  const handleRunConcurrencyTest = async () => {
    if (!selectedProductId) return;
    setRunningStress(true);
    setStressResults([]);
    setBatchDurationMs(null);
    const start = performance.now();
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
      setBatchDurationMs(Math.round(performance.now() - start));
      setStressResults(results);
      await loadData();
    } finally {
      setRunningStress(false);
    }
  };

  const approvedStress = stressResults.filter((r) => r.status === 201).length;
  const conflictStress = stressResults.filter((r) => r.status === 409).length;
  const errorStress = stressResults.filter((r) => r.status !== 201 && r.status !== 409).length;
  const approvedPct =
    stressResults.length > 0 ? Math.round((approvedStress / stressResults.length) * 100) : 0;

  const getStockBadge = (qty: number) => {
    if (qty === 0) return <span className="sg-badge sg-badge-danger">Esgotado</span>;
    if (qty === 1) return <span className="sg-badge sg-badge-warning">Última unidade</span>;
    if (qty <= 3) return <span className="sg-badge sg-badge-warning">Baixo ({qty} un.)</span>;
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
              <span className="sg-nav-left">
                <Box size={16} /> Estoque
              </span>
              <span className="sg-nav-count tabular">{products.length}</span>
            </button>
            <button
              className={`sg-nav-item ${tab === 'orders' ? 'active' : ''}`}
              onClick={() => setTab('orders')}
            >
              <span className="sg-nav-left">
                <ShoppingCart size={16} /> Pedidos
              </span>
              <span className="sg-nav-count tabular">{orders.length}</span>
            </button>
            <button
              className={`sg-nav-item ${tab === 'movements' ? 'active' : ''}`}
              onClick={() => setTab('movements')}
            >
              <span className="sg-nav-left">
                <History size={16} /> Auditoria
              </span>
              <span className="sg-nav-count tabular">{movements.length}</span>
            </button>
            <button
              className={`sg-nav-item ${tab === 'concurrency' ? 'active' : ''}`}
              onClick={() => setTab('concurrency')}
            >
              <span className="sg-nav-left">
                <Zap size={16} /> Lab Concorrência
              </span>
            </button>
          </nav>
        </div>

        <div className="sg-sidebar-footer">
          <div className="sg-health-pill">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              {loading ? (
                <>
                  <Loader2 size={14} className="sg-spin" style={{ color: 'var(--primary)' }} />
                  <span>Conectando à API...</span>
                </>
              ) : health.online ? (
                <>
                  <span className="sg-dot online" style={{ marginRight: 0 }} />
                  <span>API .NET Online</span>
                </>
              ) : (
                <>
                  <Loader2 size={14} className="sg-spin" style={{ color: '#ef4444' }} />
                  <span>API Offline / Acordando</span>
                </>
              )}
            </span>

            {health.online && !loading ? (
              <span className="tabular" style={{ color: 'var(--text-muted)' }}>
                {health.latencyMs} ms
              </span>
            ) : (
              <span
                className="sg-help-wrap"
                tabIndex={0}
                aria-label="Por que os dados estão zerados?"
              >
                <HelpCircle size={15} />
                <span className="sg-help-tooltip">
                  Isso é normal: a API roda no plano gratuito do Render e hiberna após inatividade.
                  Os dados ficam zerados enquanto ela acorda (~30s) e serão carregados em seguida.
                </span>
              </span>
            )}
          </div>

          <a
            className="sg-btn"
            href={`${stockApi.baseUrl}/swagger`}
            target="_blank"
            rel="noreferrer"
            style={{ justifyContent: 'space-between' }}
          >
            <span>Swagger / OpenAPI</span>
            <ExternalLink size={14} />
          </a>

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
              {tab === 'movements' && 'Auditoria de Movimentações'}
              {tab === 'concurrency' && 'Laboratório de Concorrência'}
            </h1>
            <p className="sg-subtitle">
              {tab === 'products' &&
                'Gerencie produtos e realize baixas com consistência transacional no PostgreSQL.'}
              {tab === 'orders' &&
                'Pedidos confirmados dentro de transações ACID com preço congelado no momento da compra.'}
              {tab === 'movements' &&
                'Trilha imutável de entradas iniciais, reposições e baixas por venda.'}
              {tab === 'concurrency' &&
                'Simule múltiplos clientes comprando ao mesmo tempo para validar o bloqueio de overselling.'}
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
            <div className="sg-kpi-top">
              <span className="sg-kpi-label">Produtos ativos</span>
              <Layers size={16} />
            </div>
            <div className="sg-kpi-value tabular">{products.length}</div>
            <div className="sg-kpi-hint">SKUs únicos cadastrados</div>
          </div>
          <div className="sg-card">
            <div className="sg-kpi-top">
              <span className="sg-kpi-label">Unidades em estoque</span>
              <Box size={16} />
            </div>
            <div className="sg-kpi-value tabular">{totalUnits}</div>
            <div className="sg-kpi-hint">Saldo físico disponível</div>
          </div>
          <div className="sg-card">
            <div className="sg-kpi-top">
              <span className="sg-kpi-label">Atenção / Críticos</span>
              <AlertTriangle size={16} />
            </div>
            <div className="sg-kpi-value tabular">{lowOrEmptyCount}</div>
            <div className="sg-kpi-hint">Itens com até 3 unidades</div>
          </div>
          <div className="sg-card">
            <div className="sg-kpi-top">
              <span className="sg-kpi-label">Volume vendido</span>
              <Activity size={16} />
            </div>
            <div className="sg-kpi-value tabular">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="sg-kpi-hint">{confirmedOrders.length} pedido(s) confirmados</div>
          </div>
        </section>

        {tab === 'products' && (
          <section className="sg-card" style={{ padding: 0 }}>
            <div className="sg-toolbar">
              <div className="sg-toolbar-left">
                <div className="sg-search">
                  <Search size={15} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="sg-filter-group">
                  <button
                    className={`sg-filter-btn ${stockFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStockFilter('all')}
                  >
                    Todos ({products.length})
                  </button>
                  <button
                    className={`sg-filter-btn ${stockFilter === 'low' ? 'active' : ''}`}
                    onClick={() => setStockFilter('low')}
                  >
                    Críticos ({lowOrEmptyCount})
                  </button>
                </div>
              </div>

              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {filteredProducts.length} exibido(s)
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
                      <th>Nível de Estoque</th>
                      <th style={{ textAlign: 'right' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const barPct = Math.min(100, (product.stockQuantity / 10) * 100);
                      const barColor =
                        product.stockQuantity === 0
                          ? '#ef4444'
                          : product.stockQuantity <= 3
                            ? '#f59e0b'
                            : '#10b981';

                      return (
                        <tr key={product.id}>
                          <td style={{ fontWeight: 600 }}>{product.name}</td>
                          <td className="tabular" style={{ color: 'var(--text-muted)' }}>
                            {product.sku}
                          </td>
                          <td className="tabular">
                            R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td>
                            {getStockBadge(product.stockQuantity)}
                            <div className="sg-stock-bar-wrap">
                              <div
                                className="sg-stock-bar"
                                style={{ width: `${barPct}%`, backgroundColor: barColor }}
                              />
                            </div>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                className="sg-btn sg-btn-sm"
                                title="Testar compras simultâneas neste item"
                                onClick={() => openStressForProduct(product.id)}
                              >
                                <Zap size={13} /> Testar
                              </button>
                              <button
                                className="sg-btn sg-btn-sm"
                                disabled={busyId !== null}
                                onClick={() => void handleQuickRestock(product)}
                              >
                                +5 un.
                              </button>
                              <button
                                className="sg-btn sg-btn-sm sg-btn-primary"
                                disabled={product.stockQuantity === 0 || busyId !== null}
                                onClick={() => void handleQuickBuy(product)}
                              >
                                Comprar 1
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'orders' && (
          <section className="sg-card" style={{ padding: 0 }}>
            <div className="sg-toolbar">
              <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                {orders.length} pedido(s) registrado(s)
              </span>
              <button
                className="sg-btn sg-btn-sm sg-btn-primary"
                disabled={products.length === 0}
                onClick={() => setOrderDrawerOpen(true)}
              >
                <ShoppingCart size={14} /> Novo pedido
              </button>
            </div>
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
                      <th>Status</th>
                      <th>Data</th>
                      <th style={{ textAlign: 'right' }}>Ação</th>
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
                        <td>
                          {order.status === 1 ? (
                            <span className="sg-badge sg-badge-success">Confirmado</span>
                          ) : (
                            <span className="sg-badge sg-badge-danger">Cancelado</span>
                          )}
                        </td>
                        <td className="tabular" style={{ color: 'var(--text-muted)' }}>
                          {new Date(order.createdAtUtc).toLocaleString('pt-BR')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="sg-btn sg-btn-sm"
                            disabled={order.status !== 1 || busyId !== null}
                            onClick={() => void handleCancelOrder(order)}
                          >
                            {order.status === 1 ? 'Cancelar & Estornar' : 'Estornado'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === 'movements' && (
          <section className="sg-card" style={{ padding: 0 }}>
            {movements.length === 0 ? (
              <div className="sg-empty">Nenhuma movimentação registrada ainda.</div>
            ) : (
              <div className="sg-table-wrap">
                <table className="sg-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Produto</th>
                      <th>Variação</th>
                      <th>Referência</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((mov) => {
                      const info = MOVEMENT_LABELS[mov.type] ?? {
                        label: 'Outro',
                        badge: 'sg-badge-neutral',
                      };
                      return (
                        <tr key={mov.id}>
                          <td>
                            <span className={`sg-badge ${info.badge}`}>{info.label}</span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{mov.productName}</td>
                          <td
                            className="tabular"
                            style={{
                              fontWeight: 700,
                              color: mov.quantityDelta > 0 ? '#10b981' : '#f59e0b',
                            }}
                          >
                            {mov.quantityDelta > 0 ? `+${mov.quantityDelta}` : mov.quantityDelta}
                          </td>
                          <td className="tabular" style={{ color: 'var(--text-muted)' }}>
                            {mov.referenceOrderId ? `#${mov.referenceOrderId.slice(0, 8)}` : '—'}
                          </td>
                          <td className="tabular" style={{ color: 'var(--text-muted)' }}>
                            {new Date(mov.createdAtUtc).toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      );
                    })}
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
                marginBottom: '1rem',
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
                      {p.name} (estoque atual: {p.stockQuantity})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sg-field">
                <label>Requisições simultâneas</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {[5, 10, 25, 50].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className={`sg-btn sg-btn-sm ${
                        concurrentCount === preset ? 'sg-btn-primary' : ''
                      }`}
                      onClick={() => setConcurrentCount(preset)}
                    >
                      {preset}x
                    </button>
                  ))}
                </div>
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
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <span className="sg-badge sg-badge-success">
                      201 Aprovadas: {approvedStress}
                    </span>
                    <span className="sg-badge sg-badge-danger">
                      409 Bloqueadas: {conflictStress}
                    </span>
                    {errorStress > 0 && (
                      <span className="sg-badge sg-badge-warning">
                        Outros erros: {errorStress}
                      </span>
                    )}
                  </div>
                  {batchDurationMs !== null && (
                    <span className="tabular" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Lote paralelo concluído em {batchDurationMs} ms
                    </span>
                  )}
                </div>

                <div className="sg-progress-track">
                  <div className="sg-progress-ok" style={{ width: `${approvedPct}%` }} />
                </div>

                <div className="sg-table-wrap">
                  <table className="sg-table">
                    <thead>
                      <tr>
                        <th>Requisição</th>
                        <th>HTTP Status</th>
                        <th>Latência</th>
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

      {orderDrawerOpen && (
        <div className="sg-drawer-backdrop" onClick={() => setOrderDrawerOpen(false)}>
          <form
            className="sg-drawer"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void handleCreateOrder(e)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Novo pedido</h2>
              <button
                type="button"
                className="sg-btn"
                onClick={() => setOrderDrawerOpen(false)}
                aria-label="Fechar"
              >
                <X size={15} />
              </button>
            </div>

            <div className="sg-field">
              <label>Produto</label>
              <select
                required
                value={orderProductId}
                onChange={(e) => setOrderProductId(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (estoque: {p.stockQuantity})
                  </option>
                ))}
              </select>
            </div>

            <div className="sg-field">
              <label>Quantidade</label>
              <input
                required
                type="number"
                min="1"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
              />
            </div>

            <div className="sg-field">
              <label>E-mail do cliente</label>
              <input
                required
                type="email"
                value={orderEmail}
                onChange={(e) => setOrderEmail(e.target.value)}
              />
            </div>

            <button className="sg-btn sg-btn-primary" type="submit" disabled={submittingOrder}>
              {submittingOrder ? 'Confirmando...' : 'Confirmar pedido'}
            </button>
          </form>
        </div>
      )}

      {toast && <div className="sg-toast">{toast}</div>}
    </div>
  );
}

export default App;
