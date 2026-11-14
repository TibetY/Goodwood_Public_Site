// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { containsProfanity, screenContent } from './spam';

describe('containsProfanity', () => {
    it.each([
        'fuck you',
        'You are a FUCKING joke',
        'this is bullshit',
        'fuuuuck off',
        'f.u.c.k this',
        'f*ck off',
        'sh!t',
        'sh1t lodge',
        'what an asshole',
        'b1tch',
        'putain de merde',
        'espèce de connard',
        'enculé',
        'tabarnak',
        'you twat',
    ])('flags %j', (text) => {
        expect(containsProfanity(text)).toBe(true);
    });

    it.each([
        // Names and innocent words that naive filters choke on.
        'My name is Dick Cockburn',
        'I live in Scunthorpe',
        'Our cat is a fluffy pussycat',
        'I would like to assess whether I can join',
        'Please pass my regards to the Worshipful Master',
        'Je voudrais des informations, merci beaucoup',
        'Is the hall wheelchair accessible?',
        'I met Mr. Hancock at the Shiitake mushroom festival',
        'Can I attend the Dec 3rd event? Call 613-555-0123',
        'class of 1984, cocktail hour',
        'constitution, contact, Pickering',
    ])('does not flag %j', (text) => {
        expect(containsProfanity(text)).toBe(false);
    });
});

describe('containsProfanity — slurs', () => {
    it.each([
        'homo',
        'you homos',
        'fag',
        'bande de tapettes',
        'mange de la marde pédé',
    ])('flags %j', (text) => {
        expect(containsProfanity(text)).toBe(true);
    });

    it.each([
        // "gay" is left to the AI screen (moderation.ts), which can read context.
        "you're gay",
        'gay lodge',
        "I'm gay — would I be welcome to join the Lodge?",
        'My husband and I are a gay couple interested in your events',
        'Does the Lodge have a policy on gay members?',
        'Homo sapiens',
        'a homogeneous group',
        'Marvin Gaye tribute night',
        'centipede',
    ])('does not flag %j', (text) => {
        expect(containsProfanity(text)).toBe(false);
    });
});

describe('screenContent', () => {
    const clean = { names: ['John', 'Smith'], message: 'I would like to learn more about the Lodge.' };

    it('passes a normal enquiry', () => {
        expect(screenContent(clean)).toBeNull();
    });

    it('flags profanity in the message', () => {
        expect(screenContent({ ...clean, message: 'go fuck yourself' })).toBe('profanity');
    });

    it('flags profanity in a name field', () => {
        expect(screenContent({ ...clean, names: ['Shithead', 'Smith'] })).toBe('profanity');
    });

    it('flags a link in a name field', () => {
        expect(screenContent({ ...clean, names: ['Visit cheap-pills.com', 'Smith'] })).toBe('link-in-name');
    });

    it('allows a couple of links in the message', () => {
        expect(
            screenContent({ ...clean, message: 'See https://example.org and www.example.net' }),
        ).toBeNull();
    });

    it('flags link spam', () => {
        const message = 'Buy now https://a.ru https://b.xyz https://c.top';
        expect(screenContent({ ...clean, message })).toBe('too-many-links');
    });

    it('gives the same answer when called repeatedly (no regex state leaks)', () => {
        const input = { ...clean, names: ['spam.com', 'x'] };
        expect(screenContent(input)).toBe('link-in-name');
        expect(screenContent(input)).toBe('link-in-name');
    });
});
