import React, { useState, useCallback } from "react";
import { Copy } from "lucide-react";

export const CopyButton = React.memo(({ text }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // fallback silently
        }
    }, [text]);

    if (!text) return null;

    return (
        <span className="relative inline-flex">
            <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-ink"
                aria-label="نسخ"
            >
                <Copy size={13} />
            </button>
            {copied && (
                <span className="copy-tooltip absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg bg-ink text-cyan text-[10px] font-bold whitespace-nowrap shadow-lg z-10">
                    تم النسخ!
                </span>
            )}
        </span>
    );
});
