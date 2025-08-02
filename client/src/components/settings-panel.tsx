import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: string;
  soundEnabled: boolean;
  scanlinesEnabled: boolean;
  onThemeChange: (theme: string) => void;
  onSoundChange: (enabled: boolean) => void;
  onScanlinesChange: (enabled: boolean) => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  currentTheme,
  soundEnabled,
  scanlinesEnabled,
  onThemeChange,
  onSoundChange,
  onScanlinesChange
}: SettingsPanelProps) {
  
  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('ethosTerminalTheme', currentTheme);
    localStorage.setItem('ethosTerminalSound', soundEnabled.toString());
    localStorage.setItem('ethosTerminalScanlines', scanlinesEnabled.toString());
    
    onClose();
  };

  const themes = [
    { value: 'amber', label: 'Classic Amber' },
    { value: 'green-matrix', label: 'Matrix Green' },
    { value: 'blue-ibm', label: 'IBM Blue' },
    { value: 'green-apple', label: 'Apple II Green' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-2 border-gray-600 text-amber-terminal max-w-md">
        <DialogHeader>
          <DialogTitle className="font-bold text-amber-terminal">
            TERMINAL SETTINGS
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-sm text-gray-300">COLOR SCHEME</Label>
            <Select value={currentTheme} onValueChange={onThemeChange}>
              <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-gray-300 font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {themes.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value} className="text-gray-300 font-mono">
                    {theme.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-3">
            <Label className="text-sm text-gray-300">SOUND EFFECTS</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sound-enabled"
                checked={soundEnabled}
                onCheckedChange={onSoundChange}
                className="border-gray-600"
              />
              <Label htmlFor="sound-enabled" className="text-gray-300 font-mono text-sm">
                Enable typing sounds
              </Label>
            </div>
          </div>
          
          <div className="space-y-3">
            <Label className="text-sm text-gray-300">SCAN LINES</Label>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="scanlines-enabled"
                checked={scanlinesEnabled}
                onCheckedChange={onScanlinesChange}
                className="border-gray-600"
              />
              <Label htmlFor="scanlines-enabled" className="text-gray-300 font-mono text-sm">
                Enable scan line effects
              </Label>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <Button
            onClick={handleSave}
            className="retro-button flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300"
          >
            SAVE
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="retro-button flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            CANCEL
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
