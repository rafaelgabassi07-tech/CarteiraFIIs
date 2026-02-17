import React, { useMemo } from 'react';
import { InfoTooltip } from './Layout';

// Paths simplificados dos estados do Brasil para SVG
const STATE_PATHS: Record<string, string> = {
  AC: "M68.6,233.1 l-3.9,7.1 l-12.3,-1.9 l-11,-11 l6.5,-16.2 l14.2,-2.6 l11.7,11 Z",
  AL: "M608.1,235.8 l4.5,1.3 l-1.3,5.2 l-7.1,-1.3 l-1.3,-4.5 Z",
  AM: "M159.2,169.7 l20.1,7.1 l11,22 l-1.3,14.2 l-22,11 l-35.6,-3.9 l-11,-14.2 l-5.2,-31.7 l14.2,-14.2 l24.6,5.2 Z",
  AP: "M366.2,108.9 l14.2,3.9 l3.9,18.1 l-14.2,11 l-11,-3.9 l-3.9,-18.1 Z",
  BA: "M544.7,255.2 l14.2,3.9 l11,24.6 l-7.1,28.4 l-31.7,11 l-28.4,-11 l-3.9,-24.6 l14.2,-24.6 l31.7,-7.7 Z",
  CE: "M538.2,159.3 l14.2,-3.9 l11,7.1 l3.9,18.1 l-11,11 l-18.1,-3.9 l-3.9,-18.1 Z",
  DF: "M434.9,307.7 l5.2,0 l0,5.2 l-5.2,0 Z",
  ES: "M588.7,351.7 l7.1,3.9 l-3.9,14.2 l-11,-3.9 l3.9,-11 Z",
  GO: "M405.1,303.8 l24.6,-7.1 l24.6,11 l7.1,31.7 l-18.1,18.1 l-31.7,-3.9 l-11,-24.6 l4.5,-25.2 Z",
  MA: "M460.5,152.9 l24.6,3.9 l11,24.6 l-7.1,28.4 l-35.6,3.9 l-18.1,-18.1 l7.1,-31.7 l18.1,-11 Z",
  MG: "M505.8,333.6 l28.4,-11 l24.6,11 l7.1,31.7 l-18.1,18.1 l-35.6,3.9 l-18.1,-24.6 l11.7,-29.1 Z",
  MS: "M327.3,359.5 l24.6,-3.9 l18.1,18.1 l3.9,35.6 l-24.6,11 l-31.7,-18.1 l-3.9,-28.4 l13.6,-14.3 Z",
  MT: "M324.1,268.1 l31.7,-7.1 l24.6,11 l3.9,35.6 l-18.1,24.6 l-35.6,-3.9 l-18.1,-28.4 l11.6,-31.8 Z",
  PA: "M330.6,149.6 l31.7,-7.1 l28.4,11 l11,35.6 l-18.1,24.6 l-35.6,3.9 l-28.4,-18.1 l11,-50.9 Z",
  PB: "M586.1,185.2 l11,1.3 l1.3,7.1 l-11,3.9 l-7.1,-3.9 l5.8,-8.4 Z",
  PE: "M579.6,198.1 l24.6,1.3 l3.9,7.1 l-24.6,3.9 l-11,-3.9 l7.1,-8.4 Z",
  PI: "M496.1,182.0 l14.2,3.9 l3.9,24.6 l-14.2,11 l-11,-11 l7.1,-28.5 Z",
  PR: "M401.9,424.2 l24.6,-3.9 l18.1,11 l-3.9,18.1 l-28.4,3.9 l-18.1,-14.2 l7.7,-14.9 Z",
  RJ: "M562.8,384.1 l14.2,-1.3 l3.9,7.1 l-14.2,3.9 l-7.1,-3.9 l3.2,-5.8 Z",
  RN: "M573.1,172.3 l11,-1.3 l3.9,11 l-11,3.9 l-7.1,-7.1 l3.2,-6.5 Z",
  RO: "M211.0,268.1 l24.6,-3.9 l11,18.1 l-7.1,18.1 l-24.6,3.9 l-11,-18.1 l7.1,-18.1 Z",
  RR: "M243.4,86.2 l18.1,7.1 l3.9,24.6 l-18.1,11 l-11,-11 l7.1,-31.7 Z",
  RS: "M379.2,466.3 l24.6,-3.9 l11,18.1 l-18.1,18.1 l-28.4,-3.9 l-3.9,-18.1 l14.8,-10.3 Z",
  SC: "M414.8,446.9 l24.6,-1.3 l7.1,11 l-24.6,7.1 l-11,-7.1 l3.9,-9.7 Z",
  SE: "M595.2,222.8 l7.1,1.3 l-1.3,7.1 l-7.1,-1.3 l1.3,-7.1 Z",
  SP: "M460.5,384.1 l24.6,-7.1 l11,18.1 l-18.1,11 l-24.6,-3.9 l-3.9,-14.2 l11,-3.9 Z",
  TO: "M431.3,232.5 l14.2,-3.9 l11,24.6 l-7.1,18.1 l-24.6,3.9 l-3.9,-28.4 l10.4,-14.3 Z"
};

interface BrazilMapProps {
  data: { name: string; value: number }[];
  totalProperties: number;
}

export const BrazilMap: React.FC<BrazilMapProps> = ({ data, totalProperties }) => {
  const stateValues = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(item => {
      // Tenta mapear nomes completos para siglas ou usa a sigla se já vier
      const name = item.name.toUpperCase();
      let uf = name;
      
      const states: Record<string, string> = {
          'SÃO PAULO': 'SP', 'RIO DE JANEIRO': 'RJ', 'MINAS GERAIS': 'MG', 'ESPÍRITO SANTO': 'ES',
          'PARANÁ': 'PR', 'SANTA CATARINA': 'SC', 'RIO GRANDE DO SUL': 'RS',
          'BAHIA': 'BA', 'PERNAMBUCO': 'PE', 'CEARÁ': 'CE', 'GOIÁS': 'GO', 'DISTRITO FEDERAL': 'DF'
      };
      
      if (states[name]) uf = states[name];
      // Se já for sigla (2 letras)
      if (name.length === 2) uf = name;

      if (STATE_PATHS[uf]) {
          map[uf] = (map[uf] || 0) + item.value;
      }
    });
    return map;
  }, [data]);

  const getColor = (uf: string) => {
    const count = stateValues[uf] || 0;
    if (count === 0) return 'fill-zinc-200 dark:fill-zinc-800 stroke-white dark:stroke-zinc-900'; // Empty
    
    const intensity = Math.min(1, count / (totalProperties * 0.6)); // Normalização visual
    
    // Escala de Indigo
    if (intensity > 0.7) return 'fill-indigo-600 dark:fill-indigo-500';
    if (intensity > 0.4) return 'fill-indigo-400 dark:fill-indigo-600';
    return 'fill-indigo-300 dark:fill-indigo-800';
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      <svg
        viewBox="0 0 650 500"
        className="w-full h-full max-h-[300px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g className="stroke-2 transition-all duration-300">
          {Object.keys(STATE_PATHS).map((uf) => {
             const hasProps = stateValues[uf] > 0;
             return (
                <path
                  key={uf}
                  d={STATE_PATHS[uf]}
                  className={`transition-all duration-300 cursor-pointer hover:opacity-80 ${getColor(uf)} ${hasProps ? 'stroke-white dark:stroke-zinc-950' : 'stroke-zinc-50 dark:stroke-zinc-800'}`}
                >
                  <title>{`${uf}: ${stateValues[uf] || 0} imóveis`}</title>
                </path>
             )
          })}
        </g>
      </svg>
      
      {/* Legenda Flutuante Simplificada */}
      <div className="absolute bottom-2 right-2 flex flex-col gap-1 pointer-events-none">
          <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase">Alta Conc.</span>
          </div>
          <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-300 dark:bg-indigo-800"></div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase">Baixa Conc.</span>
          </div>
      </div>
    </div>
  );
};
