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
      <div className="terminal-window w-full max-w-5xl h-[85vh] min-h-[600px] mx-auto">
        {/* Terminal Title Bar */}
        <div className="terminal-titlebar">
          <div className="terminal-controls">
            <div className="terminal-control close"></div>
            <div className="terminal-control minimize"></div>
            <div className="terminal-control maximize"></div>
          </div>
          <div className="terminal-title">
            Ethos Network Terminal
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-gray-400 hover:text-white transition-colors"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              Sound: {soundEnabled ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
        
        {/* Terminal Content */}
        <div 
          ref={terminalRef}
          className="terminal-content h-full overflow-hidden flex flex-col"
          onClick={handleTerminalClick}
        >
          {/* Terminal Output */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {output.map((line, index) => (
              <div key={index} className="leading-relaxed">
                {line}
              </div>
            ))}
          </div>
          
          {/* Terminal Input Line */}
          {!isBooting && (
            <div className="flex items-center gap-2 py-2 border-t border-gray-700">
              <span className="prompt select-none">➜</span>
              <span className="text-gray-400 select-none">ethos</span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="flex-1 bg-transparent border-none text-current outline-none placeholder-gray-500"
                placeholder="Ask about Ethos Network data..."
                autoComplete="off"
                spellCheck="false"
                disabled={isBooting || isLoading}
              />
              {isLoading && (
                <div className="text-gray-400 text-sm">Processing...</div>
              )}
            </div>
          )}
          
          {/* Quick Commands */}
          <div className="flex gap-2 mt-2 flex-wrap">
            <button
              className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
              onClick={() => executeCommand('help')}
            >
              Help
            </button>
            <button
              className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
              onClick={() => executeCommand('clear')}
            >
              Clear
            </button>
            <button
              className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
              onClick={() => executeCommand('xp of cookedzera')}
            >
              Example: XP
            </button>
            <button
              className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
              onClick={() => executeCommand('score of serpinxbt')}
            >
              Example: Score
            </button>
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
