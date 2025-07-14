import { useState } from "react";
import { Search, FileText, Loader2, ExternalLink, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest } from "@/lib/queryClient";

interface SearchResult {
  title: string;
  url: string;
  summary: string;
  confidence: number;
  scrapingStatus: string;
  readingTime: string;
}

interface SearchData {
  search: {
    query: string;
    status: string;
    totalResults: number;
    originalResultsCount?: number;
  };
  results: SearchResult[];
  searchedUrls?: Array<{
    title: string;
    url: string;
    domain: string;
  }>;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchData, setSearchData] = useState<SearchData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setSearchData(null);

    try {
      // Start search
      const searchResponse = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() })
      });

      const { searchId } = await searchResponse.json();
      
      // Poll for results
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const resultResponse = await fetch(`/api/search/${searchId}`);
        const data = await resultResponse.json();
        
        if (data.search.status === 'completed') {
          setSearchData(data);
          break;
        } else if (data.search.status === 'error') {
          setError('Search failed. Please try again.');
          break;
        }
        
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        setError('Search timed out. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <div className="flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">Web Research Tool</h1>
          </div>
          <p className="text-gray-600">Enter any topic to get high-quality summaries (80%+ confidence) from web sources</p>
        </div>

        {/* Search Input */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter your research topic (e.g., 'artificial intelligence trends', 'climate change solutions')"
                className="flex-1 text-lg"
                disabled={loading}
              />
              <Button 
                onClick={handleSearch} 
                disabled={loading || !query.trim()}
                className="px-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Card className="mb-8">
            <CardContent className="p-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-semibold mb-2">Researching your topic...</h3>
              <p className="text-gray-600">Finding 10 relevant sources, scraping content, and creating one comprehensive summary</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="mb-8 border-red-200">
            <CardContent className="p-6 text-center">
              <div className="text-red-500 text-xl mb-2">⚠️</div>
              <h3 className="text-lg font-semibold text-red-700 mb-2">Search Failed</h3>
              <p className="text-red-600">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {searchData && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Research Summary: "{searchData.search.query}"
              </h2>
              <p className="text-gray-600">
                Consolidated analysis from {searchData.results.length} sources - One comprehensive summary combining all findings
              </p>
            </div>

            {/* Show searched URLs */}
            {searchData.searchedUrls && searchData.searchedUrls.length > 0 && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <List className="w-4 h-4 mr-2" />
                    View All {searchData.searchedUrls.length} Searched URLs
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Sources Searched</CardTitle>
                      <CardDescription>
                        All {searchData.searchedUrls.length} URLs that were found and processed for this search
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {searchData.searchedUrls.map((url, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{url.title}</p>
                              <p className="text-xs text-gray-500">{url.domain}</p>
                            </div>
                            <a
                              href={url.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-3 p-1 text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Consolidated Summary */}
            {searchData.results.length > 0 && (
              <Card className="mb-6 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-xl text-blue-900 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Comprehensive Summary
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    Consolidated analysis from {searchData.results.filter(r => r.scrapingStatus === 'success').length} successfully scraped sources
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-900 leading-relaxed text-base">
                    {searchData.results[0]?.summary || 'Summary not available'}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {searchData.results[0]?.confidence || 0}% confidence
                    </Badge>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      {searchData.results.filter(r => r.scrapingStatus === 'success').length} sources
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Individual Source URLs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Source URLs Processed</CardTitle>
                <CardDescription>
                  All {searchData.results.length} URLs found and processed for this search
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {searchData.results.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate mb-1">{result.title}</p>
                        <div className="flex items-center gap-2 mb-2">
                          <a 
                            href={result.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline truncate"
                          >
                            {result.url}
                          </a>
                        </div>
                        <div className="flex gap-2">
                          <Badge 
                            variant={result.scrapingStatus === 'success' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {result.scrapingStatus}
                          </Badge>
                          {result.readingTime && (
                            <Badge variant="outline" className="text-xs">
                              {result.readingTime}
                            </Badge>
                          )}
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              result.confidence >= 80 ? 'bg-green-100 text-green-800' :
                              result.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}
                          >
                            {result.confidence}% confidence
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!loading && !searchData && !error && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to research?</h3>
            <p className="text-gray-500">
              Enter any topic above to get comprehensive summaries from multiple web sources
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
