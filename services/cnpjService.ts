import { CnpjData } from "../types";

export const fetchCnpjData = async (cnpj: string): Promise<CnpjData | null> => {
  // Remove non-numeric characters
  const cleanCnpj = cnpj.replace(/\D/g, '');

  if (cleanCnpj.length !== 14) {
    throw new Error("CNPJ deve conter 14 dígitos.");
  }

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("CNPJ não encontrado na base de dados.");
      }
      throw new Error("Erro ao consultar BrasilAPI.");
    }

    const data = await response.json();
    return data as CnpjData;
  } catch (error) {
    console.error("CNPJ Fetch Error:", error);
    throw error;
  }
};