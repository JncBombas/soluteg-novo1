import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_LOGO } from "@/const";
import { Link, useLocation } from "wouter";
import { LogOut, User, CheckCircle, Phone, MessageCircle, Mail, ChevronDown, Zap, Wrench, Shield, Clock } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

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

  const condominiumProblems = [
    {
      problem: "Bombas d'água com falhas frequentes",
      solution: "Manutenção preventiva e corretiva especializada",
      icon: Zap
    },
    {
      problem: "Painéis elétricos desatualizados",
      solution: "Modernização e automação de sistemas",
      icon: Wrench
    },
    {
      problem: "Falta de segurança nas instalações",
      solution: "Instalações elétricas seguras e certificadas",
      icon: Shield
    },
    {
      problem: "Tempo de resposta lento em emergências",
      solution: "Atendimento rápido e equipe disponível",
      icon: Clock
    }
  ];

  const condominiumServices = [
    {
      title: "Manutenção de Bombas d'Água",
      description: "Serviço especializado em manutenção preventiva e corretiva de bombas, garantindo abastecimento contínuo de água no condomínio.",
      features: ["Diagnóstico completo", "Peças originais", "Garantia de serviço"]
    },
    {
      title: "Painéis Elétricos",
      description: "Confecção, instalação e manutenção de painéis elétricos modernos com automação para condomínios.",
      features: ["Tecnologia atualizada", "Segurança garantida", "Eficiência energética"]
    },
    {
      title: "Instalações Elétricas",
      description: "Projetos e instalações elétricas seguras, modernas e em conformidade com as normas técnicas.",
      features: ["Projetos customizados", "Mão-de-obra qualificada", "Certificação"]
    },
    {
      title: "Manutenção de Geradores",
      description: "Manutenção e suporte para geradores de energia de emergência em condomínios.",
      features: ["Testes periódicos", "Peças de reposição", "Suporte 24/7"]
    }
  ];

  const faqItems = [
    {
      question: "Qual é o tempo de resposta para emergências?",
      answer: "Oferecemos atendimento rápido com equipe disponível. Em caso de emergência, nossa resposta é em até 2 horas na região de atuação."
    },
    {
      question: "Vocês trabalham com manutenção preventiva?",
      answer: "Sim! Recomendamos manutenção preventiva regular para evitar problemas maiores. Oferecemos planos customizados para condomínios."
    },
    {
      question: "Quais são as formas de pagamento?",
      answer: "Trabalhamos com boleto, transferência bancária, cartão de crédito e parcelamento conforme combinado com o cliente."
    },
    {
      question: "Vocês atendem condomínios de qualquer tamanho?",
      answer: "Sim! Atendemos condomínios pequenos, médios e grandes. Cada projeto é customizado de acordo com as necessidades específicas."
    },
    {
      question: "Há garantia nos serviços realizados?",
      answer: "Sim, todos os nossos serviços possuem garantia. Oferecemos suporte técnico contínuo após a conclusão do trabalho."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navigation */}
      <header className="bg-black text-white py-4 sticky top-0 z-50 shadow-lg">
        <nav className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={APP_LOGO} alt="JNC Logo" className="h-10" />
            <div className="text-xs">
              <div className="font-semibold">JNC Comércio</div>
              <div className="text-xs text-gray-400">(Soluteg)</div>
            </div>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-6 text-sm">
            <a href="#home" className="hover:text-orange-500 transition-colors">Home</a>
            <a href="#para-condominios" className="hover:text-orange-500 transition-colors">Para Condomínios</a>
            <a href="#servicos" className="hover:text-orange-500 transition-colors">Serviços</a>
            <a href="#por-que-nos" className="hover:text-orange-500 transition-colors">Por Que Nós</a>
            <a href="#faq" className="hover:text-orange-500 transition-colors">Dúvidas</a>
            <a href="#contato" className="hover:text-orange-500 transition-colors font-semibold text-orange-500">Contato</a>
            <Link href="/client/login" className="ml-2">
              <Button variant="outline" size="sm" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
                Portal do Cliente
              </Button>
            </Link>
            {isAdminLoggedIn ? (
              <div className="ml-2 flex items-center gap-2">
                <button
                  onClick={() => setLocation("/admin/dashboard")}
                  className="flex items-center gap-1 px-3 py-1 bg-orange-500/20 rounded text-orange-500 text-xs hover:bg-orange-500/30 transition-colors cursor-pointer"
                >
                  <User className="w-3 h-3" />
                  {adminEmail}
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLogout}
                  className="border-orange-500 text-orange-500 hover:bg-red-500 hover:text-white hover:border-red-500 gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  Sair
                </Button>
              </div>
            ) : (
              <Link href="/admin/login" className="ml-2">
                <Button variant="outline" size="sm" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
                  Área Administrativa
                </Button>
              </Link>
            )}
          </div>
          {/* Mobile Navigation */}
          <div className="lg:hidden flex items-center gap-2">
            <Link href="/client/login">
              <Button variant="outline" size="sm" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white text-xs">
                Cliente
              </Button>
            </Link>
            {isAdminLoggedIn ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleLogout}
                className="border-orange-500 text-orange-500 hover:bg-red-500 hover:text-white hover:border-red-500 text-xs gap-1"
              >
                <LogOut className="w-3 h-3" />
              </Button>
            ) : (
              <Link href="/admin/login">
                <Button variant="outline" size="sm" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white text-xs">
                  Admin
                </Button>
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section - Condomínios Focus */}
      <section id="home" className="bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white py-24 md:py-32">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight">
                Soluções Técnicas para seu Condomínio
              </h1>
              <p className="text-xl text-gray-300 mb-2">Manutenção especializada em bombas, painéis elétricos e instalações</p>
              <p className="text-lg text-gray-400 mb-8">Desde 2017 atendendo condomínios com qualidade e segurança</p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white">
                  <a href="#contato" className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Solicitar Orçamento
                  </a>
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black">
                  <a href="#para-condominios">Saiba Mais</a>
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <img src={APP_LOGO} alt="JNC Logo" className="max-w-md w-full drop-shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Problemas & Soluções para Condomínios */}
      <section id="para-condominios" className="py-20 bg-gray-50">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">Desafios de Condomínios</h2>
          <p className="text-center text-gray-600 mb-12 text-lg">Conhecemos os principais problemas e oferecemos soluções eficientes</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {condominiumProblems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="border-2 border-gray-200 hover:border-orange-500 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <Icon className="w-8 h-8 text-orange-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-2">Problema</h3>
                        <p className="text-gray-700 text-sm mb-3">{item.problem}</p>
                        <p className="text-sm text-orange-600 font-medium">✓ {item.solution}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Serviços Detalhados para Condomínios */}
      <section id="servicos" className="py-20 bg-white">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">Serviços Especializados</h2>
          <p className="text-center text-gray-600 mb-12 text-lg">Tudo que seu condomínio precisa em um único lugar</p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {condominiumServices.map((service, idx) => (
              <Card key={idx} className="border-2 border-gray-200 hover:shadow-lg transition-all">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{service.title}</h3>
                  <p className="text-gray-600 mb-6">{service.description}</p>
                  <ul className="space-y-3">
                    {service.features.map((feature, fidx) => (
                      <li key={fidx} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Por Que Nós */}
      <section id="por-que-nos" className="py-20 bg-gray-900 text-white">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-12">Por Que Escolher a JNC?</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <div className="text-4xl font-bold text-orange-500 mb-3">7+</div>
                <h3 className="text-xl font-semibold mb-2">Anos de Experiência</h3>
                <p className="text-gray-300">Desde 2017 servindo condomínios com excelência</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <div className="text-4xl font-bold text-orange-500 mb-3">100+</div>
                <h3 className="text-xl font-semibold mb-2">Condomínios Atendidos</h3>
                <p className="text-gray-300">Confiança de centenas de síndicos e moradores</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-8 text-center">
                <div className="text-4xl font-bold text-orange-500 mb-3">24/7</div>
                <h3 className="text-xl font-semibold mb-2">Suporte Disponível</h3>
                <p className="text-gray-300">Equipe pronta para emergências a qualquer hora</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 bg-white">
        <div className="container max-w-3xl">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">Dúvidas Frequentes</h2>
          
          <div className="space-y-4">
            {faqItems.map((item, idx) => (
              <Card key={idx} className="border-2 border-gray-200 hover:border-orange-500 transition-colors">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-900">{item.question}</h3>
                  <ChevronDown className={`w-5 h-5 text-orange-500 transition-transform ${expandedFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {expandedFaq === idx && (
                  <div className="px-6 pb-6 border-t-2 border-gray-200">
                    <p className="text-gray-700">{item.answer}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contato" className="py-20 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-4">Entre em Contato</h2>
          <p className="text-center text-lg mb-12 text-orange-100">Solicite um orçamento ou tire suas dúvidas com nossa equipe</p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="bg-white/10 border-white/20 text-center">
              <CardContent className="p-8">
                <Phone className="w-12 h-12 mx-auto mb-4 text-white" />
                <h3 className="text-xl font-semibold mb-2">Telefone</h3>
                <p className="text-orange-100 mb-4">Ligue para nós</p>
                <a href="tel:+55XXXXXXXXXX" className="text-white font-semibold hover:text-orange-100">
                  (XX) XXXX-XXXX
                </a>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-white/20 text-center">
              <CardContent className="p-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-white" />
                <h3 className="text-xl font-semibold mb-2">WhatsApp</h3>
                <p className="text-orange-100 mb-4">Envie uma mensagem</p>
                <a href="https://wa.me/55XXXXXXXXXX" target="_blank" rel="noopener noreferrer" className="text-white font-semibold hover:text-orange-100">
                  Abrir WhatsApp
                </a>
              </CardContent>
            </Card>
            
            <Card className="bg-white/10 border-white/20 text-center">
              <CardContent className="p-8">
                <Mail className="w-12 h-12 mx-auto mb-4 text-white" />
                <h3 className="text-xl font-semibold mb-2">Email</h3>
                <p className="text-orange-100 mb-4">Envie um email</p>
                <a href="mailto:contato@soluteg.com.br" className="text-white font-semibold hover:text-orange-100">
                  contato@soluteg.com.br
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-gray-400 py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <img src={APP_LOGO} alt="JNC Logo" className="h-8" />
              <span className="text-white">JNC Comércio e Serviços Técnicos</span>
            </div>
            <p className="text-sm">© 2017-2024 Todos os direitos reservados. Desenvolvido com ❤️ para condomínios.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
