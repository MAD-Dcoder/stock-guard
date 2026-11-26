import { useNavigate } from 'react-router-dom';
import { FiShield, FiZap, FiDatabase, FiGitBranch } from 'react-icons/fi';
import { FundoEstelar } from '../components/FundoEstelar';
import './Welcome.css';

export function Welcome() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <FundoEstelar>
      <div className="welcome-container">
        <div className="welcome-hero-wrapper">
          <header className="welcome-header">
            <div className="welcome-logo">
              <span>STOCKGUARD</span>
              <span className="welcome-logo-badge">.NET 10 + TS</span>
            </div>
            <nav className="welcome-desktop-nav">
              <span onClick={() => scrollToSection('funcionalidades')}>Garantias ACID</span>
              <span onClick={() => scrollToSection('arquitetura')}>Arquitetura</span>
              <a
                href="https://github.com/MAD-Dcoder/stock-guard"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              <span className="nav-login-btn" onClick={() => navigate('/painel')}>
                Abrir Painel
              </span>
            </nav>
          </header>

          <main className="welcome-main">
            <div className="welcome-text-content">
              <h1 className="welcome-title">
                Seu estoque.
                <br />
                Zero overselling.
                <br />
                <span className="welcome-title-accent">Seu StockGuard.</span>
              </h1>
              <p className="welcome-subtitle">
                Controle de estoque projetado para resistir a compras simultâneas. Transações
                atômicas no PostgreSQL, proteção contra condições de corrida e testes reais de
                concorrência em um só lugar.
              </p>
            </div>

            <div className="welcome-bottom-sheet">
              <h2 className="welcome-box-title">Explorar o sistema</h2>

              <button className="welcome-btn-primary" onClick={() => navigate('/painel')}>
                Acessar Painel de Estoque
              </button>

              <div className="sso-divider">ou</div>

              <button
                className="welcome-btn-secondary"
                onClick={() => scrollToSection('funcionalidades')}
              >
                Ver como evitamos Race Conditions
              </button>
            </div>
          </main>
        </div>

        <div className="desktop-extra-content">
          <section id="funcionalidades" className="welcome-section">
            <h2 className="section-title">Por que o StockGuard vai além de um CRUD?</h2>
            <div className="features-grid">
              <div className="feature-card">
                <FiZap className="feature-icon" />
                <h3>Proteção contra Concorrência</h3>
                <p>
                  Se dois clientes clicam em comprar na última unidade ao mesmo tempo, apenas uma
                  requisição efetiva a baixa no banco — a outra recebe conflito controlado (409).
                </p>
              </div>
              <div className="feature-card">
                <FiDatabase className="feature-icon" />
                <h3>Transações ACID no PostgreSQL</h3>
                <p>
                  A redução do estoque e o registro do pedido acontecem na mesma transação. Se
                  qualquer etapa falhar, o rollback automático mantém o saldo íntegro.
                </p>
              </div>
              <div className="feature-card">
                <FiShield className="feature-icon" />
                <h3>Testes Reais &amp; CI</h3>
                <p>
                  Suíte automatizada em xUnit simulando compras paralelas contra o banco real,
                  validada automaticamente a cada push no GitHub Actions.
                </p>
              </div>
            </div>
          </section>

          <section id="arquitetura" className="welcome-section about-section">
            <div className="about-content">
              <h2 className="section-title">
                <FiGitBranch style={{ marginRight: '0.6rem', verticalAlign: 'middle' }} />
                Qual a ideia por trás do StockGuard?
              </h2>
              <p>
                Idealizado e construído por Matheus Aurélio (MAD-Dcoder) como parte da jornada de
                engenharia backend e fullstack, o StockGuard foca no problema que mais derruba
                sistemas de vendas reais: inconsistência de dados sob carga simultânea. A API é
                estruturada em camadas limpas com .NET 10, Entity Framework Core e PostgreSQL,
                enquanto o painel usa React com TypeScript estrito.
              </p>
              <div className="tech-pills">
                <span className="tech-pill">C# / .NET 10</span>
                <span className="tech-pill">PostgreSQL 16</span>
                <span className="tech-pill">Entity Framework Core</span>
                <span className="tech-pill">React + TypeScript</span>
                <span className="tech-pill">Docker Compose</span>
                <span className="tech-pill">xUnit Concurrency Tests</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </FundoEstelar>
  );
}
