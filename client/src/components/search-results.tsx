import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExternalLink, Share, Bookmark, RefreshCw, Download, Mail, SearchCode, Globe, Calendar, Clock, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import type { Search, SearchResult } from "@shared/schema";

interface SearchResultsProps {
  searchId: number;
  searchQuery: string;
}

interface SearchData {
  search: Search;
  results: SearchResult[];
}

export default function SearchResults({ searchId, searchQuery }: SearchResultsProps) {
  const { data, isLoading } = useQuery<SearchData>({
    queryKey: ["/api/search", searchId],
    enabled: !!searchId,
  });

  if (isLoading || !data) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground">Loading results...</div>
      </div>
    );
  }

  const { search, results } = data;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Successfully scraped';
      case 'partial':
        return 'Partial content';
      case 'failed':
        return 'Scraping failed';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'partial':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-foreground">
          Search Results for <span className="text-primary">"{searchQuery}"</span>
        </h3>
        <div className="text-sm text-muted-foreground">
          Found {results.length} results in {search.searchTime ? (search.searchTime / 1000).toFixed(1) : '0'} seconds
        </div>
      </div>

      {results.map((result) => (
        <Card key={result.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-foreground mb-2 hover:text-primary cursor-pointer transition-colors">
                  {result.title}
                </h4>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center space-x-1">
                    <Globe className="h-4 w-4" />
                    <span>{result.domain}</span>
                  </span>
                  {result.publishedDate && (
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{result.publishedDate}</span>
                    </span>
                  )}
                  {result.readingTime && (
                    <span className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{result.readingTime}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <Badge variant="outline" className={getStatusColor(result.scrapingStatus)}>
                  {getStatusIcon(result.scrapingStatus)}
                  <span className="ml-1">{getStatusText(result.scrapingStatus)}</span>
                </Badge>
                <Button variant="ghost" size="sm">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {result.summary && (
              <div className="mb-4">
                <h5 className="font-medium text-foreground mb-2">AI Summary:</h5>
                <p className="text-muted-foreground leading-relaxed">
                  {result.summary}
                </p>
              </div>
            )}

            {result.scrapingStatus === 'failed' && result.errorMessage && (
              <div className="mb-4">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="text-red-500 h-5 w-5 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-red-800 mb-1">Unable to scrape content</h5>
                      <p className="text-sm text-red-700">
                        {result.errorMessage}. {' '}
                        <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">
                          View original source
                        </a> for full content.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {result.scrapingStatus === 'partial' && (
              <div className="mb-4">
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                  <p className="text-sm text-yellow-700">
                    <AlertTriangle className="inline h-4 w-4 mr-2" />
                    Some content may be behind a paywall or login requirement. Summary generated from available preview text.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 border-t border-border">
              <div className="flex items-center space-x-4">
                {result.confidence !== null && result.confidence !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    Confidence: <span className={`font-medium ${getConfidenceColor(result.confidence)}`}>{result.confidence}%</span>
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  Sources: <span className="font-medium">{result.sourcesCount || 0} cited</span>
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="link" size="sm" asChild>
                  <a href={result.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Read Original
                  </a>
                </Button>
                {result.scrapingStatus === 'failed' ? (
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                ) : (
                  <Button variant="outline" size="sm">
                    <Share className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Summary Actions */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h4 className="text-lg font-semibold text-foreground mb-4">Research Summary Actions</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="flex items-center justify-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Export PDF Report</span>
            </Button>
            <Button variant="secondary" className="flex items-center justify-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Email Summary</span>
            </Button>
            <Button variant="outline" className="flex items-center justify-center space-x-2">
              <SearchCode className="h-4 w-4" />
              <span>Refine Search</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
