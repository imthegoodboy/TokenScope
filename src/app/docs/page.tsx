'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Highlight, themes } from 'prism-react-renderer';
import { Code, Copy, Check, Terminal, FileJson, Zap, ArrowLeft } from 'lucide-react';

const CODE_THEME = themes.nightOwl;
/** Night Owl plain background from theme */
const CODE_BG = '#011627';

const codeExamples = {
  python: `import requests

# Your proxy URL
PROXY_URL = "https://your-domain.com/api/v1/proxy/YOUR_PROXY_ID"

# Send request through your proxy
response = requests.post(PROXY_URL, json={
    "messages": [
        {"role": "user", "content": "Hello, how are you?"}
    ]
})

print(response.json())`,

  javascript: `// Your proxy URL
const PROXY_URL = "https://your-domain.com/api/v1/proxy/YOUR_PROXY_ID";

// Send request through your proxy
const response = await fetch(PROXY_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    messages: [
      { role: "user", content: "Hello, how are you?" }
    ]
  })
});

const data = await response.json();
console.log(data);`,

  curl: `curl -X POST "https://your-domain.com/api/v1/proxy/YOUR_PROXY_ID" \\
  -H "Content-Type: application/json" \\
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }'`,
};

const exampleLang: Record<keyof typeof codeExamples, string> = {
  python: 'python',
  javascript: 'javascript',
  /** Shell highlighting not bundled; JS lexer still colorizes strings/keywords well */
  curl: 'javascript',
};

const REQUEST_BODY_JSON = `{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Your question here"}
  ]
}`;

const RESPONSE_BODY_JSON = `{
  "id": "chatcmpl-xxx",
  "model": "gpt-4o-mini",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Here is the response..."
    }
  }],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 42,
    "total_tokens": 67
  }
}`;

function SyntaxCode({ code, language }: { code: string; language: string }) {
  return (
    <Highlight theme={CODE_THEME} code={code.trimEnd()} language={language}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`${className} m-0 px-4 py-4 overflow-x-auto text-[13px] leading-relaxed font-mono`}
          style={{ ...style, background: 'transparent', margin: 0 }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
}

function HttpRequestMeta() {
  return (
    <div className="px-4 pt-4 pb-3 font-mono text-[13px] leading-relaxed border-b border-cyan-950/50">
      <div>
        <span className="text-amber-400 font-semibold">POST</span>
        <span className="text-slate-500"> </span>
        <span className="text-emerald-400">/api/v1/proxy/</span>
        <span className="text-teal-300">{'{proxy_id}'}</span>
      </div>
      <div className="mt-2">
        <span className="text-sky-400">Content-Type</span>
        <span className="text-slate-500">: </span>
        <span className="text-rose-300">application/json</span>
      </div>
    </div>
  );
}

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<'python' | 'javascript' | 'curl'>('python');
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    await navigator.clipboard.writeText(codeExamples[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Documentation</h1>
            <p className="text-gray-400">Integration guides and API reference</p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Zap className="text-orange" size={24} />
            Quick Start
          </h2>

          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <ol className="space-y-4 list-decimal list-inside marker:text-orange marker:font-semibold">
              <li className="text-gray-300">
                <span className="text-white font-medium">Create an account</span> and sign in
              </li>
              <li className="text-gray-300">
                <span className="text-white font-medium">Add your API key</span> from OpenAI, Gemini, or Anthropic
              </li>
              <li className="text-gray-300">
                <span className="text-white font-medium">Create a proxy URL</span> with your preferred settings
              </li>
              <li className="text-gray-300">
                <span className="text-white font-medium">Use the proxy URL</span> instead of the direct API endpoint
              </li>
              <li className="text-gray-300">
                <span className="text-white font-medium">Monitor usage</span> in your real-time dashboard
              </li>
            </ol>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Code className="text-orange" size={24} />
            Integration Examples
          </h2>
          <p className="text-sm text-zinc-500">
            Syntax highlighting uses the{' '}
            <span className="text-cyan-400/90">Night Owl</span> palette (strings, keywords, comments, and JSON keys are
            color-tinted).
          </p>

          <div className="rounded-xl overflow-hidden border border-cyan-900/25 shadow-lg shadow-black/50">
            <div
              className="flex flex-wrap border-b border-cyan-950/60 bg-[#0a1628]"
              style={{ boxShadow: 'inset 0 -1px 0 0 rgba(34, 211, 238, 0.06)' }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('python')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'python'
                    ? 'text-cyan-300 bg-cyan-950/50 border-b-2 border-cyan-400 -mb-px'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <Terminal size={16} className={activeTab === 'python' ? 'text-amber-400' : ''} />
                Python
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('javascript')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'javascript'
                    ? 'text-cyan-300 bg-cyan-950/50 border-b-2 border-cyan-400 -mb-px'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <FileJson size={16} className={activeTab === 'javascript' ? 'text-amber-400' : ''} />
                JavaScript
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('curl')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'curl'
                    ? 'text-cyan-300 bg-cyan-950/50 border-b-2 border-cyan-400 -mb-px'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <Terminal size={16} className={activeTab === 'curl' ? 'text-amber-400' : ''} />
                cURL
              </button>
              <div className="flex-1 min-w-[1rem]" />
              <button
                type="button"
                onClick={copyCode}
                className="flex items-center gap-2 px-4 py-3 text-sm text-violet-300/90 hover:text-violet-200 transition-colors"
              >
                {copied ? (
                  <>
                    <Check size={16} className="text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto" style={{ backgroundColor: CODE_BG }}>
              <SyntaxCode code={codeExamples[activeTab]} language={exampleLang[activeTab]} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Request Format</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 text-zinc-200">Request</h3>
              <div className="rounded-xl overflow-hidden border border-emerald-900/30 shadow-md shadow-black/40">
                <div style={{ backgroundColor: CODE_BG }}>
                  <HttpRequestMeta />
                  <SyntaxCode code={REQUEST_BODY_JSON} language="json" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3 text-zinc-200">Response</h3>
              <div className="rounded-xl overflow-hidden border border-violet-900/25 shadow-md shadow-black/40">
                <div style={{ backgroundColor: CODE_BG }}>
                  <SyntaxCode code={RESPONSE_BODY_JSON} language="json" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Proxy URL Settings</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Temperature</h3>
              <p className="text-sm text-gray-400">
                Controls randomness in responses. Lower values (0.1-0.3) make output more focused and deterministic.
                Higher values (0.7-1.0) make output more creative and varied.
              </p>
              <div className="mt-3 text-sm">
                <span className="text-orange">Recommended:</span> 0.7 for general use
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Max Tokens</h3>
              <p className="text-sm text-gray-400">
                Maximum number of tokens in the response. Controls how long the output can be. Helps control costs and
                response length.
              </p>
              <div className="mt-3 text-sm">
                <span className="text-orange">Recommended:</span> 2048 for most use cases
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <h3 className="font-semibold mb-2">System Prompt</h3>
              <p className="text-sm text-gray-400">
                Sets the behavior and personality of the AI. This is prepended to all requests. Use it to define the
                assistant&apos;s role and guidelines.
              </p>
              <div className="mt-3 text-sm">
                <span className="text-orange">Example:</span> &quot;You are a code reviewer...&quot;
              </div>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <h3 className="font-semibold mb-2">Auto-Enhance</h3>
              <p className="text-sm text-gray-400">
                When enabled, prompts are automatically optimized using TF-IDF analysis before being sent to the LLM.
                Removes low-importance tokens to reduce costs.
              </p>
              <div className="mt-3 text-sm">
                <span className="text-orange">Benefit:</span> Can reduce token usage by 20-40%
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Supported Providers</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 ring-1 ring-emerald-500/15">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 rounded bg-[#10A37F]" />
                <h3 className="font-semibold">OpenAI</h3>
              </div>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• GPT-4o</li>
                <li>• GPT-4o-mini</li>
                <li>• GPT-4 Turbo</li>
                <li>• GPT-3.5 Turbo</li>
              </ul>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 ring-1 ring-amber-500/15">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 rounded bg-[#EAB308]" />
                <h3 className="font-semibold">Google Gemini</h3>
              </div>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Gemini 1.5 Pro</li>
                <li>• Gemini 1.5 Flash</li>
                <li>• Gemini 1.0 Pro</li>
              </ul>
            </div>

            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 ring-1 ring-orange-500/15">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 rounded bg-[#D97706]" />
                <h3 className="font-semibold">Anthropic</h3>
              </div>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Claude 3.5 Sonnet</li>
                <li>• Claude 3 Opus</li>
                <li>• Claude 3 Haiku</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
