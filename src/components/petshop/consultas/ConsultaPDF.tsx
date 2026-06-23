import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet,
} from '@react-pdf/renderer';
import { ConsultaDetalhe, Animal, Cliente, DadosEmpresa, AnexoExame } from '@/types/petshop';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111',
    paddingTop: 28,
    paddingBottom: 48,
    paddingHorizontal: 36,
  },
  header: {
    borderBottom: '1.5 solid #1a56db',
    paddingBottom: 8,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  // espaço reservado para o logo (quando houver coluna no banco)
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 4,
    border: '0.75 solid #cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: { width: 56, height: 56, objectFit: 'contain' },
  logoPlaceholder: { fontSize: 6, color: '#94a3b8', textAlign: 'center' },
  empresa: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1a3a8f' },
  empresaSub: { fontSize: 7.5, color: '#555', marginTop: 2, maxWidth: 280 },
  docTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1a3a8f', textAlign: 'right' },
  docMeta: { fontSize: 7.5, color: '#555', textAlign: 'right', marginTop: 2 },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1a56db',
    backgroundColor: '#eff6ff',
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginBottom: 5,
    borderRadius: 2,
  },
  grid2: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  fieldRow: { flexDirection: 'row', marginBottom: 3 },
  fieldLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#555', width: 78 },
  fieldValue: { fontSize: 8.5, flex: 1 },
  bloco: { marginBottom: 6 },
  blocoLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#475569', marginBottom: 1.5 },
  blocoText: { fontSize: 8.5, color: '#111', lineHeight: 1.35 },
  divider: { borderBottom: '0.5 solid #e2e8f0', marginVertical: 6 },
  anexoItem: { fontSize: 8, color: '#333', marginBottom: 2 },
  assinatura: { marginTop: 34, alignItems: 'center' },
  assinaturaLine: { width: 220, borderTop: '0.75 solid #111', marginBottom: 4 },
  assinaturaText: { fontSize: 7.5, color: '#555', textAlign: 'center' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    borderTop: '0.75 solid #cbd5e1',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: '#94a3b8' },
});

interface Props {
  empresa:     DadosEmpresa;
  consulta:    ConsultaDetalhe;
  animal:      Animal | null;
  cliente:     Cliente | null;
  anexos:      AnexoExame[];
  protocolo:   string;
  dataGeracao: string;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}:</Text>
      <Text style={styles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

function Bloco({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.bloco}>
      <Text style={styles.blocoLabel}>{label}</Text>
      <Text style={styles.blocoText}>{value}</Text>
    </View>
  );
}

function fmtData(s: string) {
  if (!s) return '—';
  if (s.includes('/')) return s.slice(0, 10);
  const [y, m, d] = s.split('-');
  return d ? `${d}/${m}/${y}` : s;
}

function fmtSexo(s: string) {
  if (s === 'M') return 'Macho';
  if (s === 'F') return 'Fêmea';
  return s || '—';
}

export default function ConsultaPDF({
  empresa, consulta: c, animal, cliente, anexos, protocolo, dataGeracao,
}: Props) {
  const endEmpresa = [
    [empresa.endereco, empresa.numero].filter(Boolean).join(', '),
    empresa.bairro, empresa.cidade, empresa.uf,
  ].filter(Boolean).join(' - ');
  const contato = [empresa.fone || empresa.celular, empresa.email].filter(Boolean).join('  |  ');

  return (
    <Document title={`Consulta #${c.id} - ${animal?.nome ?? ''}`} author={empresa.nome} creator="PetShop Web">
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho com espaço para logo */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoBox}>
              {empresa.logo_base64 ? (
                // eslint-disable-next-line jsx-a11y/alt-text -- Image do @react-pdf/renderer não aceita alt
                <Image style={styles.logoImg} src={`data:${empresa.logo_mime || 'image/jpeg'};base64,${empresa.logo_base64}`} />
              ) : (
                <Text style={styles.logoPlaceholder}>LOGO</Text>
              )}
            </View>
            <View>
              <Text style={styles.empresa}>{empresa.fantasia || empresa.nome || 'PetShop'}</Text>
              {endEmpresa ? <Text style={styles.empresaSub}>{endEmpresa}</Text> : null}
              {contato ? <Text style={styles.empresaSub}>{contato}</Text> : null}
              {empresa.cnpj ? <Text style={styles.empresaSub}>CNPJ: {empresa.cnpj}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={styles.docTitle}>CONSULTA VETERINÁRIA</Text>
            <Text style={styles.docMeta}>Nº {c.id}  —  {fmtData(c.data)}</Text>
            <Text style={styles.docMeta}>Protocolo: {protocolo}</Text>
            <Text style={styles.docMeta}>Emitido em: {dataGeracao}</Text>
          </View>
        </View>

        {/* Paciente e tutor */}
        <View style={styles.grid2}>
          <View style={[styles.section, styles.col]}>
            <Text style={styles.sectionTitle}>DADOS DO PACIENTE</Text>
            <Field label="Nome"       value={animal?.nome ?? c.animal} />
            <Field label="Espécie"    value={animal?.especie} />
            <Field label="Raça"       value={animal?.raca} />
            <Field label="Sexo"       value={animal ? fmtSexo(animal.sexo) : undefined} />
            <Field label="Nascimento" value={animal ? fmtData(animal.data_nascimento) : undefined} />
            <Field label="Peso"       value={c.peso ? `${c.peso} kg` : undefined} />
            <Field label="Temp."      value={c.temperatura ? `${c.temperatura} °C` : undefined} />
          </View>
          <View style={[styles.section, styles.col]}>
            <Text style={styles.sectionTitle}>DADOS DO TUTOR</Text>
            <Field label="Nome"     value={cliente?.nome ?? c.proprietario} />
            <Field label="CPF/CNPJ" value={cliente?.cpf_cnpj} />
            <Field label="Fone"     value={cliente?.celular || cliente?.telefone} />
            <Field label="E-mail"   value={cliente?.email} />
            <Field label="Vet."     value={c.veterinario} />
          </View>
        </View>

        <View style={styles.divider} />

        {/* Conteúdo clínico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ATENDIMENTO</Text>
          <Bloco label="Motivo / Queixa Principal" value={c.motivo} />
          <Bloco label="Observações Gerais"        value={c.obs_gerais} />
          <Bloco label="Diagnóstico Provisório"    value={c.diagnostico} />
          <Bloco label="Diagnóstico Definitivo"    value={c.diagnostico_def} />
          <Bloco label="Prognóstico"               value={c.prognostico} />
          <Bloco label="Prescrição"                value={c.prescricao} />
          <Bloco label="Observações Adicionais"    value={c.texto} />
        </View>

        {/* Anexos */}
        {anexos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EXAMES ANEXADOS ({anexos.length})</Text>
            {anexos.map((a) => (
              <Text key={a.id} style={styles.anexoItem}>
                • {a.nome || `Anexo ${a.id}`}  {a.data ? `(${fmtData(a.data)})` : ''}
              </Text>
            ))}
          </View>
        )}

        {/* Assinatura */}
        <View style={styles.assinatura}>
          <View style={styles.assinaturaLine} />
          <Text style={styles.assinaturaText}>{c.veterinario || 'Médico(a) Veterinário(a)'}</Text>
          <Text style={[styles.assinaturaText, { marginTop: 2 }]}>CRMV: _______________</Text>
        </View>

        {/* Rodapé */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{empresa.fantasia || empresa.nome || 'PetShop'} — Consulta Veterinária</Text>
          <Text style={styles.footerText}>Protocolo {protocolo}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
