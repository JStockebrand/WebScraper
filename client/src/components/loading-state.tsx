import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  searchId: number;
  onComplete: () => void;
  onError: () => void;
}

export default function LoadingState({ searchId, onComplete, onError }: LoadingStateProps) {
  const [loadingMessage, setLoadingMessage] = useState("Finding relevant sources");
  const [progressWidth, setProgressWidth] = useState(33);

  const { data, error } = useQuery({
    queryKey: ["/api/search", searchId],
    refetchInterval: 2000,
    enabled: !!searchId,
  });

  useEffect(() => {
    if (data?.search?.status === 'completed') {
      setLoadingMessage("Analysis complete");
      setProgressWidth(100);
      setTimeout(() => onComplete(), 500);
    } else if (data?.search?.status === 'error') {
      onError();
    } else {
      // Update loading message and progress based on time
      const messages = [
        "Finding relevant sources",
        "Scraping web content",
        "Generating AI summaries"
      ];
      
      const intervals = [33, 66, 90];
      
      setTimeout(() => {
        setLoadingMessage(messages[1]);
        setProgressWidth(intervals[1]);
      }, 3000);
      
      setTimeout(() => {
        setLoadingMessage(messages[2]);
        setProgressWidth(intervals[2]);
      }, 6000);
    }
  }, [data, onComplete, onError]);

  if (error) {
    onError();
    return null;
  }

  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center space-x-4 bg-white rounded-xl px-8 py-6 shadow-lg border border-border">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-left">
          <div className="font-semibold text-foreground">Searching the web...</div>
          <div className="text-sm text-muted-foreground">{loadingMessage}</div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mt-8 max-w-md mx-auto">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Search</span>
          <span>Scrape</span>
          <span>Summarize</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500" 
            style={{ width: `${progressWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
}
