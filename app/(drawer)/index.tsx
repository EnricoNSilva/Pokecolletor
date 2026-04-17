import { RouteShell } from "@/components/route-shell";

export default function DashboardScreen() {
  return (
    <RouteShell
      eyebrow="PokéCollector"
      title="Dashboard"
      description="Ponto de partida do app: daqui o usuário entra no catálogo, abre o fichário e acessa as ferramentas de jogo."
      notes={[
        "A navegação principal já está organizada com Drawer, Stack e modal.",
        "A próxima etapa vai conectar a API pública do Pokémon TCG com a tela de expansão.",
        "A interface já nasce com o contraste escuro e destaque em amarelo para manter a identidade visual.",
      ]}
      footerLabel="Este é o painel central para evoluir o projeto sem perder organização."
    />
  );
}
