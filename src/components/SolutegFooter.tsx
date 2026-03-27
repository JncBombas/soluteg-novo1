import { APP_LOGO } from "@/const";
import { Phone, Mail, MessageCircle, MapPin } from "lucide-react";

interface SolutegFooterProps {
  /** Mostrar seção de serviços e contato completa (para landing page) */
  full?: boolean;
}

export function SolutegFooter({ full = true }: SolutegFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300">
      {full && (
        <div className="border-b border-slate-700/60">
          <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Coluna 1 — Marca */}
              <div>
                <img
                  src={APP_LOGO}
                  alt="Soluteg"
                  className="h-14 mb-4 object-contain"
                />
                <p className="text-sm text-slate-400 leading-relaxed">
                  Soluções técnicas especializadas para condomínios. Manutenção
                  de bombas, painéis elétricos e instalações com qualidade e
                  segurança desde 2017.
                </p>
                <div className="flex items-center gap-1 mt-4 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span>Praia Grande / SP — Baixada Santista</span>
                </div>
              </div>

              {/* Coluna 2 — Serviços */}
              <div>
                <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                  Serviços
                </h3>
                <ul className="space-y-2.5 text-sm text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                    Manutenção de Bombas d'Água
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                    Painéis Elétricos
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                    Instalações Elétricas
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                    Manutenção de Geradores
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                    Automação de Sistemas
                  </li>
                </ul>
              </div>

              {/* Coluna 3 — Contato */}
              <div>
                <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                  Contato
                </h3>
                <ul className="space-y-3 text-sm">
                  <li>
                    <a
                      href="tel:+5513981301010"
                      className="flex items-center gap-2.5 text-slate-400 hover:text-amber-400 transition-colors"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      (13) 98130-1010
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://wa.me/message/UIVQB7X2QY2NN1"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-slate-400 hover:text-amber-400 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4 shrink-0" />
                      WhatsApp
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:contato@soluteg.com.br"
                      className="flex items-center gap-2.5 text-slate-400 hover:text-amber-400 transition-colors"
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      contato@soluteg.com.br
                    </a>
                  </li>
                  <li>
                    <a
                      href="mailto:financeiro@soluteg.com.br"
                      className="flex items-center gap-2.5 text-slate-400 hover:text-amber-400 transition-colors"
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      financeiro@soluteg.com.br
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra de copyright */}
      <div className="max-w-6xl mx-auto px-6 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            {!full && (
              <img
                src={APP_LOGO}
                alt="Soluteg"
                className="h-6 object-contain opacity-60"
              />
            )}
            <span>
              © {currentYear} Soluteg — JNC Comércio e Serviços Técnicos. Todos
              os direitos reservados.
            </span>
          </div>
          <span className="text-slate-600">
            Desenvolvido por{" "}
            <span className="text-amber-500 font-medium">Soluteg</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
