import { useState } from 'react';
import { LogOut, User, Search, Settings } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.charAt(0).toUpperCase();
  };

  const getSubscriptionBadge = (tier: string) => {
    const colors = {
      free: 'bg-gray-100 text-gray-800',
      pro: 'bg-blue-100 text-blue-800',
      premium: 'bg-purple-100 text-purple-800',
    };
    return colors[tier as keyof typeof colors] || colors.free;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-600 text-white">
              {getInitials(user.displayName, user.email)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium leading-none">
              {user.displayName || 'User'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full ${getSubscriptionBadge(user.subscriptionTier)}`}>
                {user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-2">
          <div className="text-xs text-muted-foreground mb-1">Search Usage</div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Search className="h-3 w-3" />
              <span className="text-sm">
                {user.searchesUsed} / {user.searchesLimit}
              </span>
            </div>
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ 
                  width: `${Math.min((user.searchesUsed / user.searchesLimit) * 100, 100)}%` 
                }}
              ></div>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => setLocation('/account')}>
          <User className="mr-2 h-4 w-4" />
          <span>Account & History</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocation('/subscribe')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Upgrade Plan</span>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleSignOut}
          disabled={isLoading}
          className="text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}