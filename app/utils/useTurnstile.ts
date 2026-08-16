import { useEffect, useRef, useState } from 'react';

// Cloudflare Turnstile widget lifecycle, extracted from the pattern proven on
// the contact form (app/routes/contact.tsx). The widget is only active when a
// site key is configured, so local dev and the test suite work without one.
//
// contact.tsx is deliberately left on its own inline copy for now — this is
// extracted for the ticket purchase form, and the two can converge later.

interface TurnstileApi {
    render: (el: HTMLElement, options: Record<string, unknown>) => string;
    reset: (widgetId?: string) => void;
    remove: (widgetId?: string) => void;
}

declare global {
    interface Window {
        turnstile?: TurnstileApi;
    }
}

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

export function useTurnstile() {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
    const [token, setToken] = useState('');
    const widgetRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | null>(null);
    /** Set once on mount; the difference at submit time is the timing trap. */
    const loadedAtRef = useRef(Date.now());

    useEffect(() => {
        if (!siteKey) return;

        const renderWidget = () => {
            if (!window.turnstile || !widgetRef.current || widgetIdRef.current) return;
            widgetIdRef.current = window.turnstile.render(widgetRef.current, {
                sitekey: siteKey,
                callback: (t: string) => setToken(t),
                'expired-callback': () => setToken(''),
                'error-callback': () => setToken(''),
            });
        };

        if (window.turnstile) {
            renderWidget();
            return;
        }

        let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT_SRC}"]`);
        if (!script) {
            script = document.createElement('script');
            script.src = TURNSTILE_SCRIPT_SRC;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
        script.addEventListener('load', renderWidget);
        return () => script?.removeEventListener('load', renderWidget);
    }, [siteKey]);

    /** Turnstile tokens are single-use — reset after a failed submit. */
    const reset = () => {
        if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
        }
        setToken('');
    };

    return {
        siteKey,
        token,
        widgetRef,
        reset,
        elapsedMs: () => Date.now() - loadedAtRef.current,
        /** True when verification is satisfied, or not required in this environment. */
        isSatisfied: !siteKey || Boolean(token),
    };
}
