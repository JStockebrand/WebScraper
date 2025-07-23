import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, Mail, CheckCircle } from 'lucide-react';

interface EmailVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  onVerificationComplete: () => void;
}

export function EmailVerificationDialog({ 
  open, 
  onOpenChange, 
  email, 
  onVerificationComplete 
}: EmailVerificationDialogProps) {
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      
      const response = await apiRequest('POST', '/api/auth/resend-verification', {
        email: email,
      });

      if (response.ok) {
        toast({
          title: "Verification Email Sent",
          description: "We've sent another verification email. Please check your inbox.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resend verification email');
      }
    } catch (error: any) {
      toast({
        title: "Resend Failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full">
            <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-center">Verify Your Email</DialogTitle>
          <DialogDescription className="text-center">
            We've sent a verification link to <strong>{email}</strong>
            <br />
            <small className="text-muted-foreground mt-2 block">
              Please check your email and click the verification link to complete your registration.
            </small>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium mb-1">Next Steps:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Check your email inbox for a verification message</li>
                  <li>Click the verification link in the email</li>
                  <li>You'll be redirected back here to complete your registration</li>
                </ol>
              </div>
            </div>
          </div>
          
          <div className="text-sm text-muted-foreground text-center">
            <p>Didn't receive the email? Check your spam folder or try again.</p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleResendVerification} 
              variant="outline" 
              className="w-full"
              disabled={isResending}
            >
              {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Resend Verification Email
            </Button>
            
            <Button onClick={handleClose} variant="ghost" className="w-full">
              I'll Verify Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}