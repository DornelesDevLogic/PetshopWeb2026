import { redirect } from 'next/navigation';

// Hub de dashboards — por ora redireciona para o Executivo.
// Futuramente pode virar uma tela com cards de acesso a cada dashboard.
export default function DashboardsPage() {
  redirect('/dashboards/executivo');
}
