import { RouteShell } from "@/components/route-shell";

export default function BinderScreen() {
  return (
    <RouteShell
      eyebrow="Meu Fichário"
      title="Binder"
      description="Esta será a tela do CRUD principal: marcar cartas como possuídas, ajustar quantidades e remover registros do Firebase."
      notes={[
        "A leitura do Firebase vai mostrar o que já foi salvo pelo usuário.",
        "O update vai controlar a quantidade de cópias de cada carta.",
        "O delete será acionado ao desmarcar uma carta do fichário.",
      ]}
      footerLabel="Aqui mora o coração do projeto final, com CRUD completo na nuvem."
    />
  );
}
