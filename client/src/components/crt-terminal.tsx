import { useState, useRef, useEffect } from "react";
import { useTerminal } from "@/hooks/use-terminal";
import { useSound } from "@/hooks/use-sound";
import SettingsPanel from "@/components/settings-panel";
import { Button } from "@/components/ui/button";

export default function CRTTerminal() {
  const [showSettings, setShowSettings] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('amber');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanlinesEnabled, setScanlinesEnabled] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    output,
    input,
    setInput,
    handleCommand,
    commandHistory,
    historyIndex,
    setHistoryIndex,
    isBooting,
    isLoading
  } = useTerminal();

  const { playTypingSound } = useSound(soundEnabled);

  useEffect(() => {
    // Load settings from localStorage
    const savedTheme = localStorage.getItem('ethosTerminalTheme') || 'amber';
    const savedSound = localStorage.getItem('ethosTerminalSound') !== 'false';
    const savedScanlines = localStorage.getItem('ethosTerminalScanlines') !== 'false';
    
    setCurrentTheme(savedTheme);
    setSoundEnabled(savedSound);
    setScanlinesEnabled(savedScanlines);
  }, []);

  useEffect(() => {
    if (!isBooting && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isBooting]);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isBooting) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      if (input.trim()) {
        handleCommand(input.trim());
        setInput('');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key.length === 1 && soundEnabled) {
      playTypingSound();
    }
  };

  const handleTerminalClick = () => {
    if (!isBooting && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const executeCommand = (command: string) => {
    handleCommand(command);
  };

  const themeClasses = {
    amber: 'theme-amber',
    'green-matrix': 'theme-green-matrix',
    'blue-ibm': 'theme-blue-ibm',
    'green-apple': 'theme-green-apple'
  };

  return (
    <>
      <div className="crt-monitor w-full max-w-6xl h-[90vh] min-h-[600px] p-6">
        <div className="crt-screen h-full relative bg-black">
          {/* Scanlines */}
          {scanlinesEnabled && (
            <>
              <div className="scanlines"></div>
              <div className="scanline-animation animate-scanline"></div>
            </>
          )}
          
          {/* Terminal Interface */}
          <div 
            ref={terminalRef}
            className={`terminal-content ${themeClasses[currentTheme as keyof typeof themeClasses]} phosphor-glow h-full p-6 overflow-hidden flex flex-col relative z-20 ${isLoading ? 'animate-screen-flicker' : ''}`}
            onClick={handleTerminalClick}
          >
            {/* Terminal Header */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">ETHOS TERMINAL v2.1</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="retro-button text-xs"
                    onClick={() => setShowSettings(true)}
                  >
                    SETTINGS
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="retro-button text-xs"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                  >
                    SOUND: {soundEnabled ? 'ON' : 'OFF'}
                  </Button>
                </div>
              </div>
              <div className="h-px bg-current opacity-30 mb-4"></div>
            </div>
            
            {/* Terminal Output */}
            <div className="flex-1 overflow-y-auto mb-4 space-y-1">
              {output.map((line, index) => (
                <div key={index} className="animate-boot-text">
                  {line}
                </div>
              ))}
            </div>
            
            {/* Terminal Input Line */}
            {!isBooting && (
              <div className="flex items-center">
                <span className="mr-2">ethos@terminal:~$</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  className="terminal-input flex-1 bg-transparent border-none text-current font-mono phosphor-glow outline-none"
                  autoComplete="off"
                  spellCheck="false"
                  disabled={isBooting || isLoading}
                />
                <span className="animate-cursor-blink ml-1">█</span>
              </div>
            )}
            
            {/* Mobile Quick Actions */}
            <div className="md:hidden mt-4 flex gap-2 flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                className="retro-button text-xs"
                onClick={() => executeCommand('help')}
              >
                HELP
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="retro-button text-xs"
                onClick={() => executeCommand('clear')}
              >
                CLEAR
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="retro-button text-xs"
                onClick={() => executeCommand('history')}
              >
                HISTORY
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentTheme={currentTheme}
        soundEnabled={soundEnabled}
        scanlinesEnabled={scanlinesEnabled}
        onThemeChange={setCurrentTheme}
        onSoundChange={setSoundEnabled}
        onScanlinesChange={setScanlinesEnabled}
      />
    </>
  );
}
