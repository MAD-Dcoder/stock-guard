import type { ReactNode } from 'react';

interface FundoEstelarProps {
  children: ReactNode;
}

export function FundoEstelar({ children }: FundoEstelarProps) {
  return (
    <div className="fundo-estelar">
      <div className="fundo-estelar-glow" aria-hidden="true" />
      <div className="fundo-estelar-stars" aria-hidden="true" />
      <div className="fundo-estelar-content">{children}</div>
    </div>
  );
}
