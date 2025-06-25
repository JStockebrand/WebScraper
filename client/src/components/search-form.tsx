import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SearchFormProps {
  onSubmit: (query: string, searchId: number) => void;
  disabled?: boolean;
}

export default function SearchForm({ onSubmit, disabled }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [includeRecent, setIncludeRecent] = useState(true);
  const [academicOnly, setAcademicOnly] = useState(false);
  const [includeImages, setIncludeImages] = useState(false);
  
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string) => {
      const response = await apiRequest("POST", "/api/search", { query: searchQuery });
      return response.json();
    },
    onSuccess: (data) => {
      onSubmit(query, data.searchId);
    },
    onError: (error) => {
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to start search",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    searchMutation.mutate(query.trim());
  };

  const exampleQueries = [
    "Latest AI developments",
    "Climate change solutions", 
    "Cryptocurrency trends",
    "Remote work best practices"
  ];

  return (
    <div className="mb-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-4">
          Search, Scrape & Summarize the Web
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Enter your search query and get AI-powered summaries from the top 5 search results instantly.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative">
            <Input
              type="text"
              placeholder="Enter your search query (e.g., latest AI developments, climate change solutions...)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full px-6 py-4 text-lg pr-40"
              disabled={disabled}
            />
            <Button
              type="submit"
              disabled={!query.trim() || disabled || searchMutation.isPending}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 px-6 py-2"
            >
              <Search className="h-4 w-4 mr-2" />
              {searchMutation.isPending ? "Searching..." : "Search & Analyze"}
            </Button>
          </div>
        </form>

        {/* Search Options */}
        <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
          <label className="flex items-center space-x-2 cursor-pointer">
            <Checkbox 
              checked={includeRecent}
              onCheckedChange={setIncludeRecent}
            />
            <span className="text-muted-foreground">Include recent articles</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <Checkbox 
              checked={academicOnly}
              onCheckedChange={setAcademicOnly}
            />
            <span className="text-muted-foreground">Academic sources only</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer">
            <Checkbox 
              checked={includeImages}
              onCheckedChange={setIncludeImages}
            />
            <span className="text-muted-foreground">Include images</span>
          </label>
        </div>

        {/* Example Queries */}
        <div className="mt-8 bg-muted/50 rounded-xl p-6">
          <h4 className="font-semibold text-foreground mb-4 text-center">Popular Search Examples:</h4>
          <div className="flex flex-wrap justify-center gap-2">
            {exampleQueries.map((exampleQuery) => (
              <Button
                key={exampleQuery}
                variant="outline"
                size="sm"
                onClick={() => setQuery(exampleQuery)}
                disabled={disabled}
              >
                {exampleQuery}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
