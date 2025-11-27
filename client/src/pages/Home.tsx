import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APP_LOGO } from "@/const";
import { Link, useLocation } from "wouter";
import { LogOut, User } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    // Verificar se admin está logado
    const adminId = localStorage.getItem("adminId");
    const email = localStorage.getItem("adminEmail");
    if (adminId) {
      setIsAdminLoggedIn(true);
      setAdminEmail(email || "Admin");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminId");
    localStorage.removeItem("adminEmail");
    setIsAdminLoggedIn(false);
  };

  const services = [
    {
      number: "01",
      title: "Instalações elétricas",
      description: "A JNC se compromete em estar sempre atualizada para poder oferecer uma mão-de-obra adequada e segura em nossos serviços."
    },
    {
      number: "02",
      title: "Acionamento de bombas e Motores",
      description: "Confecção, instalação e realização de manutenção em painéis de acionamento de diversas tecnologias, oferecendo para o cliente o que há de melhor no mercado, de acordo com sua necessidade"
    },
    {
      number: "03",
      title: "Elétrica e Automação",
      description: "A JNC dispõe de knowhow para atender a demanda do mercado, que está cada vez mais exigente, com a confecção, instalação e manutenção de painéis elétricos e de automação."
    },
    {
      number: "04",
      title: "Montagem e reparo de máquinas",
      description: "Com técnicos experientes para manutenção e instalação de bombas, motores e redutores e etc, a JNC oferece uma mão-de-obra capacitada e treinada para garantir o melhor para os nossos clientes"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Header/Navigation */}
      <header className="bg-black text-white py-4 sticky top-0 z-50">
        <nav className="container flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={APP_LOGO} alt="JNC Logo" className="h-10" />
            <div className="text-xs">
              <div className="font-semibold">JNC Comércio</div>
              <div className="text-xs text-gray-400">(Soluteg)</div>
            </div>
          </div>
          {/* Desktop Navigation - lg and above */}
          <div className="hidden lg:flex items-center gap-4 text-sm">
            <a href="#home" className="hover:text-primary transition-colors">Home</a>
            <a href="#quem-somos" className="hover:text-primary transition-colors">Quem Somos</a>
            <a href="#servicos" className="hover:text-primary transition-colors">Serviços</a>
            <a href="#industria" className="hover:text-primary transition-colors">Indústria</a>
            <a href="#predial" className="hover:text-primary transition-colors">Condomínios</a>
            <a href="#paineis" className="hover:text-primary transition-colors">Painéis</a>
            <a href="#contato" className="hover:text-primary transition-colors">Contato</a>
            {isAdminLoggedIn ? (
              <div className="ml-2 flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1 bg-primary/20 rounded text-primary text-xs">
                  <User className="w-3 h-3" />
                  {adminEmail}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLogout}
                  className="border-primary text-primary hover:bg-red-500 hover:text-white hover:border-red-500 gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  Sair
                </Button>
              </div>
            ) : (
              <Link href="/admin/login" className="ml-2">
                <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-white">
                  Área Administrativa
                </Button>
              </Link>
            )}
          </div>
          {/* Tablet Navigation - md to lg */}
          <div className="hidden md:flex lg:hidden items-center gap-2 text-xs">
            <a href="#home" className="hover:text-primary transition-colors">Home</a>
            <a href="#servicos" className="hover:text-primary transition-colors">Serviços</a>
            <a href="#contato" className="hover:text-primary transition-colors">Contato</a>
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 px-2 py-1 bg-primary/20 rounded text-primary text-xs">
                  <User className="w-3 h-3" />
                  {adminEmail.split("@")[0]}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLogout}
                  className="border-primary text-primary hover:bg-red-500 hover:text-white hover:border-red-500 text-xs gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  Sair
                </Button>
              </div>
            ) : (
              <Link href="/admin/login">
                <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-white text-xs">
                  Admin
                </Button>
              </Link>
            )}
          </div>
          {/* Mobile Navigation */}
          <div className="md:hidden">
            {isAdminLoggedIn ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleLogout}
                className="border-primary text-primary hover:bg-red-500 hover:text-white hover:border-red-500 text-xs gap-1"
              >
                <LogOut className="w-3 h-3" />
                Sair
              </Button>
            ) : (
              <Link href="/admin/login">
                <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-white text-xs">
                  Admin
                </Button>
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section id="home" className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-24 md:py-32">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                JNC Comércio e Serviços Técnicos
              </h1>
              <p className="text-xl text-gray-300 mb-2">Desde 2017</p>
              <div className="mt-8 flex gap-4">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  <a href="#contato">Entre em Contato</a>
                </Button>
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black">
                  <a href="#servicos">Nossos Serviços</a>
                </Button>
              </div>
            </div>
            <div className="flex justify-center">
              <img src={APP_LOGO} alt="JNC Logo" className="max-w-md w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Quem Somos */}
      <section id="quem-somos" className="py-20 bg-white">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-12">Quem somos?</h2>
          <div className="max-w-4xl mx-auto space-y-6 text-lg text-gray-700">
            <p>
              Desde 2017, nós atuamos com a manutenção de equipamentos, Geradores, bombas d'agua, painéis e instalações elétricas dentre outros segmentos. Nossos clientes têm acesso a serviços técnicos e equipamentos desenvolvidos com alta tecnologia.
            </p>
            <p>
              Como uma empresa de serviços técnicos, a JNC constrói estreitas relações com nossos clientes, que fazem os nossos serviços um meio mais eficiente e com o melhor custo-benefício.
            </p>
            <p>
              A JNC oferece serviços de Manutenção e Manufatura na área de Mecânica, Elétrica e Automação Industrial, atendendo em todo território nacional. Com time multidisciplinar qualificado, especializado em Mecatrônica, a empresa oferece serviços de automação industrial, projetos de máquinas, projetos customizados de elétrica e de automação industrial, desenvolvimento e fabricação de painéis elétricos, modificação e adequação de máquinas, desenvolvimento de produtos, dentre outros.
            </p>
            <p className="font-semibold text-gray-900">
              Nós assumimos o compromisso em agir sempre com honestidade, transparência e em conformidade com as normas e leis vigentes, visando construir a credibilidade necessária para ser referência na região.
            </p>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" className="py-20 bg-gray-900 text-white">
        <div className="container">
          <h2 className="text-4xl font-bold text-center mb-4">Serviços Técnicos</h2>
          <p className="text-center text-gray-300 mb-12 text-lg">e com tecnologia industrial aplicada, confira:</p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service) => (
              <Card key={service.number} className="bg-gray-800 border-gray-700 hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold mb-4">
                    {service.number}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-white">{service.title}</h3>
                  <p className="text-gray-300">{service.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Manutenção Industrial */}
      <section id="industria" className="py-20 bg-white">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Manutenção Industrial</h2>
              <p className="text-lg text-gray-700">
                A JNC oferece serviços de Manutenção e Manufatura na área de Elétrica e Automação Industrial, atendendo em todo território nacional. Com time multidisciplinar qualificado, especialidade em Mecatrônica, a empresa oferece serviços de automação industrial, projetos de máquinas, projetos customizados de elétrica e de automação industrial, desenvolvimento e fabricação de painéis elétricos, modificação e adequação de máquinas, desenvolvimento de produtos, dentre outros.
              </p>
            </div>
            <img src="/manutencao_industrial.webp" alt="Manutenção Industrial" className="w-full h-80 object-cover rounded-lg" />
          </div>
        </div>
      </section>

      {/* Manutenção Predial */}
      <section id="predial" className="py-20 bg-gray-50">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <img src="/manutencao_predial.webp" alt="Manutenção Predial" className="w-full h-80 object-cover rounded-lg order-2 md:order-1" />
            <div className="order-1 md:order-2">
              <h2 className="text-4xl font-bold mb-6">Manutenção Predial</h2>
              <p className="text-lg text-gray-700">
                No nosso serviço de manutenção são desempenhadas tarefas relacionadas com a manutenção preventiva, corretiva e preditiva de eletricidade, Bombas d'água, Geradores e derivados
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Painéis */}
      <section id="paineis" className="py-20 bg-white">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Fabricação e Retrofit de Painéis</h2>
              <p className="text-lg text-gray-700">
                A JNC (Soluteg) dispõe de knowhow para atender a demanda do mercado, que está cada vez mais exigente, com a confecção, instalação e retrofit de painéis elétricos.
              </p>
            </div>
            <img src="/paineis_eletricos.webp" alt="Painéis Elétricos" className="w-full h-80 object-cover rounded-lg" />
          </div>
        </div>
      </section>

      {/* Contato */}
      <section id="contato" className="py-20 bg-primary text-white">
        <div className="container text-center">
          <h2 className="text-4xl font-bold mb-6">Entre em contato agora mesmo!</h2>
          <p className="text-xl mb-8">Estamos prontos para atender suas necessidades</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:contato@soluteg.com.br" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-gray-100 w-full">
                Enviar Mensagem
              </Button>
            </a>
            <a href="https://wa.me/message/UIVQB7X2QY2NN1" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary w-full">
                WhatsApp
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <img src={APP_LOGO} alt="JNC Logo" className="h-16 mb-4" />
              <p className="text-gray-400">JNC Comércio e Serviços Técnicos</p>
              <p className="text-gray-400 text-sm">Desde 2017</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Serviços</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Instalações Elétricas</li>
                <li>Manutenção Industrial</li>
                <li>Manutenção Predial</li>
                <li>Painéis Elétricos</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contato</h3>
              <p className="text-gray-400">Atendimento em todo território nacional</p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2024 JNC Comércio e Serviços Técnicos (Soluteg). Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
