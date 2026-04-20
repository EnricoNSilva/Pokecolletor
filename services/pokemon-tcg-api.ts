import axios from 'axios/dist/browser/axios.cjs';

const BASE_URL = 'https://api.pokemontcg.io/v2';

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

const apiKey = process.env.EXPO_PUBLIC_POKEMON_TCG_API_KEY;

const pokemonTcgApi = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: apiKey
    ? {
        'X-Api-Key': apiKey,
      }
    : undefined,
});

export async function getSets(page = 1, pageSize = 30): Promise<ListSetsResponse> {
  const response = await pokemonTcgApi.get<ListSetsResponse>('/sets', {
    params: {
      page,
      pageSize,
      orderBy: '-releaseDate',
    },
  });

  return response.data;
}
