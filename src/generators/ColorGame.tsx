import React, { useState, useEffect, useRef } from 'react';
import type { Choice } from '../types';
import { soundManager } from '../utils/soundUtils';

interface ColorGameProps {
  choices: Choice[];
  onWinner: (winner: Choice) => void;
  isFullscreen?: boolean;
  isLightMode?: boolean;
  spinDuration?: number;
  onHome?: () => void;
}

// Game Colors (FIXED — do not add or remove)
const COLORS = [
  { name: "Red",     hex: "#F44336" },
  { name: "White",   hex: "#FFFFFF" },
  { name: "Yellow",  hex: "#FFD600" },
  { name: "Blue",    hex: "#2979FF" },
  { name: "Green",   hex: "#00C853" },
  { name: "Magenta", hex: "#FF00CC" },
];

// 3D CSS rotation mapping to bring each color's face to the TOP
const ROTATIONS: Record<string, string> = {
  "Green": "rotateX(0deg) rotateY(0deg) rotateZ(0deg)",      // Top face is Green
  "Magenta": "rotateX(180deg) rotateY(0deg) rotateZ(0deg)",  // Bottom face is Magenta
  "Red": "rotateX(-90deg) rotateY(0deg) rotateZ(0deg)",      // Front face is Red
  "White": "rotateX(90deg) rotateY(0deg) rotateZ(0deg)",       // Back face is White
  "Yellow": "rotateX(0deg) rotateY(0deg) rotateZ(90deg)",     // Left face is Yellow
  "Blue": "rotateX(0deg) rotateY(0deg) rotateZ(-90deg)",     // Right face is Blue
};

interface DieState {
  id: string;
  resultColor: string;
  randomSpinY: number;
  randomTiltX: number;
  randomTiltZ: number;
}

export const ColorGame: React.FC<ColorGameProps> = ({ onWinner, onHome }) => {
  const [selectedBets, setSelectedBets] = useState<string[]>([]);
  const [score, setScore] = useState<number>(() => {
    const saved = localStorage.getItem('decidely_color_score');
    return saved ? parseInt(saved, 10) : 120;
  });
  const [isRolling, setIsRolling] = useState(false);
  const [dice, setDice] = useState<DieState[]>([]);
  const [statusText, setStatusText] = useState("TAP COLORS TO BET");
  const [statusColor, setStatusColor] = useState("#FF00CC");
  
  const timerRef = useRef<number | null>(null);
  const tickIntervalRef = useRef<number | null>(null);

  // Sync score with localStorage
  useEffect(() => {
    localStorage.setItem('decidely_color_score', String(score));
  }, [score]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, []);

  // Dynamically load Google Font Fredoka One
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Handle Bet Tile selection (max 3 selections)
  const handleSelectTile = (hexColor: string) => {
    if (isRolling) return;
    soundManager.playTick(500, 0.05);
    
    setSelectedBets(prev => {
      if (prev.includes(hexColor)) {
        return prev.filter(c => c !== hexColor);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, hexColor];
    });
  };

  // Launch the tumbling dice roll
  const handleRoll = () => {
    if (isRolling || selectedBets.length === 0) return;

    setIsRolling(true);
    setStatusText("ROLLING...");
    setStatusColor("#FFB300");
    soundManager.playLeverPull();

    // Spawn 1 to 3 dice based on selection size
    const diceCount = selectedBets.length;
    const initialDice = Array.from({ length: diceCount }).map((_, idx) => ({
      id: `die-${idx}-${Date.now()}`,
      resultColor: "Green", // Placeholder till landing
      randomSpinY: Math.random() * 360,
      randomTiltX: (Math.random() - 0.5) * 10,
      randomTiltZ: (Math.random() - 0.5) * 10,
    }));
    setDice(initialDice);

    // Rapid tumbling sounds
    let tickCount = 0;
    tickIntervalRef.current = window.setInterval(() => {
      soundManager.playTick(450 + (tickCount % 6) * 60 + Math.random() * 40, 0.04);
      tickCount++;
    }, 110);

    // Stop tumbling after 1.8 seconds
    timerRef.current = window.setTimeout(() => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      
      // Determine random color outcomes for each die
      const finalDiceResults = Array.from({ length: diceCount }).map(() => {
        const rand = COLORS[Math.floor(Math.random() * COLORS.length)];
        return rand.name;
      });

      // Update dice states
      setDice(prev => prev.map((die, idx) => ({
        ...die,
        resultColor: finalDiceResults[idx],
      })));

      // Calculate bet matches
      const betHexes = selectedBets;
      const matchedColors: string[] = [];
      
      finalDiceResults.forEach(colorName => {
        const matchingColor = COLORS.find(c => c.name === colorName);
        if (matchingColor && betHexes.includes(matchingColor.hex)) {
          matchedColors.push(colorName);
        }
      });

      setIsRolling(false);

      if (matchedColors.length > 0) {
        const winAmount = matchedColors.length * 20;
        setScore(s => s + winAmount);
        soundManager.playWin();

        const matchUniqueText = Array.from(new Set(matchedColors)).join(' & ').toUpperCase();
        setStatusText(`${matchUniqueText} WINS! +${winAmount} 🪙`);
        
        // Match the status text color with the winning color
        const mainWinningHex = COLORS.find(c => c.name === matchedColors[0])?.hex || "#FFD600";
        setStatusColor(mainWinningHex);

        // Explode full screen trophy celebration in App Shell
        onWinner({
          id: `color-game-${Date.now()}`,
          text: `${matchUniqueText} WIN! 🎉`,
          color: mainWinningHex,
          weight: 1
        });
      } else {
        // Lose condition
        soundManager.playTick(200, 0.25);
        setStatusText("NO MATCHES! TRY AGAIN");
        setStatusColor("#FF00CC");
      }
    }, 1800);
  };

  // Reset bets and trigger home navigation
  const handleHome = () => {
    if (isRolling) return;
    setSelectedBets([]);
    setStatusText("TAP COLORS TO BET");
    setStatusColor("#FF00CC");
    if (onHome) onHome();
  };

  return (
    <div className="wood-floor flex flex-col items-center justify-center p-4 w-full h-full min-h-[520px] select-none overflow-hidden rounded-3xl relative">
      
      {/* Styles Injected to ensure self-contained animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        .wood-floor {
          background-color: #8B5A2B;
          background-image: 
            repeating-linear-gradient(90deg, transparent, transparent 75px, rgba(0,0,0,0.2) 75px, rgba(0,0,0,0.2) 79px),
            linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(0,0,0,0.3));
          box-shadow: inset 0 0 100px rgba(0,0,0,0.7);
          font-family: 'Fredoka One', cursive, sans-serif;
        }

        .tray-box {
          position: relative;
          width: 100%;
          max-width: 360px;
          height: 250px;
          background: #00BCD4;
          border: 10px solid #008ba3;
          border-top-color: #00acc1;
          border-bottom-color: #007c91;
          border-radius: 20px;
          box-shadow: 
            0 16px 32px rgba(0,0,0,0.6),
            inset 0 6px 12px rgba(0,0,0,0.3);
          overflow: hidden;
          box-sizing: border-box;
        }

        .tray-floor {
          position: absolute;
          top: 6px;
          bottom: 6px;
          left: 6px;
          right: 6px;
          background: #FFD600;
          border-radius: 12px;
          box-shadow: inset 0 12px 24px rgba(0,0,0,0.25);
          border: 6px solid #FFC107;
          overflow: hidden;
        }

        /* LED style Bet indicator panel */
        .bet-panel {
          position: absolute;
          top: 10px;
          left: 10px;
          background: #111;
          border: 2px solid #333;
          border-radius: 6px;
          padding: 4px 8px;
          display: flex;
          gap: 6px;
          align-items: center;
          min-height: 28px;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);
          z-index: 20;
        }

        .bet-indicator-dot {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.15);
        }

        /* Gold Coin indicator panel */
        .score-panel {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #111;
          border: 2px solid #d4af37;
          border-radius: 6px;
          padding: 4px 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          color: #FFD700;
          font-size: 13px;
          font-weight: bold;
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.5), 0 0 8px rgba(212, 175, 55, 0.4);
          z-index: 20;
        }

        .coin-icon {
          width: 16px;
          height: 16px;
          background: radial-gradient(circle, #ffe066, #f5b041);
          border: 1.5px solid #d4af37;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4a3000;
          font-weight: 900;
          font-size: 10px;
          font-family: Arial, sans-serif;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }

        .status-text {
          position: absolute;
          bottom: 12px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 18px;
          font-weight: 900;
          font-style: italic;
          text-shadow: 1.5px 1.5px 0 #000, 0 0 10px rgba(0,0,0,0.3);
          letter-spacing: 1px;
          z-index: 20;
        }

        .pulse-animation {
          animation: pulse-status 1.2s ease-in-out infinite alternate;
        }

        @keyframes pulse-status {
          0% { transform: scale(0.96); opacity: 0.9; }
          100% { transform: scale(1.04); opacity: 1; }
        }

        /* 3D Dice styling */
        .dice-area {
          position: absolute;
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%) rotateX(20deg);
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 24px;
          width: 90%;
          height: 100px;
          perspective: 800px;
          transform-style: preserve-3d;
          z-index: 10;
        }

        .cube-wrapper {
          position: relative;
          transform-style: preserve-3d;
        }

        .cube-spin-wrapper {
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .cube {
          width: 54px;
          height: 54px;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .cube-face {
          position: absolute;
          width: 54px;
          height: 54px;
          background-color: #FFFFFF;
          border: 3.5px solid #FFFFFF;
          border-radius: 11px;
          box-shadow: inset 0 0 5px rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          backface-visibility: hidden;
        }

        .face-inner {
          width: 86%;
          height: 86%;
          border-radius: 6px;
          box-shadow: inset 0 1px 2px rgba(0,0,0,0.25);
        }

        .face-front  { transform: rotateY(0deg) translateZ(27px); }
        .face-back   { transform: rotateY(180deg) translateZ(27px); }
        .face-left   { transform: rotateY(-90deg) translateZ(27px); }
        .face-right  { transform: rotateY(90deg) translateZ(27px); }
        .face-top    { transform: rotateX(-90deg) translateZ(27px); }
        .face-bottom { transform: rotateX(90deg) translateZ(27px); }

        .cube-shadow {
          position: absolute;
          width: 46px;
          height: 10px;
          background: rgba(0,0,0,0.28);
          border-radius: 50%;
          bottom: -22px;
          left: 4px;
          filter: blur(3.5px);
          transform-style: flat;
          pointer-events: none;
          transition: all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        /* Dice tumbling animations */
        .tumbling-0 {
          animation: tumble-anim-0 1.8s ease-out forwards;
        }
        .tumbling-1 {
          animation: tumble-anim-1 1.8s ease-out forwards;
        }
        .tumbling-2 {
          animation: tumble-anim-2 1.8s ease-out forwards;
        }

        .shadow-tumbling-0 {
          animation: shadow-anim-0 1.8s ease-out forwards;
        }
        .shadow-tumbling-1 {
          animation: shadow-anim-1 1.8s ease-out forwards;
        }
        .shadow-tumbling-2 {
          animation: shadow-anim-2 1.8s ease-out forwards;
        }

        @keyframes tumble-anim-0 {
          0% { transform: translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          20% { transform: translateY(-45px) rotateX(240deg) rotateY(180deg) rotateZ(90deg); }
          40% { transform: translateY(12px) rotateX(480deg) rotateY(360deg) rotateZ(180deg); }
          60% { transform: translateY(-30px) rotateX(720deg) rotateY(540deg) rotateZ(270deg); }
          80% { transform: translateY(6px) rotateX(960deg) rotateY(720deg) rotateZ(360deg); }
          100% { transform: translateY(0) rotateX(1200deg) rotateY(900deg) rotateZ(450deg); }
        }

        @keyframes tumble-anim-1 {
          0% { transform: translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          18% { transform: translateY(-50px) rotateX(-180deg) rotateY(-90deg) rotateZ(-45deg); }
          38% { transform: translateY(15px) rotateX(-360deg) rotateY(-270deg) rotateZ(-135deg); }
          58% { transform: translateY(-25px) rotateX(-540deg) rotateY(-450deg) rotateZ(-225deg); }
          78% { transform: translateY(5px) rotateX(-720deg) rotateY(-630deg) rotateZ(-315deg); }
          100% { transform: translateY(0) rotateX(-900deg) rotateY(-810deg) rotateZ(-405deg); }
        }

        @keyframes tumble-anim-2 {
          0% { transform: translateY(0) rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
          22% { transform: translateY(-40px) rotateX(360deg) rotateY(-180deg) rotateZ(120deg); }
          44% { transform: translateY(10px) rotateX(720deg) rotateY(-360deg) rotateZ(240deg); }
          66% { transform: translateY(-20px) rotateX(1080deg) rotateY(-540deg) rotateZ(360deg); }
          88% { transform: translateY(4px) rotateX(1440deg) rotateY(-720deg) rotateZ(480deg); }
          100% { transform: translateY(0) rotateX(1800deg) rotateY(-900deg) rotateZ(600deg); }
        }

        @keyframes shadow-anim-0 {
          0% { transform: scale(1); opacity: 0.28; filter: blur(3.5px); }
          20% { transform: scale(0.55); opacity: 0.08; filter: blur(6px); }
          40% { transform: scale(1.15); opacity: 0.4; filter: blur(2px); }
          60% { transform: scale(0.65); opacity: 0.12; filter: blur(5px); }
          80% { transform: scale(1.05); opacity: 0.35; filter: blur(2.5px); }
          100% { transform: scale(1); opacity: 0.28; filter: blur(3.5px); }
        }

        @keyframes shadow-anim-1 {
          0% { transform: scale(1); opacity: 0.28; filter: blur(3.5px); }
          18% { transform: scale(0.5); opacity: 0.06; filter: blur(7.5px); }
          38% { transform: scale(1.2); opacity: 0.42; filter: blur(1.5px); }
          58% { transform: scale(0.7); opacity: 0.15; filter: blur(4.5px); }
          78% { transform: scale(1.05); opacity: 0.35; filter: blur(2.5px); }
          100% { transform: scale(1); opacity: 0.28; filter: blur(3.5px); }
        }

        @keyframes shadow-anim-2 {
          0% { transform: scale(1); opacity: 0.28; filter: blur(3.5px); }
          22% { transform: scale(0.6); opacity: 0.1; filter: blur(5.5px); }
          44% { transform: scale(1.1); opacity: 0.38; filter: blur(2.2px); }
          66% { transform: scale(0.75); opacity: 0.18; filter: blur(4.2px); }
          88% { transform: scale(1.02); opacity: 0.32; filter: blur(2.8px); }
          100% { transform: scale(1); opacity: 0.28; filter: blur(3.5px); }
        }

        /* Action Buttons Row */
        .btn-row {
          display: flex;
          width: 100%;
          max-width: 360px;
          gap: 14px;
          margin-top: 14px;
          margin-bottom: 14px;
        }

        .home-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #F44336;
          border: 4px solid #111;
          color: white;
          font-size: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 0 #901F18;
          cursor: pointer;
          transition: all 0.1s ease;
        }

        .home-btn:active {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #901F18;
        }

        .roll-btn {
          flex-grow: 1;
          height: 52px;
          border-radius: 26px;
          background: linear-gradient(135deg, #FFD600, #FF9100);
          border: 4px solid #111;
          color: #000;
          font-size: 22px;
          font-weight: bold;
          letter-spacing: 2px;
          box-shadow: 0 4px 0 #B25D00;
          cursor: pointer;
          transition: all 0.1s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .roll-btn:active:not(:disabled) {
          transform: translateY(3px);
          box-shadow: 0 1px 0 #B25D00;
        }

        .roll-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: 0 2px 0 #777;
          border-color: #555;
          color: #444;
          background: #888;
        }

        /* Betting Grid */
        .grid-container {
          width: 100%;
          max-width: 360px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .bet-tile {
          aspect-ratio: 1 / 1;
          border-radius: 12px;
          border: 4px solid #111;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 4px 6px rgba(0,0,0,0.4);
          position: relative;
        }

        .bet-tile:active {
          transform: scale(0.95);
        }

        .bet-tile.selected {
          border-color: #FFFFFF;
          box-shadow: 0 0 14px #FFFFFF, inset 0 0 8px rgba(255,255,255,0.7);
          transform: scale(1.05);
        }
      `}} />

      {/* Main play layout */}
      <div className="flex flex-col items-center w-full max-w-[400px]">
        
        {/* Game Tray Box Container */}
        <div className="tray-box">
          <div className="tray-floor">
            
            {/* Top-Left: Active bet indicator colors */}
            <div className="bet-panel">
              {selectedBets.length === 0 ? (
                <span className="text-[10px] text-zinc-500 font-bold tracking-wider">NO BETS</span>
              ) : (
                selectedBets.map((hex, idx) => (
                  <div 
                    key={idx} 
                    className="bet-indicator-dot" 
                    style={{ backgroundColor: hex }} 
                  />
                ))
              )}
            </div>

            {/* Top-Right: Score / coins */}
            <div className="score-panel">
              <div className="coin-icon">S</div>
              <span>{score}</span>
            </div>

            {/* 3D Dice Area inside Yellow Floor */}
            <div className="dice-area">
              {dice.length === 0 ? (
                // Initial static demonstration dice before rolling
                <div className="cube-wrapper">
                  <div className="cube-spin-wrapper" style={{ transform: "rotateY(25deg) rotateX(-5deg)" }}>
                    <div className="cube">
                      <div className="cube-face face-front"><div className="face-inner" style={{ backgroundColor: "#F44336" }} /></div>
                      <div className="cube-face face-back"><div className="face-inner" style={{ backgroundColor: "#FFFFFF", border: "1px solid #ddd" }} /></div>
                      <div className="cube-face face-left"><div className="face-inner" style={{ backgroundColor: "#FFD600" }} /></div>
                      <div className="cube-face face-right"><div className="face-inner" style={{ backgroundColor: "#2979FF" }} /></div>
                      <div className="cube-face face-top"><div className="face-inner" style={{ backgroundColor: "#00C853" }} /></div>
                      <div className="cube-face face-bottom"><div className="face-inner" style={{ backgroundColor: "#FF00CC" }} /></div>
                    </div>
                  </div>
                  <div className="cube-shadow" />
                </div>
              ) : (
                // Dice in active action or result display states
                dice.map((die, idx) => {
                  const targetTransform = ROTATIONS[die.resultColor] || ROTATIONS["Green"];
                  
                  return (
                    <div key={die.id} className="cube-wrapper">
                      {/* Landing spin normalizer */}
                      <div 
                        className="cube-spin-wrapper" 
                        style={{ 
                          transform: isRolling 
                            ? "" 
                            : `rotateY(${die.randomSpinY}deg) rotateX(${die.randomTiltX}deg) rotateZ(${die.randomTiltZ}deg)` 
                        }}
                      >
                        {/* 3D Cube */}
                        <div 
                          className={`cube ${isRolling ? `tumbling-${idx}` : ""}`}
                          style={{ 
                            transform: isRolling ? "" : targetTransform
                          }}
                        >
                          <div className="cube-face face-front"><div className="face-inner" style={{ backgroundColor: "#F44336" }} /></div>
                          <div className="cube-face face-back"><div className="face-inner" style={{ backgroundColor: "#FFFFFF", border: "1px solid #ddd" }} /></div>
                          <div className="cube-face face-left"><div className="face-inner" style={{ backgroundColor: "#FFD600" }} /></div>
                          <div className="cube-face face-right"><div className="face-inner" style={{ backgroundColor: "#2979FF" }} /></div>
                          <div className="cube-face face-top"><div className="face-inner" style={{ backgroundColor: "#00C853" }} /></div>
                          <div className="cube-face face-bottom"><div className="face-inner" style={{ backgroundColor: "#FF00CC" }} /></div>
                        </div>
                      </div>
                      
                      {/* Bouncing shadows */}
                      <div className={`cube-shadow ${isRolling ? `shadow-tumbling-${idx}` : ""}`} />
                    </div>
                  );
                })
              )}
            </div>

            {/* Instruction / Status Message text in lower tray */}
            <div 
              className="status-text pulse-animation" 
              style={{ color: statusColor }}
            >
              {statusText}
            </div>

          </div>
        </div>

        {/* Action Button Row */}
        <div className="btn-row">
          <button 
            onClick={handleHome} 
            className="home-btn"
            title="Go to main hub & clear bets"
            disabled={isRolling}
          >
            🏠
          </button>
          
          <button 
            onClick={handleRoll} 
            disabled={isRolling || selectedBets.length === 0} 
            className="roll-btn"
          >
            ROLL
          </button>
        </div>

        {/* Betting Grid filled full width */}
        <div className="grid-container">
          {/* Row 1: Yellow | White | Magenta */}
          {[
            COLORS.find(c => c.name === "Yellow"),
            COLORS.find(c => c.name === "White"),
            COLORS.find(c => c.name === "Magenta"),
            COLORS.find(c => c.name === "Blue"),
            COLORS.find(c => c.name === "Red"),
            COLORS.find(c => c.name === "Green"),
          ].map((c) => {
            if (!c) return null;
            const isSelected = selectedBets.includes(c.hex);
            return (
              <div
                key={c.name}
                onClick={() => handleSelectTile(c.hex)}
                className={`bet-tile ${isSelected ? "selected" : ""}`}
                style={{ 
                  backgroundColor: c.hex,
                  borderColor: c.name === "White" ? "#DDD" : "#111" // Add gray border to white so it's fully visible
                }}
              />
            );
          })}
        </div>

      </div>

    </div>
  );
};
