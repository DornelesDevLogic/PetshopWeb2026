'use client';

import { useEffect, useRef, useState } from 'react';
import { buscarClientes, buscarPorPetPaginado } from '@/app/(petshop)/agenda/nova/actions';
import { Raca, Especie } from '@/types/petshop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, PawPrint, Search, User, X } from 'lucide-react';

/** Forma mínima em comum entre os "ClienteBuscaItem" de tele-entregas,
 * pré-vendas etc. — qualquer chamador cujo tipo tenha esses campos aceita
 * o valor que este modal devolve (checado estruturalmente pelo TS). */
export interface ClienteBuscaMinimo {
  id:       number;
  filial:   number;
  nome:     string;
  telefone: string;
  celular:  string;
}

interface Props<C extends ClienteBuscaMinimo> {
  termo:    string;
  filial:   number;
  racas:    Raca[];
  especies: Especie[];
  onSelecionarCliente: (c: C) => void;
  onClose: () => void;
}

const PAGINA = 30;

/** Equivalente ao VerTodosResultadosModal (Agenda/Consultas), mas para telas
 * onde a unidade selecionável é o CLIENTE, não o pet (Tele-entrega,
 * Pré-venda) — pet comum (ex: "Amora") ainda pode "esconder" o dono certo
 * atrás do corte de 6/10 da busca rápida; aqui a lista completa (clientes
 * encontrados pelo nome + donos dos pets, deduplicados) pagina e filtra por
 * espécie/raça igual ao modal da Agenda. */
export default function VerTodosClientesPorPetModal<C extends ClienteBuscaMinimo>({
  termo, filial, racas, especies, onSelecionarCliente, onClose,
}: Props<C>) {
  const [especieSel, setEspecieSel] = useState('todas');
  const [carregando, setCarregando] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [clientesPorNome, setClientesPorNome] = useState<ClienteBuscaMinimo[]>([]);
  const [clientesPorPet, setClientesPorPet]   = useState<ClienteBuscaMinimo[]>([]);
  const [hasMore, setHasMore]       = useState(false);
  const skipRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Raça: campo de busca com filtro ao digitar ──
  const [racaId, setRacaId]         = useState('todas');
  const [racaBusca, setRacaBusca]   = useState('');
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

  const racasFiltradas = especieSel === 'todas'
    ? racas
    : racas.filter((r) => String(r.id_especie) === especieSel);
  const racasFiltradasPorBusca = racaBusca.trim()
    ? racasFiltradas.filter((r) => r.descricao.toUpperCase().includes(racaBusca.trim().toUpperCase()))
    : racasFiltradas;

  useEffect(() => {
    if (racaId === 'todas') return;
    if (!racasFiltradas.some((r) => String(r.id) === racaId)) { setRacaId('todas'); setRacaBusca(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [especieSel]);

  function dedupPorId(clientes: ClienteBuscaMinimo[]): ClienteBuscaMinimo[] {
    const vistos = new Set<number>();
    const out: ClienteBuscaMinimo[] = [];
    for (const c of clientes) {
      if (vistos.has(c.id)) continue;
      vistos.add(c.id);
      out.push(c);
    }
    return out;
  }

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
      setClientesPorNome(cli.map((c) => ({ id: c.id, filial: c.filial, nome: c.nome, telefone: c.telefone, celular: c.celular })));
      setClientesPorPet(dedupPorId(pet.dados.map((a) => ({ id: a.id_cliente, filial: a.filial, nome: a.nome_cliente, telefone: '', celular: '' }))));
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
    setClientesPorPet((prev) => dedupPorId([
      ...prev,
      ...pagina.dados.map((a) => ({ id: a.id_cliente, filial: a.filial, nome: a.nome_cliente, telefone: '', celular: '' })),
    ]));
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

  // Cliente achado pelos dois caminhos (nome direto + via pet) não repete
  const idsPorNome = new Set(clientesPorNome.map((c) => c.id));
  const clientesPorPetSemDuplicar = clientesPorPet.filter((c) => !idsPorNome.has(c.id));
  const total = clientesPorNome.length + clientesPorPetSemDuplicar.length;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            Todos os clientes para &quot;{termo}&quot;
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 pb-1 flex-wrap">
          <span className="text-xs text-muted-foreground shrink-0">Filtrar pet por:</span>
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
        <p className="text-[11px] text-muted-foreground -mt-1">
          O filtro de espécie/raça vale só pra clientes achados pelo nome do pet.
        </p>

        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto -mx-6 px-6 divide-y border-t">
          {carregando ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : total === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">Nenhum resultado encontrado.</p>
          ) : (
            <>
              {clientesPorNome.map((c) => (
                <button
                  key={`nome-${c.id}`}
                  type="button"
                  onClick={() => { onSelecionarCliente(c as C); onClose(); }}
                  className="w-full text-left py-2.5 flex items-start gap-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">{c.celular || c.telefone || 'Cliente'}</p>
                  </div>
                </button>
              ))}
              {clientesPorPetSemDuplicar.map((c) => (
                <button
                  key={`pet-${c.id}`}
                  type="button"
                  onClick={() => { onSelecionarCliente(c as C); onClose(); }}
                  className="w-full text-left py-2.5 flex items-start gap-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 mt-0.5">
                    <PawPrint className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{c.nome}</p>
                    <p className="text-xs text-muted-foreground">achado pelo nome de um pet</p>
                  </div>
                </button>
              ))}
              {carregandoMais && (
                <div className="flex items-center justify-center py-3 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              {!carregando && !hasMore && clientesPorPetSemDuplicar.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-3">Fim dos resultados ({total} clientes)</p>
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
