# PokéCollector — Gerenciador Pessoal de Coleção Pokémon TCG

Este repositório contém a aplicação mobile desenvolvida com Expo para gerenciar coleções de cartas Pokémon TCG de forma prática: fichário pessoal, navegação por expansões, construção/validação de decks e utilitários para partidas.

## Visão Geral e Requisitos

- Motivação: eu coleciono cartas Pokémon TCG e precisava de uma ferramenta para controlar quantidades, acompanhar progresso por expansão e facilitar partidas (moeda, dado, timer). O app é pensado para uso pessoal, com sincronização por usuário via Firestore.
- Objetivo: permitir que um colecionador registre cartas, saiba em quais expansões está mais completo, crie e valide decks, e use utilitários durante partidas com feedback sonoro e háptico.
- Requisitos técnicos mínimos:
  - Node.js 18+ / npm
  - Expo CLI (compatível com SDK 54)
  - Conta Firebase (para autenticação e Firestore)

## Tecnologias utilizadas

- Expo (SDK 54) + React Native
- React 19, TypeScript
- Expo Router (navegação baseada em arquivos)
- Firebase Authentication & Firestore (persistência por usuário)
- Axios (chamadas à Pokémon TCG API)
- expo-sensors (Acelerômetro), expo-av (Áudio), expo-haptics (Haptics)
- react-native-gesture-handler, react-native-reanimated (UX)
- MaterialCommunityIcons (ícones)

Principais bibliotecas e por que foram escolhidas:

- `expo-router`: roteamento baseado em arquivos que simplifica a organização das telas, integração com layouts (Stack/Drawer) e deep linking; reduz boilerplate de navegação.
- `expo-av`: fornece API consistente para reprodução de áudio em Android, iOS e web (quando suportado), permitindo empacotar sons como assets e reproduzi-los com controle de volume e replay, usado em coin flip, dice e timer.
- `firebase` (Auth + Firestore): solução gerenciada para autenticação e persistência por usuário, com sincronização em tempo real e regras de segurança que facilitam armazenar fichários e decks por `uid`.

> **Nota de Documentação:** Sempre que uma biblioteca adicional do ecossistema React/Expo foi utilizada para funções específicas, o código-fonte contém comentários detalhando o motivo técnico da sua escolha e sua aplicação prática no contexto do componente.

## Funcionalidades

1. Autenticação
   - `Email` + `senha` via Firebase Auth.
   - Perfil do usuário sincronizado em `users/{uid}` no Firestore.

2. Fichário (Binder)
   - Adicionar/remover cartas com quantidade.
   - Agregação por expansão: número total de cartas e cartas únicas.

3. Navegação por Expansões e Catálogo
   - Integração com Pokémon TCG API para listar sets e cartas.
   - Cabeçalho animado que oculta/mostra ao rolar (com fallback no web).
   - Ordenação confiável por número da carta implementada no cliente para tratar casos alfanuméricos.

4. Decks
   - Criar, editar e deletar decks.
   - Validação de regras: 60 cartas, pelo menos 1 Pokémon Básico, até 4 cópias por mesmo nome (exceto Basic Energy).

5. Dashboard
   - Estatísticas do usuário: expansões, cartas totais, cartas únicas, decks válidos.
   - Barras de progresso por expansão (ordenadas por completude).

6. Ferramentas de partida
   - Coin flip (moeda), dado d6 (botão ou chacoalhar), timer de turno com presets.
   - Feedbacks: vibração (haptics) e sons locais (assets empacotados via `require(...)`).
   - Acelerômetro protegido com checagens de disponibilidade (web fallback).

## Demonstração

![Demo placeholder](docs/demo.gif)

## Instalação e Execução

1. Clone o repositório:

```bash
git clone https://github.com/EnricoNSilva/Pokecolletor.git
cd Pokecolletor
```

2. Instale dependências:

```bash
npm install
```

3. Configurar Firebase
   - Crie um arquivo `.env` a partir de `.env.example` e preencha as chaves do Firebase (API key, project id, etc.).

4. Start (com cache limpo quando houver mudanças de dependências):

```bash
npx expo start --clear
```

5. Rodar nas plataformas:

- Android emulator: pressione `a` no terminal do Expo
- iOS simulator: pressione `i`
- Web: pressione `w`

Notas úteis:

- Se o Expo relatar incompatibilidades com módulos nativos, execute `npx expo install --fix` e reinstale `node_modules` quando necessário.
- Para adicionar sons, coloque os arquivos em `assets/sounds` e carregue com `require("../../assets/sounds/arquivo.mp3")`.

## Aprendizados e Próximos Passos

Aprendizados principais:

- O campo `number` retornado pela Pokémon TCG API pode ser alfanumérico; por isso a ordenação por número pode falhar para alguns sets. A solução foi ordenar no cliente com uma função que considera número base e sufixo alfabético.
- Plataformas cruzadas pedem checagens explícitas (`Platform.OS`, `isAvailableAsync`) e fallbacks (desabilitar shake na web, tocar áudio via assets locais).
- Manter o histórico de commits pequeno e temático ajuda a revisar mudanças (ex.: `feat(tools)`, `fix(web)`, `chore(deps)`).

Próximos passos:

- Melhorar cache/offline para cartas por set.
- Aprimorar editor de decks com drag-and-drop e agrupamentos.
- Adicionar CI (GitHub Actions) para builds web/mobile no push.
