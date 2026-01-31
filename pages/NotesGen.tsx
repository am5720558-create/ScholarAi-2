import React, { useState } from 'react';
import { generateNotes } from '../services/geminiService';
import { FileText, Download, Copy, Loader2, Book, AlertTriangle } from 'lucide-react';
import MarkdownRenderer from '../components/MarkdownRenderer';

const NotesGen: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setOutput('');
    try {
      const notes = await generateNotes(input);
      setOutput(notes || "Failed to generate notes.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error generating notes. Please try a shorter text.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    alert('Copied to clipboard!');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center sm:text-left">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Book className="text-primary" /> Smart Notes Generator
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Paste your chapter content or type a topic, and AI will create structured revision notes for you.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-12rem)]">
        {/* Input Section */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 font-medium">
            Source Material
          </div>
          <textarea
            className="flex-1 w-full p-4 bg-transparent resize-none outline-none dark:text-gray-200"
            placeholder="Paste text from your textbook, or type a topic like 'Photosynthesis process'..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <button
              onClick={handleGenerate}
              disabled={loading || !input.trim()}
              className="w-full flex items-center justify-center py-3 px-4 bg-primary hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" /> Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2" /> Generate Notes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output Section */}
        <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
            <span className="font-medium">AI Generated Notes</span>
            {output && (
              <div className="flex space-x-2">
                <button onClick={copyToClipboard} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400" title="Copy">
                  <Copy size={18} />
                </button>
                <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-600 dark:text-gray-400" title="Download PDF (Mock)">
                  <Download size={18} />
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 w-full p-6 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/30">
             {error ? (
                <div className="h-full flex flex-col items-center justify-center text-red-500 p-4 text-center">
                    <AlertTriangle size={32} className="mb-2" />
                    <p className="font-semibold">Error</p>
                    <p className="text-sm">{error}</p>
                </div>
             ) : output ? (
               <div className="text-sm text-gray-800 dark:text-gray-200">
                 <MarkdownRenderer content={output} />
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-gray-400">
                 <FileText size={48} className="mb-4 opacity-20" />
                 <p>Your notes will appear here.</p>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesGen;