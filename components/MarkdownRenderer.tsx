import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          ul: (props) => <ul className="list-disc list-outside ml-5 my-2 space-y-1" {...props} />,
          ol: (props) => <ol className="list-decimal list-outside ml-5 my-2 space-y-1" {...props} />,
          li: (props) => <li className="pl-1" {...props} />,
          h1: (props) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
          h2: (props) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-gray-100 border-b pb-2 border-gray-200 dark:border-gray-700" {...props} />,
          h3: (props) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200" {...props} />,
          p: (props) => <p className="mb-2 leading-relaxed whitespace-pre-wrap" {...props} />,
          strong: (props) => <strong className="font-bold text-gray-900 dark:text-white" {...props} />,
          hr: (props) => <hr className="my-6 border-t-2 border-gray-200 dark:border-gray-700" {...props} />,
          table: (props) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props} />
            </div>
          ),
          thead: (props) => <thead className="bg-gray-50 dark:bg-gray-800" {...props} />,
          th: (props) => (
            <th 
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold" 
              {...props} 
            />
          ),
          tbody: (props) => <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700" {...props} />,
          tr: (props) => <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" {...props} />,
          td: (props) => <td className="px-4 py-3 text-sm border-r border-gray-100 dark:border-gray-800 last:border-r-0" {...props} />,
          blockquote: (props) => (
            <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 italic text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 rounded-r" {...props} />
          ),
          code: (props) => {
             const {children, className, ...rest} = props;
             return (
               <code className={`${className} bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600 dark:text-pink-400 break-words`} {...rest}>
                 {children}
               </code>
             );
          },
          pre: (props) => (
            <div className="overflow-x-auto my-4 bg-gray-900 rounded-lg p-4 shadow-md">
              <pre className="text-sm text-gray-100 font-mono" {...props} />
            </div>
          ),
          a: (props) => (
            <a className="text-primary hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;