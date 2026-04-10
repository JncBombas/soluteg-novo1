import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_LOGO } from "@/const";
import { Link, useLocation } from "wouter";
import { SolutegFooter } from "@/components/SolutegFooter";
import {
  LogOut,
  User,
  CheckCircle,
  MessageCircle,
  ChevronDown,
  Zap,
  Wrench,
  Shield,
  Clock,
  Menu,
  X,
  HardHat,
  Users,
} from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const adminId = localStorage.getItem("adminId");
    const email = localStorage.getItem("adminEmail");
    const customLabel = localStorage.getItem("adminCustomLabel");
    if (adminId) {
      setIsAdminLoggedIn(true);
      setAdminEmail(customLabel || email || "Admin");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminId");
    localStorage.removeItem("adminEmail");
    setIsAdminLoggedIn(false);
  };

  const problems = [
    {
      problem: "Bombas d'água com falhas frequentes",
      solution: "Manutenção preventiva e corretiva especializada",
      icon: Zap,
    },
    {
      problem: "Painéis elétricos desatualizados",
      solution: "Modernização e automação de sistemas",
      icon: Wrench,
    },
    {
      problem: "Falta de segurança nas instalações",
      solution: "Instalações elétricas seguras e certificadas",
      icon: Shield,
    },
    {
      problem: "Tempo de resposta lento em emergências",
      solution: "Atendimento rápido e equipe disponível",
      icon: Clock,
    },
  ];

  const services = [
    {
      title: "Manutenção de Bombas d'Água",
      description:
        "Serviço especializado em manutenção preventiva e corretiva de bombas, garantindo abastecimento contínuo de água no condomínio.",
      features: ["Diagnóstico completo", "Peças originais", "Garantia de serviço"],
    },
    {
      title: "Painéis Elétricos",
      description:
        "Confecção, instalação e manutenção de painéis elétricos modernos com automação para condomínios.",
      features: ["Tecnologia atualizada", "Segurança garantida", "Eficiência energética"],
    },
    {
      title: "Instalações Elétricas",
      description:
        "Projetos e instalações elétricas seguras, modernas e em conformidade com as normas técnicas.",
      features: ["Projetos customizados", "Mão-de-obra qualificada", "Certificação"],
    },
    {
      title: "Manutenção de Geradores",
      description:
        "Manutenção e suporte para geradores de energia de emergência em condomínios.",
      features: ["Testes periódicos", "Peças de reposição", "Suporte 24/7"],
    },
  ];

  const faqItems = [
    {
      question: "Qual é o tempo de resposta para emergências?",
      answer:
        "Oferecemos atendimento rápido com equipe disponível. Em caso de emergência, nossa resposta é em até 2 horas na região de atuação.",
    },
    {
      question: "Vocês trabalham com manutenção preventiva?",
      answer:
        "Sim! Recomendamos manutenção preventiva regular para evitar problemas maiores. Oferecemos planos customizados para condomínios.",
    },
    {
      question: "Quais são as formas de pagamento?",
      answer:
        "Trabalhamos com boleto, transferência bancária, cartão de crédito e parcelamento conforme combinado com o cliente.",
    },
    {
      question: "Vocês atendem condomínios de qualquer tamanho?",
      answer:
        "Sim! Atendemos condomínios pequenos, médios e grandes. Cada projeto é customizado de acordo com as necessidades específicas.",
    },
    {
      question: "Há garantia nos serviços realizados?",
      answer:
        "Sim, todos os nossos serviços possuem garantia. Oferecemos suporte técnico contínuo após a conclusão do trabalho.",
    },
  ];

  const navLinks = [
    { label: "Início", href: "#home" },
    { label: "Para Condomínios", href: "#para-condominios" },
    { label: "Serviços", href: "#servicos" },
    { label: "Por Que Nós", href: "#por-que-nos" },
    { label: "Dúvidas", href: "#faq" },
    { label: "Contato", href: "#contato" },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── HEADER ──────────────────────────────────────── */}
      <header className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg border-b border-slate-800">
        <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <img src={APP_LOGO} alt="Soluteg" className="h-9 object-contain" />
            <div className="leading-tight">
              <div className="font-bold text-sm text-white">Soluteg</div>
              <div className="text-[10px] text-slate-400">JNC Comércio e Serviços Técnicos</div>
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-6 text-sm">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-slate-300 hover:text-amber-400 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-500/60 text-amber-400 hover:bg-amber-500 hover:text-slate-900 hover:border-amber-500 transition-all gap-1.5"
                >
                  <Users className="w-3.5 h-3.5" />
                  Portais
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => window.location.href = "/client/login"} className="gap-2 cursor-pointer">
                  <User className="w-4 h-4" />
                  Portal do Cliente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = "/technician/login"} className="gap-2 cursor-pointer">
                  <HardHat className="w-4 h-4" />
                  Portal do Técnico
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLocation("/gestor/dashboard")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 rounded-lg text-amber-400 text-xs hover:bg-amber-500/25 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  {adminEmail}
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLogout}
                  className="border-slate-600 text-slate-300 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair
                </Button>
              </div>
            ) : (
              <Link href="/gestor/login">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 transition-all"
                >
                  Área Administrativa
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-6 py-4 space-y-3">
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-slate-300 hover:text-amber-400 text-sm py-1 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <Link href="/client/login" className="flex-1">
                <Button size="sm" variant="outline" className="w-full border-slate-600 text-slate-300 gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  Portal do Cliente
                </Button>
              </Link>
              <Link href="/technician/login">
                <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 gap-1.5">
                  <HardHat className="w-3.5 h-3.5" />
                  Técnico
                </Button>
              </Link>
              {isAdminLoggedIn ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => { setLocation("/gestor/dashboard"); setMobileMenuOpen(false); }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-900 gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    Dashboard
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleLogout}
                    className="border-slate-600 text-slate-300 gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair
                  </Button>
                </div>
              ) : (
                <Link href="/gestor/login">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                  >
                    Admin
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────── */}
      <section
        id="home"
        className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white py-24 md:py-36"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-14 items-center">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-amber-400 mb-6 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20">
                Especialistas em Condomínios
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-5">
                Soluções Técnicas para seu{" "}
                <span className="text-amber-400">Condomínio</span>
              </h1>
              <p className="text-lg text-slate-300 mb-2">
                Manutenção especializada em bombas, painéis elétricos e instalações.
              </p>
              <p className="text-slate-400 mb-10">
                Desde 2017 atendendo condomínios com qualidade, segurança e agilidade.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="#contato">
                  <Button
                    size="lg"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Solicitar Orçamento
                  </Button>
                </a>
                <a href="#servicos">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:border-slate-500"
                  >
                    Nossos Serviços
                  </Button>
                </a>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/10 blur-3xl rounded-full scale-75" />
                <img
                  src={APP_LOGO}
                  alt="Soluteg"
                  className="relative max-w-xs w-full drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────── */}
      <section className="bg-amber-500 py-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { value: "7+", label: "Anos de Experiência" },
              { value: "100+", label: "Condomínios Atendidos" },
              { value: "24/7", label: "Suporte Disponível" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-bold text-slate-900">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-800 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEMAS & SOLUÇÕES ────────────────────────── */}
      <section id="para-condominios" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Desafios de Condomínios
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Conhecemos os principais problemas e oferecemos soluções eficientes
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {problems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card
                  key={idx}
                  className="border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all group"
                >
                  <CardContent className="p-6">
                    <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4 group-hover:bg-amber-100 transition-colors">
                      <Icon className="w-5 h-5 text-amber-600" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 mb-2">
                      {item.problem}
                    </p>
                    <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      {item.solution}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SERVIÇOS ────────────────────────────────────── */}
      <section id="servicos" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Serviços Especializados
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Tudo que seu condomínio precisa em um único lugar
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {services.map((service, idx) => (
              <Card
                key={idx}
                className="border border-slate-200 hover:shadow-lg hover:border-amber-200 transition-all"
              >
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-slate-500 text-sm mb-5 leading-relaxed">
                    {service.description}
                  </p>
                  <ul className="space-y-2.5">
                    {service.features.map((feature, fidx) => (
                      <li key={fidx} className="flex items-center gap-2.5">
                        <CheckCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-sm text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── POR QUE NÓS ─────────────────────────────────── */}
      <section id="por-que-nos" className="py-20 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Por Que Escolher a{" "}
              <span className="text-amber-400">Soluteg</span>?
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              Compromisso com qualidade, segurança e satisfação do cliente
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                value: "7+",
                title: "Anos de Experiência",
                desc: "Desde 2017 servindo condomínios com excelência e dedicação.",
              },
              {
                value: "100+",
                title: "Condomínios Atendidos",
                desc: "Confiança de centenas de síndicos e moradores satisfeitos.",
              },
              {
                value: "24/7",
                title: "Suporte Disponível",
                desc: "Equipe pronta para emergências a qualquer hora do dia.",
              },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="bg-slate-800 border-slate-700 hover:border-amber-500/40 transition-all"
              >
                <CardContent className="p-8 text-center">
                  <div className="text-4xl font-bold text-amber-400 mb-2">
                    {item.value}
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-400 text-sm">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              Dúvidas Frequentes
            </h2>
            <p className="text-slate-500">
              Respondemos as perguntas mais comuns dos nossos clientes
            </p>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-amber-300 transition-colors"
              >
                <button
                  onClick={() =>
                    setExpandedFaq(expandedFaq === idx ? null : idx)
                  }
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="text-sm font-semibold text-slate-800 pr-4">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-amber-500 shrink-0 transition-transform ${
                      expandedFaq === idx ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expandedFaq === idx && (
                  <div className="px-6 pb-5 border-t border-slate-100">
                    <p className="text-sm text-slate-600 pt-3 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA / CONTATO ───────────────────────────────── */}
      <section
        id="contato"
        className="py-20 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-900"
      >
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Entre em Contato
            </h2>
            <p className="text-amber-900/70 max-w-lg mx-auto">
              Solicite um orçamento ou tire suas dúvidas com nossa equipe especializada
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            <Card className="bg-white/20 border-white/30 backdrop-blur-sm">
              <CardContent className="p-7 text-center">
                <div className="h-12 w-12 bg-white/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="font-bold mb-1">Telefone</h3>
                <p className="text-amber-900/60 text-sm mb-3">Ligue para nós</p>
                <a
                  href="tel:+5513981301010"
                  className="font-semibold hover:underline"
                >
                  (13) 98130-1010
                </a>
              </CardContent>
            </Card>

            <Card className="bg-white/20 border-white/30 backdrop-blur-sm">
              <CardContent className="p-7 text-center">
                <div className="h-12 w-12 bg-white/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="font-bold mb-1">WhatsApp</h3>
                <p className="text-amber-900/60 text-sm mb-3">Resposta rápida</p>
                <a
                  href="https://wa.me/message/UIVQB7X2QY2NN1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline"
                >
                  Abrir WhatsApp
                </a>
              </CardContent>
            </Card>

            <Card className="bg-white/20 border-white/30 backdrop-blur-sm">
              <CardContent className="p-7 text-center">
                <div className="h-12 w-12 bg-white/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-bold mb-1">E-mail</h3>
                <p className="text-amber-900/60 text-sm mb-3">Envie uma mensagem</p>
                <a
                  href="mailto:contato@soluteg.com.br"
                  className="font-semibold hover:underline text-sm"
                >
                  contato@soluteg.com.br
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <SolutegFooter full={true} />
    </div>
  );
}
