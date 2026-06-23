/**
 * Loading — pegadas aparecem da esquerda para a direita, entrelaçadas,
 * simulando o caminhar real de um cachorro.
 */
export default function LoadingPet() {
  return (
    <>
      <style>{`
        .lp-scene {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 320px;
          gap: 36px;
          user-select: none;
        }

        /* trilha onde as pegadas aparecem */
        .lp-track {
          position: relative;
          width: 300px;
          height: 72px;
        }

        .lp-paw {
          position: absolute;
          opacity: 0;
          animation: lp-appear 2.2s ease-in-out infinite;
        }

        .lp-paw:nth-child(odd)  { top: 4px;  transform: rotate(90deg) scale(0); }
        .lp-paw:nth-child(even) { top: 36px; transform: rotate(90deg) scale(0); }

        /* posições X — espaçamento de 46px, deslocadas entre si */
        .lp-paw:nth-child(1) { left:   0px; animation-delay: 0.00s; }
        .lp-paw:nth-child(2) { left:  38px; animation-delay: 0.28s; }
        .lp-paw:nth-child(3) { left:  80px; animation-delay: 0.56s; }
        .lp-paw:nth-child(4) { left: 118px; animation-delay: 0.84s; }
        .lp-paw:nth-child(5) { left: 160px; animation-delay: 1.12s; }
        .lp-paw:nth-child(6) { left: 198px; animation-delay: 1.40s; }
        .lp-paw:nth-child(7) { left: 240px; animation-delay: 1.68s; }

        @keyframes lp-appear {
          0%   { opacity: 0;   transform: rotate(var(--r, 0deg)) scale(0.4); }
          12%  { opacity: 1;   transform: rotate(var(--r, 0deg)) scale(1);   }
          60%  { opacity: 0.7; transform: rotate(var(--r, 0deg)) scale(1);   }
          85%, 100% { opacity: 0; transform: rotate(var(--r, 0deg)) scale(0.9); }
        }

        /* passa a rotação via variável CSS para o keyframe conseguir usá-la */
        .lp-paw:nth-child(odd)  { --r: 90deg; }
        .lp-paw:nth-child(even) { --r: 90deg; }

        /* texto */
        .lp-text {
          font-size: 0.875rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          color: var(--muted-foreground, #888);
        }
        .lp-dots span {
          animation: lp-dot 1.4s ease-in-out infinite;
          opacity: 0;
        }
        .lp-dots span:nth-child(1) { animation-delay: 0s;    }
        .lp-dots span:nth-child(2) { animation-delay: 0.28s; }
        .lp-dots span:nth-child(3) { animation-delay: 0.56s; }
        @keyframes lp-dot {
          0%, 100% { opacity: 0; }
          50%      { opacity: 1; }
        }
      `}</style>

      <div className="lp-scene">
        <div className="lp-track">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <svg
              key={i}
              className="lp-paw"
              width="34"
              height="34"
              viewBox="0 0 100 100"
              fill="currentColor"
              style={{ color: 'hsl(var(--primary))' }}
            >
              <ellipse cx="50" cy="72" rx="26" ry="22" />
              <ellipse cx="18" cy="44" rx="13" ry="16" transform="rotate(-15 18 44)" />
              <ellipse cx="40" cy="30" rx="13" ry="16" transform="rotate(-5 40 30)"  />
              <ellipse cx="63" cy="30" rx="13" ry="16" transform="rotate(5 63 30)"   />
              <ellipse cx="83" cy="44" rx="13" ry="16" transform="rotate(15 83 44)"  />
            </svg>
          ))}
        </div>

        <p className="lp-text">
          Carregando
          <span className="lp-dots">
            <span>.</span><span>.</span><span>.</span>
          </span>
        </p>
      </div>
    </>
  );
}
