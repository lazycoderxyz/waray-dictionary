'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase';

type Word = {
  id: number;
  waray_word: string;
  waray_stress: string;
  alternate_spelling: string;
  part_of_speech: string;
  english_definition: string;
  sentence_example: string;
  english_sentence_translation: string;
  audio_url: string;
  image_url: string;
  cultural_context: string;
  search_count: number;
};

// Improved function to format cultural context
const formatCulturalContext = (text: string) => {
  if (!text) return null;
  
  // Pre-process: Convert markdown-style formatting
  let processedText = text
    .replace(/\*\*([^*]+)\*\*/g, '<<BOLD>>$1<</BOLD>>')  // **bold** 
    .replace(/\*([^*]+)\*/g, '$1');  // *italic* just remove asterisks
  
  // Normalize: Add colon after emoji headers that don't have one
  // Pattern: emoji followed by title text, then newline with dash or end
  processedText = processedText.replace(
    /(🏠|🌱|🙏|📖|🎭|📚|📜|⚖️|🤙|✨|💡|🔍|💬|🎯|📝|🌟|🎨|🌿|⛪|🌊|🌙|☀️|🔥|💀|👻|🎵|🎶|🏆|💪|❤️|🌸|🌺|🌴|🐃|🍚|🎋|💧|⭐|🎪|👑|⚔️|🏹|🎣|🏝️|🗻|🌅|🌄)\s*([A-Za-z][A-Za-z\s&]+?)(?=\s*\n|\s*-\s)/g,
    '$1 $2:'
  );
  
  // Also handle inline emoji sections (no line breaks)
  const emojiCount = (processedText.match(/🏠|🌱|🙏|📖|🎭|📚|📜|⚖️|🤙/g) || []).length;
  const hasProperLineBreaks = processedText.includes('\n\n') || processedText.includes('\n🙏') || processedText.includes('\n📖');
  
  if (emojiCount > 1 && !hasProperLineBreaks) {
    // Add line breaks before emoji markers for inline format
    processedText = processedText.replace(
      /\s*(🏠|🌱|🙏|📖|🎭|📚|📜|⚖️|🤙)\s*/g, 
      '\n\n$1 '
    );
  }
  
  // Define header patterns to split on
  const headerPatterns = [
    'Agricultural & Ritual Timing',
    'Spiritual Significance',
    'Eclipse Beliefs',
    'LITERATURE REFERENCES',
    'ARTS & PERFORMANCE',
    'HISTORICAL SIGNIFICANCE',
    'Historical Significance',
    'Cultural Context',
    'Spiritual Role',
    'Literature & Proverbs',
    'Literature',
    'Folklore & Arts',
    'References',
    'Etymology',
    'Modern Usage',
    'Traditional Usage',
    'Historical Background',
    'Religious Significance',
    'Social Significance',
    'Economic Importance',
    'Mythology',
    'Folklore',
    'Dual Meaning',
    'Physical Description',
    'Metaphorical Meaning',
    'Types of',
    'Central Role',
    'Community',
    'Family',
    'Related Terms',
    'Pre-Colonial Era',
    'Spanish Colonial Impact',
    'Modern Context',
    'Everyday use',
    'FOLKLORE CONNECTIONS',
    'RELATED WARAY TERMS'
  ];
  
  // Create regex pattern to match headers
  // Match: optional emoji + header text + colon or dash
  const headerRegex = new RegExp(
    `(🏠|🌱|🙏|📖|🎭|📚|📜|⚖️|🤙|✨)?\\s*(${headerPatterns.join('|')}|[A-Z][A-Z\\s&]{2,})\\s*[:|-]`,
    'g'
  );
  
  // Find all headers
  const matches: { header: string; emoji?: string; index: number; length: number }[] = [];
  let match;
  
  while ((match = headerRegex.exec(processedText)) !== null) {
    matches.push({
      emoji: match[1]?.trim(),
      header: match[2]?.trim(),
      index: match.index,
      length: match[0].length
    });
  }
  
  // Process matches
  if (matches.length === 0) {
    // No headers found - just return formatted text with bullet points
    return formatContentWithBullets(processedText);
  }
  
  // Build parts array
  const parts: { type: 'intro' | 'section'; header?: string; emoji?: string; content: string }[] = [];
  
  // Get intro text (before first header)
  if (matches[0].index > 0) {
    const introText = processedText.substring(0, matches[0].index).trim();
    if (introText && introText.length > 10) {
      parts.push({ type: 'intro', content: introText });
    }
  }
  
  // Process each section
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const nextMatch = matches[i + 1];
    
    const contentStart = currentMatch.index + currentMatch.length;
    const contentEnd = nextMatch ? nextMatch.index : processedText.length;
    const content = processedText.substring(contentStart, contentEnd).trim();
    
    parts.push({
      type: 'section',
      emoji: currentMatch.emoji,
      header: currentMatch.header,
      content: content
    });
  }
  
  // Render the parts
  return (
    <div className="space-y-4">
      {parts.map((part, index) => {
        if (part.type === 'intro') {
          return (
            <p key={index} className="text-amber-900 text-sm leading-relaxed">
              {renderFormattedText(part.content)}
            </p>
          );
        }
        
        // It's a section with header
        const isAllCaps = part.header === part.header?.toUpperCase() && part.header && part.header.length > 3;
        
        return (
          <div 
            key={index} 
            className={`
              ${isAllCaps 
                ? 'bg-amber-100/70 border-l-4 border-amber-500 pl-4 py-3 rounded-r-lg' 
                : 'border-l-4 border-amber-300 pl-4 py-2'
              }
            `}
          >
            <h4 className={`
              font-bold mb-2 
              ${isAllCaps ? 'text-amber-900 text-base' : 'text-amber-800 text-sm'}
            `}>
              {part.emoji && `${part.emoji} `}{part.header}
            </h4>
            <div className="ml-1">
              {formatContentWithBullets(part.content || '')}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Helper function to render text with bold markers
const renderFormattedText = (text: string) => {
  if (!text.includes('<<BOLD>>')) {
    return text;
  }
  
  const parts = text.split(/(<<BOLD>>.*?<<\/BOLD>>)/g);
  return parts.map((part, i) => {
    if (part.startsWith('<<BOLD>>')) {
      const boldText = part.replace('<<BOLD>>', '').replace('<</BOLD>>', '');
      return <strong key={i} className="font-semibold">{boldText}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

// Helper function to format content with bullet points
const formatContentWithBullets = (content: string) => {
  if (!content) return null;
  
  // Clean up content - remove leading dashes and normalize
  let cleanContent = content.trim();
  
  // Split by newline + dash pattern OR just dash pattern
  const lines = cleanContent.split(/\n/).map(l => l.trim()).filter(l => l);
  
  // Check if content has bullet-style lines (starting with -)
  const bulletLines = lines.filter(l => l.startsWith('-'));
  const nonBulletLines = lines.filter(l => !l.startsWith('-'));
  
  if (bulletLines.length === 0) {
    // No bullet points, return as paragraph
    return <p className="text-amber-900 text-sm leading-relaxed">{renderFormattedText(cleanContent)}</p>;
  }
  
  // Has bullet points
  return (
    <div className="space-y-2">
      {nonBulletLines.length > 0 && (
        <p className="text-amber-900 text-sm leading-relaxed mb-2">
          {renderFormattedText(nonBulletLines.join(' '))}
        </p>
      )}
      <ul className="space-y-2">
        {bulletLines.map((line, index) => {
          // Remove leading dash
          const trimmedPoint = line.replace(/^-\s*/, '').trim();
          if (!trimmedPoint) return null;
          
          // Check for quoted text (proverbs)
          if (trimmedPoint.includes('"')) {
            return (
              <li key={index} className="flex items-start gap-2 text-amber-900 text-sm">
                <span className="text-amber-500 mt-0.5">•</span>
                <span className="leading-relaxed">
                  {trimmedPoint.split(/(".*?")/).map((segment, i) => {
                    if (segment.startsWith('"') && segment.endsWith('"')) {
                      return <span key={i} className="italic text-amber-800 font-medium">{segment}</span>;
                    }
                    return <span key={i}>{renderFormattedText(segment)}</span>;
                  })}
                </span>
              </li>
            );
          }
          
          // Regular bullet point
          return (
            <li key={index} className="flex items-start gap-2 text-amber-900 text-sm">
              <span className="text-amber-500 mt-0.5">•</span>
              <span className="leading-relaxed">{renderFormattedText(trimmedPoint)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<'search' | 'ai-translate' | 'sealion'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [topWords, setTopWords] = useState<Word[]>([]);
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const [expandedContext, setExpandedContext] = useState<number | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // AI translation states (Groq)
  const [aiInputText, setAiInputText] = useState('');
  const [aiTranslation, setAiTranslation] = useState('');
  const [aiDirection, setAiDirection] = useState<'waray-to-english' | 'english-to-waray'>('waray-to-english');
  const [isAiTranslating, setIsAiTranslating] = useState(false);
  const [hasAiTranslated, setHasAiTranslated] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiLatency, setAiLatency] = useState<number | null>(null);

  // SeaLion AI translation states
  const [sealionInputText, setSealionInputText] = useState('');
  const [sealionTranslation, setSealionTranslation] = useState('');
  const [sealionDirection, setSealionDirection] = useState<'waray-to-english' | 'english-to-waray'>('waray-to-english');
  const [isSealionTranslating, setIsSealionTranslating] = useState(false);
  const [hasSealionTranslated, setHasSealionTranslated] = useState(false);
  const [sealionError, setSealionError] = useState('');
  const [sealionLatency, setSealionLatency] = useState<number | null>(null);

  const STORAGE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public';

  useEffect(() => {
    const fetchTopWords = async () => {
      const { data } = await supabase
        .from('words')
        .select('*')
        .order('search_count', { ascending: false })
        .limit(5);

      if (data) {
        setTopWords(data);
      }
    };

    fetchTopWords();
  }, []);

  // Helper function to sort search results
  const sortSearchResults = (data: Word[], term: string): Word[] => {
    const searchLower = term.trim().toLowerCase();
    
    return [...data].sort((a, b) => {
      const aWord = a.waray_word.toLowerCase();
      const bWord = b.waray_word.toLowerCase();
      const aEnglish = a.english_definition?.toLowerCase() || '';
      const bEnglish = b.english_definition?.toLowerCase() || '';

      // Priority 1: Exact match on Waray word
      const aExactWaray = aWord === searchLower;
      const bExactWaray = bWord === searchLower;
      if (aExactWaray && !bExactWaray) return -1;
      if (!aExactWaray && bExactWaray) return 1;

      // Priority 2: Exact match on English definition word
      const aExactEnglish = aEnglish.split(/[;,]/).some(def => def.trim().toLowerCase() === searchLower);
      const bExactEnglish = bEnglish.split(/[;,]/).some(def => def.trim().toLowerCase() === searchLower);
      if (aExactEnglish && !bExactEnglish) return -1;
      if (!aExactEnglish && bExactEnglish) return 1;

      // Priority 3: Waray word starts with search term
      const aStartsWaray = aWord.startsWith(searchLower);
      const bStartsWaray = bWord.startsWith(searchLower);
      if (aStartsWaray && !bStartsWaray) return -1;
      if (!aStartsWaray && bStartsWaray) return 1;

      // Priority 4: Waray word contains search term
      const aContainsWaray = aWord.includes(searchLower);
      const bContainsWaray = bWord.includes(searchLower);
      if (aContainsWaray && !bContainsWaray) return -1;
      if (!aContainsWaray && bContainsWaray) return 1;

      // Priority 5: Alphabetical order
      return aWord.localeCompare(bWord);
    });
  };

  // Search handlers
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    setExpandedContext(null);

    const { data, error } = await supabase
      .from('words')
      .select('*')
      .ilike('waray_word', `%${searchTerm}%`)
      .limit(20);

    if (error) {
      console.error('Search error:', error);
    } else {
      const sortedData = sortSearchResults(data || [], searchTerm);
      setResults(sortedData);

      if (sortedData && sortedData.length > 0) {
        sortedData.forEach(async (word) => {
          // Only increment search count for exact matches
          if (word.waray_word.toLowerCase() === searchTerm.trim().toLowerCase()) {
            await supabase
              .from('words')
              .update({ search_count: (word.search_count || 0) + 1 })
              .eq('id', word.id);
          }
        });
      }
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const quickSearch = (word: string) => {
    setSearchTerm(word);
    setHasSearched(true);
    setIsLoading(true);
    setExpandedContext(null);

    supabase
      .from('words')
      .select('*')
      .ilike('waray_word', `%${word}%`)
      .limit(20)
      .then(({ data, error }) => {
        if (!error && data) {
          const sortedData = sortSearchResults(data, word);
          setResults(sortedData);
          sortedData.forEach(async (w) => {
            // Only increment search count for exact matches
            if (w.waray_word.toLowerCase() === word.trim().toLowerCase()) {
              await supabase
                .from('words')
                .update({ search_count: (w.search_count || 0) + 1 })
                .eq('id', w.id);
            }
          });
        }
        setIsLoading(false);
      });
  };

  const playAudio = (audioUrl: string, wordId: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    const fullUrl = `${STORAGE_URL}/audio/${audioUrl}`;
    audioRef.current = new Audio(fullUrl);
    audioRef.current.play();
    setPlayingAudio(wordId);
    
    audioRef.current.onended = () => {
      setPlayingAudio(null);
    };
  };

  const getImageUrl = (imageUrl: string) => {
    return `${STORAGE_URL}/images/${imageUrl}`;
  };

  const toggleContext = (wordId: number) => {
    setExpandedContext(expandedContext === wordId ? null : wordId);
  };

  // AI Translation (Groq)
  const handleAiTranslate = async () => {
    if (!aiInputText.trim()) return;

    setIsAiTranslating(true);
    setHasAiTranslated(true);
    setAiError('');
    setAiTranslation('');
    setAiLatency(null);

    const startTime = performance.now();

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: aiInputText,
          direction: aiDirection,
        }),
      });

      const data = await response.json();
      const endTime = performance.now();
      setAiLatency(Math.round(endTime - startTime));

      if (!response.ok) {
        throw new Error(data.error || 'Translation failed');
      }

      setAiTranslation(data.translation);
    } catch (error) {
      console.error('AI Translation error:', error);
      setAiError('Translation failed. Please try again.');
    } finally {
      setIsAiTranslating(false);
    }
  };

  const handleAiKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAiTranslate();
    }
  };

  const swapDirection = () => {
    setAiDirection(aiDirection === 'waray-to-english' ? 'english-to-waray' : 'waray-to-english');
    const temp = aiInputText;
    setAiInputText(aiTranslation);
    setAiTranslation(temp);
  };

  // SeaLion AI Translation
  const handleSealionTranslate = async () => {
    if (!sealionInputText.trim()) return;

    setIsSealionTranslating(true);
    setHasSealionTranslated(true);
    setSealionError('');
    setSealionTranslation('');
    setSealionLatency(null);

    const startTime = performance.now();

    try {
      const response = await fetch('/api/translate-sealion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sealionInputText,
          direction: sealionDirection,
        }),
      });

      const data = await response.json();
      const endTime = performance.now();
      setSealionLatency(Math.round(endTime - startTime));

      if (!response.ok) {
        throw new Error(data.error || 'Translation failed');
      }

      setSealionTranslation(data.translation);
    } catch (error) {
      console.error('SeaLion Translation error:', error);
      setSealionError('Translation failed. Please try again.');
    } finally {
      setIsSealionTranslating(false);
    }
  };

  const handleSealionKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSealionTranslate();
    }
  };

  const swapSealionDirection = () => {
    setSealionDirection(sealionDirection === 'waray-to-english' ? 'english-to-waray' : 'waray-to-english');
    const temp = sealionInputText;
    setSealionInputText(sealionTranslation);
    setSealionTranslation(temp);
  };

  return (
    <main 
      className="min-h-screen bg-cover bg-center bg-fixed"
      style={{ backgroundImage: "url('/san_juanico_sunrise.png')" }}
    >
      <div className="min-h-screen bg-black/30">
        {/* Header */}
        <header className="bg-blue-900/80 text-white py-6 shadow-lg backdrop-blur-sm">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-2">📖 Smart Waray Dictionary</h1>
            <p className="text-blue-200">Preserving the Waray Language and Culture</p>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="container mx-auto px-4 pt-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-6">
              <button
                onClick={() => setActiveTab('search')}
                className={`px-4 py-3 rounded-t-lg font-semibold transition-colors ${
                  activeTab === 'search'
                    ? 'bg-white/95 text-blue-800'
                    : 'bg-white/50 text-gray-700 hover:bg-white/70'
                }`}
              >
                🔍 Word Search
              </button>
              <button
                onClick={() => setActiveTab('ai-translate')}
                className={`px-4 py-3 rounded-t-lg font-semibold transition-colors ${
                  activeTab === 'ai-translate'
                    ? 'bg-white/95 text-purple-800'
                    : 'bg-white/50 text-gray-700 hover:bg-white/70'
                }`}
              >
                🤖 AI Translator
              </button>
              <button
                onClick={() => setActiveTab('sealion')}
                className={`px-4 py-3 rounded-t-lg font-semibold transition-colors ${
                  activeTab === 'sealion'
                    ? 'bg-white/95 text-teal-800'
                    : 'bg-white/50 text-gray-700 hover:bg-white/70'
                }`}
              >
                🦁 SeaLion AI
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <section className="container mx-auto px-4 pb-12">
          <div className="max-w-4xl mx-auto">
            
            {/* SEARCH TAB */}
            {activeTab === 'search' && (
              <>
                <div className="bg-white/95 backdrop-blur-sm rounded-xl rounded-tl-none shadow-lg p-6 mb-8">
                  <label className="block text-gray-700 text-lg font-semibold mb-3">
                    Search for a Waray word or English translation
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="e.g., maupay, adlaw, hello, sun..."
                      className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-lg"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={isLoading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:bg-blue-400"
                    >
                      {isLoading ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>

                {!hasSearched && (
                  <div>
                    <div className="text-center text-white mb-8">
                      <p className="text-lg drop-shadow-lg">Enter a word above to search the dictionary</p>
                      <p className="mt-2 drop-shadow-lg">994 Waray words available</p>
                    </div>

                    {topWords.length > 0 && (
                      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">🔥 Top Searched Words</h2>
                        <div className="grid gap-3">
                          {topWords.map((word, index) => (
                            <button
                              key={word.id}
                              onClick={() => quickSearch(word.waray_word)}
                              className="flex items-center justify-between p-3 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-2xl font-bold text-blue-300">#{index + 1}</span>
                                <div>
                                  <p className="font-semibold text-gray-800">{word.waray_word}</p>
                                  <p className="text-sm text-gray-500">
                                    {word.english_definition?.slice(0, 50)}...
                                  </p>
                                </div>
                              </div>
                              <span className="text-sm text-gray-400">
                                {word.search_count || 0} searches
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {hasSearched && results.length === 0 && !isLoading && (
                  <div className="text-center text-white">
                    <p className="text-lg drop-shadow-lg">No results found for "{searchTerm}"</p>
                    <p className="mt-2 drop-shadow-lg">Try a different spelling or search term</p>
                  </div>
                )}

                {results.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-white mb-4 drop-shadow-lg">Found {results.length} result(s)</p>

                    {results.map((word) => (
                      <div
                        key={word.id}
                        className="bg-white/95 backdrop-blur-sm rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex flex-col md:flex-row gap-4">
                          {word.image_url && (
                            <div className="md:w-48 flex-shrink-0">
                              <img
                                src={getImageUrl(word.image_url)}
                                alt={word.waray_word}
                                className="w-full h-auto max-h-64 object-contain rounded-lg shadow-md"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}

                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-3">
                                  <h2 className="text-2xl font-bold text-blue-800">{word.waray_word}</h2>
                                  
                                  {word.audio_url && (
                                    <button
                                      onClick={() => playAudio(word.audio_url, word.id)}
                                      className={`p-2 rounded-full transition-colors ${
                                        playingAudio === word.id
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                      }`}
                                      title="Play pronunciation"
                                    >
                                      {playingAudio === word.id ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                      ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                                        </svg>
                                      )}
                                    </button>
                                  )}
                                </div>
                                
                                {word.waray_stress && (
                                  <p className="text-lg text-blue-600 italic">/{word.waray_stress}/</p>
                                )}
                              </div>
                              {word.part_of_speech && (
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                                  {word.part_of_speech}
                                </span>
                              )}
                            </div>

                            {word.alternate_spelling && (
                              <p className="text-gray-600 mb-2">
                                <span className="font-semibold">Also:</span> {word.alternate_spelling}
                              </p>
                            )}

                            <div className="mb-4">
                              <h3 className="font-semibold text-gray-700">Definition:</h3>
                              <p className="text-gray-800 text-lg">{word.english_definition}</p>
                            </div>

                            {word.sentence_example && (
                              <div className="bg-gray-50 rounded-lg p-4 mb-3">
                                <h3 className="font-semibold text-gray-700 mb-1">Example:</h3>
                                <p className="text-gray-800 italic">"{word.sentence_example}"</p>
                                {word.english_sentence_translation && (
                                  <p className="text-gray-600 mt-1">
                                    → {word.english_sentence_translation}
                                  </p>
                                )}
                              </div>
                            )}

                            {word.cultural_context && (
                              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
                                <button
                                  onClick={() => toggleContext(word.id)}
                                  className="w-full flex items-center justify-between text-left mb-3"
                                >
                                  <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                                    <span>📚</span> Cultural Context
                                  </h3>
                                  <span className="text-amber-600 text-sm font-medium hover:text-amber-800">
                                    {expandedContext === word.id ? '▲ Show less' : '▼ Read more'}
                                  </span>
                                </button>
                                
                                {/* Collapsible content wrapper */}
                                <div className="relative">
                                  <div 
                                    className={`overflow-hidden transition-all duration-500 ease-in-out`}
                                    style={{ 
                                      maxHeight: expandedContext === word.id ? '3000px' : '120px'
                                    }}
                                  >
                                    {formatCulturalContext(word.cultural_context)}
                                  </div>
                                  
                                  {/* Fade gradient overlay when collapsed */}
                                  {expandedContext !== word.id && (
                                    <div 
                                      className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-amber-50 via-amber-50/90 to-transparent pointer-events-none"
                                    />
                                  )}
                                </div>
                                
                                {/* Click to expand hint */}
                                {expandedContext !== word.id && (
                                  <button 
                                    onClick={() => toggleContext(word.id)}
                                    className="w-full mt-2 text-center py-2 text-amber-600 hover:text-amber-800 text-sm font-medium transition-colors"
                                  >
                                    ▼ Click to read full cultural context
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* AI TRANSLATE TAB (Groq) */}
            {activeTab === 'ai-translate' && (
              <>
                <div className="bg-white/95 backdrop-blur-sm rounded-xl rounded-tl-none shadow-lg p-6 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-gray-700 text-lg font-semibold">
                      🤖 AI-Powered Translation
                    </label>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      Powered by Groq AI
                    </span>
                  </div>

                  {/* Direction Toggle */}
                  <div className="flex items-center justify-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                    <span className={`font-medium ${aiDirection === 'waray-to-english' ? 'text-blue-800' : 'text-gray-500'}`}>
                      Waray
                    </span>
                    <button
                      onClick={swapDirection}
                      className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-colors"
                      title="Swap direction"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className={`font-medium ${aiDirection === 'english-to-waray' ? 'text-blue-800' : 'text-gray-500'}`}>
                      English
                    </span>
                  </div>

                  {/* Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      {aiDirection === 'waray-to-english' ? 'Enter Waray text:' : 'Enter English text:'}
                    </label>
                    <textarea
                      value={aiInputText}
                      onChange={(e) => setAiInputText(e.target.value)}
                      onKeyPress={handleAiKeyPress}
                      placeholder={aiDirection === 'waray-to-english' 
                        ? "e.g., Maupay nga aga! Kumusta ka?" 
                        : "e.g., Good morning! How are you?"}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none text-lg resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Translate Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleAiTranslate}
                      disabled={isAiTranslating || !aiInputText.trim()}
                      className={`px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                        isAiTranslating 
                          ? 'bg-purple-100 text-purple-700 cursor-wait' 
                          : !aiInputText.trim()
                            ? 'bg-purple-200 text-purple-600 cursor-not-allowed'
                            : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                    >
                      {isAiTranslating ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Translating...
                        </>
                      ) : (
                        <>🤖 Translate with AI</>
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Translation Result */}
                {!hasAiTranslated && (
                  <div className="text-center text-white mb-8">
                    <p className="text-lg drop-shadow-lg">Enter text above for AI-powered translation</p>
                    <p className="mt-2 drop-shadow-lg text-sm">Supports both Waray → English and English → Waray</p>
                  </div>
                )}

                {aiError && (
                  <div className="bg-red-100 border border-red-300 rounded-xl p-6 mb-8">
                    <p className="text-red-800 font-medium">❌ {aiError}</p>
                  </div>
                )}

                {hasAiTranslated && aiTranslation && (
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        🤖 AI Translation Result
                      </h2>
                      {aiLatency && (
                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                          ⚡ {aiLatency < 1000 ? `${aiLatency}ms` : `${(aiLatency / 1000).toFixed(2)}s`}
                        </span>
                      )}
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      {/* Original */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-600 mb-2 text-sm">
                          {aiDirection === 'waray-to-english' ? 'Waray (Original)' : 'English (Original)'}
                        </h3>
                        <p className="text-gray-800 text-lg">{aiInputText}</p>
                      </div>

                      {/* Translation */}
                      <div className="bg-purple-50 rounded-lg p-4 border-2 border-purple-200">
                        <h3 className="font-semibold text-purple-800 mb-2 text-sm">
                          {aiDirection === 'waray-to-english' ? 'English (Translation)' : 'Waray (Translation)'}
                        </h3>
                        <p className="text-gray-800 text-lg font-medium">{aiTranslation}</p>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-3 text-sm text-green-800">
                      <strong>✨ Quick Translation:</strong> Fast and simple translations. For detailed explanations with grammar & cultural context, try the 🦁 SeaLion AI tab!
                    </div>
                  </div>
                )}
              </>
            )}

            {/* SEALION AI TRANSLATE TAB */}
            {activeTab === 'sealion' && (
              <>
                <div className="bg-white/95 backdrop-blur-sm rounded-xl rounded-tl-none shadow-lg p-6 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-gray-700 text-lg font-semibold">
                      🦁 SeaLion Contextual Translation
                    </label>
                    <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium">
                      With Grammar & Cultural Context
                    </span>
                  </div>

                  {/* Direction Toggle */}
                  <div className="flex items-center justify-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                    <span className={`font-medium ${sealionDirection === 'waray-to-english' ? 'text-blue-800' : 'text-gray-500'}`}>
                      Waray
                    </span>
                    <button
                      onClick={swapSealionDirection}
                      className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full transition-colors"
                      title="Swap direction"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <span className={`font-medium ${sealionDirection === 'english-to-waray' ? 'text-blue-800' : 'text-gray-500'}`}>
                      English
                    </span>
                  </div>

                  {/* Input */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      {sealionDirection === 'waray-to-english' ? 'Enter Waray text:' : 'Enter English text:'}
                    </label>
                    <textarea
                      value={sealionInputText}
                      onChange={(e) => setSealionInputText(e.target.value)}
                      onKeyPress={handleSealionKeyPress}
                      placeholder={sealionDirection === 'waray-to-english' 
                        ? "e.g., Maupay nga aga! Kumusta ka?" 
                        : "e.g., Good morning! How are you?"}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-teal-500 focus:outline-none text-lg resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Translate Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={handleSealionTranslate}
                      disabled={isSealionTranslating || !sealionInputText.trim()}
                      className={`px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                        isSealionTranslating 
                          ? 'bg-teal-100 text-teal-700 cursor-wait' 
                          : !sealionInputText.trim()
                            ? 'bg-teal-200 text-teal-600 cursor-not-allowed'
                            : 'bg-teal-600 hover:bg-teal-700 text-white'
                      }`}
                    >
                      {isSealionTranslating ? (
                        <>
                          <svg className="animate-spin h-5 w-5 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Translating...
                        </>
                      ) : (
                        <>🦁 Translate with SeaLion</>
                      )}
                    </button>
                  </div>
                </div>

                {/* SeaLion Translation Result */}
                {!hasSealionTranslated && (
                  <div className="text-center text-white mb-8">
                    <p className="text-lg drop-shadow-lg">Enter text above for contextual AI translation</p>
                    <p className="mt-2 drop-shadow-lg text-sm">Get translations WITH word breakdowns, grammar notes & cultural context!</p>
                  </div>
                )}

                {sealionError && (
                  <div className="bg-red-100 border border-red-300 rounded-xl p-6 mb-8">
                    <p className="text-red-800 font-medium">❌ {sealionError}</p>
                  </div>
                )}

                {hasSealionTranslated && sealionTranslation && (
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        🦁 SeaLion Contextual Translation
                      </h2>
                      {sealionLatency && (
                        <span className="bg-teal-100 text-teal-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                          ⚡ {sealionLatency < 1000 ? `${sealionLatency}ms` : `${(sealionLatency / 1000).toFixed(2)}s`}
                        </span>
                      )}
                    </div>
                    
                    {/* Original Input */}
                    <div className="bg-teal-50 rounded-lg p-4 mb-4 border border-teal-200">
                      <h3 className="font-semibold text-teal-700 mb-2 text-sm">
                        📝 {sealionDirection === 'waray-to-english' ? 'Waray Input' : 'English Input'}
                      </h3>
                      <p className="text-gray-800 text-lg font-medium">{sealionInputText}</p>
                    </div>

                    {/* Contextual Translation Result */}
                    <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg p-5 border border-teal-200">
                      <h3 className="font-semibold text-teal-800 mb-3 text-sm flex items-center gap-2">
                        📚 Translation with Context & Explanation
                      </h3>
                      <div className="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {sealionTranslation.split('\n').map((line, index) => {
                          if (line.match(/^\*\*.*\*\*:?$/)) {
                            const headerText = line.replace(/\*\*/g, '').replace(/:$/, '');
                            return (
                              <h4 key={index} className="font-bold text-teal-700 mt-4 mb-2 text-base">
                                {headerText}
                              </h4>
                            );
                          }
                          if (line.includes('**')) {
                            const parts = line.split(/(\*\*.*?\*\*)/g);
                            return (
                              <p key={index} className="mb-2">
                                {parts.map((part, i) => {
                                  if (part.startsWith('**') && part.endsWith('**')) {
                                    return <strong key={i} className="text-teal-700">{part.slice(2, -2)}</strong>;
                                  }
                                  return <span key={i}>{part}</span>;
                                })}
                              </p>
                            );
                          }
                          if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                            return (
                              <p key={index} className="ml-4 mb-1 text-gray-700">
                                {line}
                              </p>
                            );
                          }
                          if (line.match(/^\d+\./)) {
                            return (
                              <p key={index} className="ml-2 mb-2 text-gray-700">
                                {line}
                              </p>
                            );
                          }
                          if (line.trim() === '') {
                            return <br key={index} />;
                          }
                          return (
                            <p key={index} className="mb-2 text-gray-700">
                              {line}
                            </p>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 bg-teal-100 rounded-lg p-3 text-sm text-teal-800">
                      <strong>🎓 Educational Feature:</strong> SeaLion provides word breakdowns, grammar explanations, and cultural context — perfect for language learners!
                    </div>
                  </div>
                )}

                {/* Info Box */}
                <div className="mt-6 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4">
                  <h3 className="font-semibold text-teal-800 mb-2">ℹ️ About SeaLion Contextual Translator</h3>
                  <p className="text-sm text-gray-700 mb-2">
                    Unlike the Groq AI translator which gives simple translations, SeaLion provides:
                  </p>
                  <ul className="text-sm text-gray-700 ml-4 space-y-1">
                    <li>📖 <strong>Word-by-word breakdowns</strong> — understand each word</li>
                    <li>📝 <strong>Grammar explanations</strong> — learn Waray grammar patterns</li>
                    <li>🎭 <strong>Cultural context</strong> — when and how to use expressions</li>
                    <li>🗣️ <strong>Alternative expressions</strong> — other ways to say the same thing</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-3">
                    Powered by AI Singapore's Gemma SEA-LION v4 27B model, trained specifically on Southeast Asian languages.
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900/80 py-6 mt-12 backdrop-blur-sm">
          <div className="container mx-auto px-4 text-center text-gray-300">
            <p>Smart Waray Dictionary Project © 2025</p>
            <p className="text-sm mt-1">A language preservation initiative</p>
            <button
              onClick={() => setShowAboutModal(true)}
              className="mt-3 text-blue-400 hover:text-blue-300 text-sm underline"
            >
              About / Credits
            </button>
          </div>          
        </footer>

        {/* About/Credits Modal */}
        {showAboutModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900/90 backdrop-blur-sm rounded-2xl max-w-3xl w-full py-10 px-8 shadow-2xl">
              <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-4">📚 Acknowledgment</h2>
                
                <p className="text-gray-200 mb-4">
                  The lexical entries in this digital dictionary are based on the printed publication:
                </p>
                
                <p className="text-2xl font-bold text-white italic mb-2">
                  "Syahan nga Usa ka Yukot hin mga Pulong nga Agsob Gamiton ha Winaray"
                </p>
                
                <p className="text-gray-300 mb-6">
                  (First One Thousand Commonly Used Words in Waray: A Waray-English Dictionary for MTBMLE Educators)
                </p>
                
                <p className="text-xl text-white font-semibold mb-4">
                  Authors: Voltaire Q. Oyzon, John Mark Fullmer, Evelyn C. Cruzada
                </p>
                
                <p className="text-gray-300 mb-1">
                  A project of the Commission on Higher Education with the
                </p>
                <p className="text-gray-300 mb-1">
                  National Network of Normal Schools (3NS) and Leyte Normal University
                </p>
                <p className="text-gray-300 mb-6">
                  Published: 2013
                </p>
                
                <p className="text-gray-400 text-sm mb-8">
                  This digital adaptation is for educational purposes and Waray language preservation.
                </p>

                <button
                  onClick={() => setShowAboutModal(false)}
                  className="text-white text-3xl hover:text-gray-300 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}    
      </div>
    </main>
  );
}
