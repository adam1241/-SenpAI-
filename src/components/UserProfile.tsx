import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, HelpCircle, LogOut, CreditCard, Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface UserProfileProps {
  isCollapsed?: boolean;
}

export const UserProfile = ({ isCollapsed = false }: UserProfileProps) => {
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleUpgrade = () => {
    console.log("Upgrade plan");
    setIsOpen(false);
  };

  const handleSettings = () => {
    console.log("Open settings");
    setIsOpen(false);
  };

  const handleHelp = () => {
    console.log("Open help");
    setIsOpen(false);
  };

  const handleLogout = () => {
    console.log("Logout");
    setIsOpen(false);
  };

  return (
    <div className="h-16 flex items-center px-3">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full h-12 gap-3 hover:bg-primary/10 rounded-lg ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'}`}
              >
                <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-background shadow-sm">
                  <AvatarImage src="/api/placeholder/32/32" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-medium">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                {!isCollapsed && (
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">User</div>
                    <div className="text-xs text-muted-foreground truncate">Free plan</div>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right">
              <p>User Menu</p>
            </TooltipContent>
          )}
        </Tooltip>
        
        <DropdownMenuContent 
          side="top" 
          align="start" 
          className="w-56 mb-2 bg-popover/95 backdrop-blur-sm border border-border shadow-xl rounded-xl"
        >
          <DropdownMenuItem onClick={handleUpgrade} className="gap-2 cursor-pointer">
            <CreditCard className="w-4 h-4" />
            Upgrade your plan
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleSettings} className="gap-2 cursor-pointer">
            <Settings className="w-4 h-4" />
            Settings
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={toggleTheme} className="gap-2 cursor-pointer">
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4" />
                Light mode
              </>
            ) : (
              <>
                <Moon className="w-4 h-4" />
                Dark mode
              </>
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleHelp} className="gap-2 cursor-pointer">
            <HelpCircle className="w-4 h-4" />
            Help
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleLogout} className="gap-2 cursor-pointer text-destructive">
            <LogOut className="w-4 h-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};