import { RouteShell } from "@/components/route-shell";

export default function SetsScreen() {
  return (
    <RouteShell
      eyebrow="Pokémon TCG"
      title="Expansões"
      description="Área dedicada à navegação das coleções da API pública, com foco em imagens otimizadas e leitura rápida das cartas."
      notes={[
        "Aqui entra o consumo com axios da API do Pokémon TCG.",
        "Esta tela vai permitir filtrar e navegar por coleções, sets e cartas.",
        "As imagens precisam ser carregadas de forma eficiente para manter boa UX no celular.",
      ]}
      footerLabel="No próximo passo, esta rota vira a vitrine principal do catálogo."
    />
  );
}
