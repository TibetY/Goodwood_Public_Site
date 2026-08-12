// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { escapeHtml, formatMoney, row, brandedEmail, callout } from './email';

describe('escapeHtml', () => {
    it('neutralises the characters that break out of markup', () => {
        expect(escapeHtml('<script>alert(1)</script>')).toBe(
            '&lt;script&gt;alert(1)&lt;/script&gt;',
        );
        expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
        expect(escapeHtml('say "hi"')).toBe('say &quot;hi&quot;');
    });

    it('escapes the ampersand first so entities are not double-broken', () => {
        expect(escapeHtml('&lt;')).toBe('&amp;lt;');
    });
});

describe('row', () => {
    it('escapes the label', () => {
        expect(row('<b>Name</b>', 'value')).toContain('&lt;b&gt;Name&lt;/b&gt;');
    });

    it('leaves the value raw so callers can pass links', () => {
        // Documented contract: callers escape buyer-supplied values themselves.
        expect(row('Email', '<a href="mailto:x@y.z">x@y.z</a>')).toContain('<a href="mailto:x@y.z">');
    });
});

describe('brandedEmail', () => {
    it('escapes the heading, intro and footer', () => {
        // A buyer's name reaches a Lodge officer's inbox through this template,
        // so this is a live injection path, not a theoretical one.
        const html = brandedEmail({
            heading: '<img src=x onerror=alert(1)>',
            intro: 'Hello <script>bad()</script>',
            footer: 'Policy & terms',
        });
        expect(html).not.toContain('<img src=x');
        expect(html).not.toContain('<script>bad()');
        expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;');
        expect(html).toContain('Policy &amp; terms');
    });

    it('omits optional sections that were not supplied', () => {
        const html = brandedEmail({ heading: 'Hello' });
        expect(html).toContain('Hello');
        expect(html).toContain('Goodwood Lodge No. 159');
    });

    it('includes the body block verbatim', () => {
        const html = brandedEmail({ heading: 'H', body: '<div id="qr">x</div>' });
        expect(html).toContain('<div id="qr">x</div>');
    });
});

describe('callout', () => {
    it('escapes both the label and the value', () => {
        const html = callout('Send to', '<b>x@y.z</b>');
        expect(html).toContain('&lt;b&gt;x@y.z&lt;/b&gt;');
        expect(html).not.toContain('<b>x@y.z</b>');
    });
});

describe('formatMoney', () => {
    it('formats integer cents for display in email', () => {
        expect(formatMoney(4500)).toBe('$45.00');
        expect(formatMoney(0)).toBe('$0.00');
    });
});
