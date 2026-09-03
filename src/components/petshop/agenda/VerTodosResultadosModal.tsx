'use client';

import { useEffect, useRef, useState } from 'react';
import { buscarClientes, buscarPorPetPaginado, type AnimalBuscaItem } from '@/app/(petshop)/agenda/nova/actions';
import { Cliente, Raca, Especie } from '@/types/petshop';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, PawPrint, Search, User, X } from 'lucide-react';
import MicrochipBadge from '@/components/petshop/animais/MicrochipBadge';

interface Props {
  termo:    string;
  filial:   number;
  racas:    Raca[];
  especies: Especie[];
  onSelecionarCliente: (c: Cliente) => void;
  onSelecionarPet:     (a: AnimalBuscaItem) => void;
  onClose: () => void;
}

const PAGINA = 30;

/** Lista completa de clientes/pets que batem com o termo digitado na busca
 * rápida — usada quando o nome é comum (ex: "Amora", às vezes 100+
 * cadastrados) e a busca rápida (limitada a 6 de cada, ver
 * NovoAgendamentoForm) não mostra todo mundo. Filtros de espécie/raça (por
 * TEXTO - ver buscarPorPetPaginado) + rolagem infinita ajudam a achar o pet
 * certo sem precisar trazer tudo de uma vez. */
export default function VerTodosResultadosModal({ termo, filial, racas, especies, onSelecionarCliente, onSelecionarPet, onClose }: Props) {
  const [especieSel, setEspecieSel] = useState('todas');
  const [racaId, setRacaId]         = useState('todas');
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [clientes, setClientes]     = useState<Cliente[]>([]);
  const [pets, setPets]             = useState<AnimalBuscaItem[]>([]);
  const [hasMore, setHasMore]       = useState(false);
  const skipRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Raça: campo de busca com filtro ao digitar (não dropdown fixo — a
  // lista de raças costuma ser grande) ──
  const [racaBusca, setRacaBusca]           = useState('');
  const [racaDropdownAberto, setRacaDropdownAberto] = useState(false);
  const racaWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (racaWrapRef.current && !racaWrapRef.current.contains(e.target as Node)) {
        setRacaDropdownAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // Raças filtradas pela espécie escolhida (mesmo padrão de qualquer combo
  // dependente espécie→raça já usado no resto do app)
  const racasFiltradas = especieSel === 'todas'
    ? racas
    : racas.filter((r) => String(r.id_especie) === especieSel);

  const racasFiltradasPorBusca = racaBusca.trim()
    ? racasFiltradas.filter((r) => r.descricao.toUpperCase().includes(racaBusca.trim().toUpperCase()))
    : racasFiltradas;

  // Zera a raça selecionada se ela não pertencer mais à espécie escolhida
  useEffect(() => {
    if (racaId === 'todas') return;
    if (!racasFiltradas.some((r) => String(r.id) === racaId)) { setRacaId('todas'); setRacaBusca(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especieSel]);

  // Recarrega do zero quando o termo ou os filtros mudam
  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    skipRef.current = 0;
    const racaTxt    = racaId !== 'todas' ? racas.find((r) => String(r.id) === racaId)?.descricao : undefined;
    const especieTxt = especieSel !== 'todas' ? especies.find((e) => String(e.id) === especieSel)?.descricao : undefined;
    Promise.all([
      buscarClientes(termo, filial),
      buscarPorPetPaginado(termo, filial, racaTxt, especieTxt, 0, PAGINA),
    ]).then(([cli, pet]) => {
      if (cancelado) return;
      setClientes(cli);
      setPets(pet.dados);
      setHasMore(pet.hasMore);
      skipRef.current = pet.dados.length ? PAGINA : 0;
      setCarregando(false);
    });
    return () => { cancelado = true; };
  }, [termo, filial, racaId, especieSel, racas, especies]);

  async function carregarMais() {
    if (carregandoMais || !hasMore) return;
    setCarregandoMais(true);
    const racaTxt    = racaId !== 'todas' ? racas.find((r) => String(r.id) === racaId)?.descricao : undefined;
    const especieTxt = especieSel !== 'todas' ? especies.find((e) => String(e.id) === especieSel)?.descricao : undefined;
    const pagina = await buscarPorPetPaginado(termo, filial, racaTxt, especieTxt, skipRef.current, PAGINA);
    setPets((prev) => [...prev, ...pagina.dados]);
    setHasMore(pagina.hasMore);
    skipRef.current += PAGINA;
    setCarregandoMais(false);
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || carregando) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 80) {
      carregarMais();
    }
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Todos os resultados para &quot;{termo}&quot;
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-1 flex-wrap">
          <span className="text-xs text-muted-foreground shrink-0">Filtrar por:</span>
          <Select value={especieSel} onValueChange={(v) => setEspecieSel(v ?? 'todas')}
            items={[{ value: 'todas', label: 'Todas as espécies' }, ...especies.map((e) => ({ value: String(e.id), label: e.descricao }))]}>
            <SelectTrigger className="h-8 text-sm w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as espécies</SelectItem>
              {especies.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.descricao}</SelectItem>)}
            </SelectContent>
          </Select>
          <div ref={racaWrapRef} className="relative flex-1 min-w-[9rem]">
            <Input
              value={racaBusca}
              onChange={(e) => { setRacaBusca(e.target.value); setRacaId('todas'); setRacaDropdownAberto(true); }}
              onFocus={() => setRacaDropdownAberto(true)}
              placeholder="Todas as raças"
              className="h-8 text-sm pr-7"
            />
            {(racaBusca || racaId !== 'todas') && (
              <button
                type="button"
                onClick={() => { setRacaBusca(''); setRacaId('todas'); setRacaDropdownAberto(false); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {racaDropdownAberto && racasFiltradasPorBusca.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-md border bg-popover shadow-lg">
                {racasFiltradasPorBusca.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setRacaId(String(r.id)); setRacaBusca(r.descricao); setRacaDropdownAberto(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent border-b last:border-b-0"
                  >
                    {r.descricao}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto -mx-6 px-6 divide-y border-t">
          {carregando ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : clientes.length === 0 && pets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhum resultado encontrado.</p>
          ) : (
            <>
              {clientes.map((c) => (
                <button
                  key={`cli-${c.id}`}
                  type="button"
                  onClick={() => { onSelecionarCliente(c); onClose(); }}
                  className="w-full text-left py-2.5 flex items-start gap-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">{c.celular || c.telefone || c.cpf_cnpj || 'Cliente'}</p>
                  </div>
                </button>
              ))}
              {pets.map((a, i) => (
                <button
                  key={`pet-${a.id}-${i}`}
                  type="button"
                  onClick={() => { onSelecionarPet(a); onClose(); }}
                  className="w-full text-left py-2.5 flex items-start gap-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 mt-0.5">
                    <PawPrint className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      {a.nome}
                      <MicrochipBadge value={a.apelido} className="text-[11px]" />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[a.especie, a.raca].filter(Boolean).join(' · ')}
                      {' — '}
                      <span className="font-medium text-foreground/70">{a.nome_cliente}</span>
                    </p>
                  </div>
                </button>
              ))}
              {carregandoMais && (
                <div className="flex items-center justify-center py-3 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              {!carregando && !hasMore && pets.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-3">
                  Fim dos resultados ({pets.length} pets{clientes.length ? ` + ${clientes.length} clientes` : ''})
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
