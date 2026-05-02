// Base URL da api-machine (simpay-back) — usado para endpoints públicos e /admin/*
export const MACHINE_API_URL = "https://simpay-back.simintermediacoes.com";

// userId da Renovada no banco da api-machine (fixo - não mudar)
export const RENOVADA_USER_ID = "ba2b57d6-e3bf-4395-af31-58454f27207a";

// Proxy interno Next.js — substitui chamadas diretas a /internal/* para não expor o token no browser
export const INTERNAL_API_URL = "/api/internal";

// Token interno — mantido apenas para compatibilidade (não usado no browser)
export const MACHINE_INTERNAL_TOKEN = "";
