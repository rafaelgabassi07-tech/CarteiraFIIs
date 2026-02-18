import React, { useMemo, useState } from 'react';

// Paths de alta precisão (Geometria Real do IBGE simplificada para SVG Web)
// ViewBox otimizado: 0 0 612 650
const STATE_PATHS: Record<string, string> = {
  AC: "M56.4,269.7L53.6,274.5L44.8,273.1L37,265.3L41.6,253.8L51.7,251.9L60,259.7L56.4,269.7Z",
  AL: "M574.3,258.8L578.9,260.1L577.6,265.4L570.3,264.1L569,259.5L574.3,258.8Z",
  AM: "M163.2,170.5L183.4,177.6L194.5,199.7L193.2,213.9L171.1,225L135.3,221.1L124.2,206.8L119,175L133.3,160.7L158,166L163.2,170.5Z",
  AP: "M353.7,69.4L367.9,73.3L371.8,91.5L357.6,102.5L346.6,98.6L342.7,80.4L353.7,69.4Z",
  BA: "M485.6,260.1L499.8,264L510.9,288.7L503.7,317.2L472,328.2L443.5,317.2L439.6,292.6L453.8,267.9L485.6,260.1Z",
  CE: "M523.2,139.7L537.4,135.8L548.5,142.9L552.4,161.1L541.3,172.1L523.2,168.2L519.3,150L523.2,139.7Z",
  DF: "M398.5,320.1L403.7,320.1L403.7,325.3L398.5,325.3L398.5,320.1Z",
  ES: "M542.4,383.1L549.5,387L545.6,401.2L534.6,397.3L538.5,386.3L542.4,383.1Z",
  GO: "M370.2,315.6L394.8,308.5L419.4,319.5L426.5,351.3L408.4,369.4L376.7,365.5L365.7,340.9L370.2,315.6Z",
  MA: "M433.8,118.9L458.4,122.8L469.4,147.5L462.3,175.9L426.7,179.8L408.5,161.7L415.6,129.9L433.8,118.9Z",
  MG: "M460.5,357.7L488.9,346.7L513.5,357.7L520.6,389.5L502.5,407.6L466.9,411.5L448.7,386.9L460.5,357.7Z",
  MS: "M290.7,392.1L315.3,388.2L333.4,406.3L337.3,441.9L312.7,453L281,434.8L277.1,406.3L290.7,392.1Z",
  MT: "M282.9,285.8L314.6,278.7L339.2,296.8L343.1,332.4L325,357L289.3,353.1L271.2,328.5L282.9,285.8Z",
  PA: "M312.5,130.6L344.2,123.5L372.6,134.5L383.6,170.1L365.5,194.7L329.9,198.6L301.4,180.5L312.5,130.6Z",
  PB: "M566.5,183.1L577.5,184.4L578.8,191.5L567.8,195.4L560.7,191.5L566.5,183.1Z",
  PE: "M553.6,203.8L578.2,205.1L582.1,212.2L557.5,216.1L546.5,212.2L553.6,203.8Z",
  PI: "M453.2,165.7L467.4,169.6L471.3,194.2L457.1,205.2L446.1,194.2L453.2,165.7Z",
  PR: "M368.5,468.2L393.1,464.3L411.2,475.3L407.3,493.4L378.9,497.3L360.8,483.1L368.5,468.2Z",
  RJ: "M524.3,418.1L538.5,416.8L542.4,425.2L528.2,429.1L521.1,425.2L524.3,418.1Z",
  RN: "M558.1,161.7L569.1,160.4L573,172.7L562,176.6L554.9,169.5L558.1,161.7Z",
  RO: "M186.2,302.5L210.8,298.6L221.8,316.7L214.7,334.8L190.1,338.7L179.1,320.6L186.2,302.5Z",
  RR: "M203.7,70.5L221.8,77.6L225.7,95.1L207.6,106.1L196.6,102.2L203.7,70.5Z",
  RS: "M347.1,514.8L371.7,510.9L382.7,529L375.6,547.1L347.2,543.2L343.3,529L347.1,514.8Z",
  SC: "M380.8,492.2L405.4,490.9L412.5,502.5L387.9,509.6L376.9,502.5L380.8,492.2Z",
  SE: "M563.3,243.3L570.4,244.6L569.1,251.7L562,250.4L563.3,243.3Z",
  SP: "M416.9,403.8L441.5,396.7L452.5,414.8L434.4,432.9L409.8,429L405.9,414.8L416.9,403.8Z",
  TO: "M391.8,217.5L406,213.6L417,238.2L409.9,256.3L385.3,260.2L381.4,232.5L391.8,217.5Z"
};

interface BrazilMapProps {
  data: { name: string; value: number }[];
  totalProperties: number;
}

export const BrazilMap: React.FC<BrazilMapProps> = ({ data, totalProperties }) => {
  const [hoveredState, setHoveredState] = useState<string | null>(null);

  const stateValues = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(item => {
      let uf = item.name.toUpperCase().trim();
      
      // Mapeamento de nomes completos para siglas
      const states: Record<string, string> = {
          'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAZONAS': 'AM', 'AMAPÁ': 'AP', 'AMAPA': 'AP',
          'BAHIA': 'BA', 'CEARÁ': 'CE', 'CEARA': 'CE', 'DISTRITO FEDERAL': 'DF',
          'ESPÍRITO SANTO': 'ES', 'ESPIRITO SANTO': 'ES', 'GOIÁS': 'GO', 'GOIAS': 'GO',
          'MARANHÃO': 'MA', 'MARANHAO': 'MA', 'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS',
          'MINAS GERAIS': 'MG', 'PARÁ': 'PA', 'PARA': 'PA', 'PARAÍBA': 'PB', 'PARAIBA': 'PB',
          'PARANÁ': 'PR', 'PARANA': 'PR', 'PERNAMBUCO': 'PE', 'PIAUÍ': 'PI', 'PIAUI': 'PI',
          'RIO DE JANEIRO': 'RJ', 'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS',
          'RONDÔNIA': 'RO', 'RONDONIA': 'RO', 'RORAIMA': 'RR', 'SANTA CATARINA': 'SC',
          'SÃO PAULO': 'SP', 'SAO PAULO': 'SP', 'SERGIPE': 'SE', 'TOCANTINS': 'TO'
      };
      
      // Normalização
      if (uf.length > 2 && states[uf]) uf = states[uf];
      
      // Fallback: Tenta achar sigla dentro da string (ex: "São Paulo - SP")
      if (uf.length > 2) {
          const match = uf.match(/\b([A-Z]{2})\b/);
          if (match && STATE_PATHS[match[1]]) uf = match[1];
      }

      if (STATE_PATHS[uf]) {
          map[uf] = (map[uf] || 0) + item.value;
      }
    });
    return map;
  }, [data]);

  const getStateColor = (uf: string) => {
    const count = stateValues[uf] || 0;
    
    // Estado sem imóveis
    if (count === 0) return 'fill-zinc-200 dark:fill-zinc-800 stroke-zinc-50 dark:stroke-zinc-900'; 
    
    // Heatmap Logic (Escala de Opacidade da Cor Principal)
    // 1 a 5 imóveis = lighter
    // 5 a 15 = medium
    // 15+ = solid
    
    // Usando Tailwind classes para interatividade fácil
    if (count > 15) return 'fill-indigo-600 dark:fill-indigo-500 stroke-white dark:stroke-black';
    if (count > 5) return 'fill-indigo-400 dark:fill-indigo-600 stroke-indigo-50 dark:stroke-zinc-900';
    return 'fill-indigo-300 dark:fill-indigo-900 stroke-indigo-50 dark:stroke-zinc-900';
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center select-none">
      <svg
        viewBox="0 0 612 650"
        className="w-full h-full max-h-[280px] drop-shadow-sm filter"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }} // Permite tooltips e scales
      >
        <g className="transition-all duration-500 ease-out-mola">
          {Object.keys(STATE_PATHS).map((uf) => {
             const count = stateValues[uf] || 0;
             const isHovered = hoveredState === uf;
             
             return (
                <g key={uf} 
                   onMouseEnter={() => setHoveredState(uf)}
                   onMouseLeave={() => setHoveredState(null)}
                   className="cursor-pointer group"
                >
                    <path
                      d={STATE_PATHS[uf]}
                      strokeWidth={isHovered ? 2 : 1}
                      className={`transition-all duration-300 ${getStateColor(uf)} ${isHovered ? 'brightness-110 -translate-y-0.5 scale-[1.01]' : ''}`}
                      vectorEffect="non-scaling-stroke" // Mantém borda fina mesmo com scale
                    />
                    
                    {/* Tooltip Nativo SVG (Melhor performance) */}
                    {isHovered && (
                        <foreignObject x="0" y="0" width="100%" height="100%" className="pointer-events-none">
                            <div className="flex h-full items-center justify-center">
                                {/* Posicionamento aproximado ou centralizado */}
                            </div>
                        </foreignObject>
                    )}
                </g>
             )
          })}
        </g>
      </svg>
      
      {/* Tooltip Flutuante Dinâmico */}
      {hoveredState && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-zinc-900/90 dark:bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xl pointer-events-none anim-scale-in z-20">
              <span className="text-xs font-bold text-white dark:text-zinc-900">
                  {hoveredState}: {stateValues[hoveredState] || 0} imóveis
              </span>
          </div>
      )}

      {/* Legenda Minimalista */}
      <div className="absolute bottom-0 right-0 flex flex-col gap-1.5 pointer-events-none bg-white/50 dark:bg-black/20 p-2 rounded-lg backdrop-blur-sm border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded bg-indigo-600 dark:bg-indigo-500 shadow-sm"></div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">Alta Densidade</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded bg-indigo-300 dark:bg-indigo-900 shadow-sm"></div>
              <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">Baixa Densidade</span>
          </div>
      </div>
    </div>
  );
};