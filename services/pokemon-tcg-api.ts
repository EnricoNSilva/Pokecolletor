import axios from "axios/dist/browser/axios.cjs";

const BASE_URL = "https://api.pokemontcg.io/v2";

export type PokemonTcgSet = {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  releaseDate: string;
  images: {
    symbol: string;
    logo: string;
  };
};

type ListSetsResponse = {
  data: PokemonTcgSet[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
};

export type PokemonTcgCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  supertype?: string;
  subtypes?: string[];
  images: {
    small: string;
    large: string;
  };
  set: {
    id: string;
    name: string;
    series: string;
  };
};

type ListCardsResponse = {
  data: PokemonTcgCard[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
};

const pokemonTcgApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

export async function getSets(
  page = 1,
  pageSize = 30,
  options?: { signal?: AbortSignal },
): Promise<ListSetsResponse> {
  const response = await pokemonTcgApi.get<ListSetsResponse>("/sets", {
    params: {
      page,
      pageSize,
      orderBy: "-releaseDate",
    },
    signal: options?.signal,
  });

  return response.data;
}

export async function getCardsBySet(
  setId: string,
  page = 1,
  pageSize = 24,
  options?: { signal?: AbortSignal; pokemonName?: string },
): Promise<ListCardsResponse> {
  let query = `set.id:${setId}`;
  if (options?.pokemonName) {
    query += ` name:"*${options.pokemonName}*"`;
  }

  const response = await pokemonTcgApi.get<ListCardsResponse>("/cards", {
    params: {
      q: query,
      page,
      pageSize,
      orderBy: "number",
    },
    signal: options?.signal,
  });

  return response.data;
}

export async function getCardsByName(
  pokemonName: string,
  page = 1,
  pageSize = 50,
  options?: { signal?: AbortSignal },
): Promise<ListCardsResponse> {
  const response = await pokemonTcgApi.get<ListCardsResponse>("/cards", {
    params: {
      q: `name:${pokemonName}*`,
      page,
      pageSize,
      orderBy: "-set.releaseDate",
    },
    signal: options?.signal,
  });

  return response.data;
}
