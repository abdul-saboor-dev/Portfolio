import { useEffect, useState } from 'react';
import { portfolioRepository } from './repository.js';
import { FALLBACK_CONTENT } from './validation.js';

const initialState = {
  status: 'loading',
  content: FALLBACK_CONTENT,
  issues: [],
  error: null,
};

export function usePortfolioContent() {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let active = true;

    portfolioRepository.getContent().then((result) => {
      if (active) setState(result);
    });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
