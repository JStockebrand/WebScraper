import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Mail } from 'lucide-react';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/auth/forgot-password', {
        email: email.trim(),
      });

      if (response.ok) {
        setEmailSent(true);
        toast({
          title: "Reset Email Sent",
          description: "Check your inbox for password reset instructions",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send reset email');
      }
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setEmailSent(false);
    setIsLoading(false);
    onOpenChange(false);
  };

  if (emailSent) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full">
              <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <DialogTitle className="text-center">Check Your Email</DialogTitle>
            <DialogDescription className="text-center">
              We've sent password reset instructions to <strong>{email}</strong>
              <br />
              <small className="text-muted-foreground mt-2 block">
                Note: Password reset is only available for verified email addresses
              </small>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground text-center">
              <p>Didn't receive the email? Check your spam folder or try again.</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setEmailSent(false)} variant="outline" className="w-full">
                Try Different Email
              </Button>
              <Button onClick={handleClose} className="w-full">
                Back to Login
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forgot Password?</DialogTitle>
          <DialogDescription>
            Enter your email address and we'll send you instructions to reset your password.
            <br />
            <small className="text-muted-foreground mt-2 block">
              Note: Password reset is only available for verified email addresses.
            </small>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email Address</Label>
            <Input
              id="reset-email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              type="submit" 
              disabled={isLoading || !email.trim()}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Instructions
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}