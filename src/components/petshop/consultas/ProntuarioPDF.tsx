import React from 'react';
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from '@react-pdf/renderer';
import { ConsultaDetalhe, Animal, Cliente } from '@/types/petshop';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111',
    paddingTop: 32,
    paddingBottom: 48,
    paddingHorizontal: 36,
  },
  // Header
  header: {
    borderBottom: '1.5 solid #1a56db',
    paddingBottom: 8,
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  empresa: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#1a3a8f',
  },
  empresaSub: {
    fontSize: 8,
    color: '#555',
    marginTop: 2,
  },
  docTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#1a3a8f',
    textAlign: 'right',
  },
  docMeta: {
    fontSize: 7.5,
    color: '#555',
    textAlign: 'right',
    marginTop: 2,
  },
  // Seção
  section: {
    marginBottom: 10,
  },
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
  // Campos em grade
  grid2: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  fieldLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#555',
    width: 80,
  },
  fieldValue: {
    fontSize: 8.5,
    flex: 1,
  },
  // Consulta card
  consultaCard: {
    border: '0.75 solid #cbd5e1',
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  consultaHeader: {
    backgroundColor: '#f1f5f9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  consultaHeaderText: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  consultaBody: {
    padding: 8,
    gap: 5,
  },
  consultaField: {
    marginBottom: 4,
  },
  consultaFieldLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#475569',
    marginBottom: 1.5,
  },
  consultaFieldText: {
    fontSize: 8.5,
    color: '#111',
    lineHeight: 1.35,
  },
  consultaGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  consultaCol: {
    flex: 1,
  },
  // Footer
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
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },
  // Assinatura
  assinatura: {
    marginTop: 30,
    alignItems: 'center',
  },
  assinaturaLine: {
    width: 220,
    borderTop: '0.75 solid #111',
    marginBottom: 4,
  },
  assinaturaText: {
    fontSize: 7.5,
    color: '#555',
    textAlign: 'center',
  },
  divider: {
    borderBottom: '0.5 solid #e2e8f0',
    marginVertical: 6,
  },
});

interface Props {
  empresa:      string;
  protocolo:    string;
  dataGeracao:  string;
  animal:       Animal;
  cliente:      Cliente;
  consultas:    ConsultaDetalhe[];
  tipo:         'completo' | 'resumido';
  periodo:      string;
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

export default function ProntuarioPDF({
  empresa,
  protocolo,
  dataGeracao,
  animal,
  cliente,
  consultas,
  tipo,
  periodo,
}: Props) {
  return (
    <Document
      title={`Prontuário Veterinário - ${animal.nome}`}
      author={empresa}
      creator="PetShop Web"
    >
      {consultas.length === 0 ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.empresa}>{empresa}</Text>
              </View>
              <View>
                <Text style={styles.docTitle}>PRONTUÁRIO VETERINÁRIO</Text>
                <Text style={styles.docMeta}>Protocolo: {protocolo}</Text>
                <Text style={styles.docMeta}>Emitido: {dataGeracao}</Text>
              </View>
            </View>
          </View>
          <Text style={{ fontSize: 10, textAlign: 'center', marginTop: 40, color: '#555' }}>
            Nenhuma consulta encontrada no período {periodo}.
          </Text>
        </Page>
      ) : (
        <Page size="A4" style={styles.page}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.empresa}>{empresa}</Text>
                <Text style={styles.empresaSub}>Prontuário {tipo === 'completo' ? 'Completo' : 'Resumido'} — {periodo}</Text>
              </View>
              <View>
                <Text style={styles.docTitle}>PRONTUÁRIO VETERINÁRIO</Text>
                <Text style={styles.docMeta}>Protocolo: {protocolo}</Text>
                <Text style={styles.docMeta}>Emitido em: {dataGeracao}</Text>
              </View>
            </View>
          </View>

          {/* Dados do paciente e tutor */}
          <View style={styles.grid2}>
            {/* Animal */}
            <View style={[styles.section, styles.col]}>
              <Text style={styles.sectionTitle}>DADOS DO PACIENTE</Text>
              <Field label="Nome"        value={animal.nome} />
              <Field label="Espécie"     value={animal.especie} />
              <Field label="Raça"        value={animal.raca} />
              <Field label="Sexo"        value={fmtSexo(animal.sexo)} />
              <Field label="Cor"         value={animal.cor} />
              <Field label="Nascimento"  value={fmtData(animal.data_nascimento)} />
              <Field label="Castrado"    value={animal.castrado === 1 ? 'Sim' : 'Não'} />
            </View>
            {/* Cliente */}
            <View style={[styles.section, styles.col]}>
              <Text style={styles.sectionTitle}>DADOS DO TUTOR</Text>
              <Field label="Nome"     value={cliente.nome} />
              <Field label="CPF/CNPJ" value={cliente.cpf_cnpj} />
              <Field label="Fone"     value={cliente.celular || cliente.telefone} />
              <Field label="E-mail"   value={cliente.email} />
              <Field label="Endereço" value={
                [cliente.endereco, cliente.numero, cliente.bairro, cliente.cidade, cliente.uf]
                  .filter(Boolean).join(', ')
              } />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Histórico de consultas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              HISTÓRICO DE CONSULTAS ({consultas.length})
            </Text>

            {consultas.map((c, idx) => (
              <View key={c.id} style={styles.consultaCard} wrap={false}>
                <View style={styles.consultaHeader}>
                  <Text style={styles.consultaHeaderText}>
                    Consulta #{c.id} — {fmtData(c.data)}
                  </Text>
                  <Text style={[styles.consultaHeaderText, { color: '#475569', fontFamily: 'Helvetica' }]}>
                    Vet.: {c.veterinario || '—'}  |  Status: {c.status}
                  </Text>
                </View>

                <View style={styles.consultaBody}>
                  {/* Linha 1: vitais */}
                  <View style={styles.consultaGrid}>
                    <View style={styles.consultaCol}>
                      <Field label="Peso"        value={c.peso ? `${c.peso} kg` : undefined} />
                      <Field label="Temperatura" value={c.temperatura ? `${c.temperatura} °C` : undefined} />
                    </View>
                    <View style={styles.consultaCol}>
                      <Field label="Prognóstico" value={c.prognostico} />
                    </View>
                  </View>

                  {c.motivo ? (
                    <View style={styles.consultaField}>
                      <Text style={styles.consultaFieldLabel}>Motivo / Queixa Principal</Text>
                      <Text style={styles.consultaFieldText}>{c.motivo}</Text>
                    </View>
                  ) : null}

                  {tipo === 'completo' && c.obs_gerais ? (
                    <View style={styles.consultaField}>
                      <Text style={styles.consultaFieldLabel}>Observações Gerais</Text>
                      <Text style={styles.consultaFieldText}>{c.obs_gerais}</Text>
                    </View>
                  ) : null}

                  {c.diagnostico ? (
                    <View style={styles.consultaField}>
                      <Text style={styles.consultaFieldLabel}>Diagnóstico Provisório</Text>
                      <Text style={styles.consultaFieldText}>{c.diagnostico}</Text>
                    </View>
                  ) : null}

                  {c.diagnostico_def ? (
                    <View style={styles.consultaField}>
                      <Text style={styles.consultaFieldLabel}>Diagnóstico Definitivo</Text>
                      <Text style={styles.consultaFieldText}>{c.diagnostico_def}</Text>
                    </View>
                  ) : null}

                  {tipo === 'completo' && c.prescricao ? (
                    <View style={styles.consultaField}>
                      <Text style={styles.consultaFieldLabel}>Prescrição</Text>
                      <Text style={styles.consultaFieldText}>{c.prescricao}</Text>
                    </View>
                  ) : null}

                  {tipo === 'completo' && c.texto ? (
                    <View style={styles.consultaField}>
                      <Text style={styles.consultaFieldLabel}>Texto / Observações Adicionais</Text>
                      <Text style={styles.consultaFieldText}>{c.texto}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          {/* Assinatura */}
          <View style={styles.assinatura}>
            <View style={styles.assinaturaLine} />
            <Text style={styles.assinaturaText}>Médico(a) Veterinário(a)</Text>
            <Text style={[styles.assinaturaText, { marginTop: 2 }]}>CRMV: _______________</Text>
          </View>

          {/* Rodapé */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerText}>{empresa} — Prontuário Veterinário</Text>
            <Text style={styles.footerText}>
              Protocolo {protocolo}
            </Text>
            <Text
              style={styles.footerText}
              render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
            />
          </View>
        </Page>
      )}
    </Document>
  );
}
