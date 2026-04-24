/**
 * word-engine.js — Shared Dictionary Engine for Word Puzzle Utilities Suite
 *
 * Provides pattern matching, anagram solving, Wordle filtering, and
 * Scrabble word finding. Works with the WORDLIST data structure produced
 * by build-wordlist.js.
 *
 * Usage (browser):
 *   <script src="js/wordlist.js"></script>
 *   <script src="js/word-engine.js"></script>
 *   const engine = new WordEngine(window.WORDLIST);
 *
 * Usage (Node.js):
 *   const WORDLIST = require('./wordlist-node.js');
 *   const { WordEngine } = require('./word-engine.js');
 *   const engine = new WordEngine(WORDLIST);
 */

(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    // Node.js / CommonJS
    module.exports = factory();
  } else {
    // Browser global
    root.WordEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ─── Scrabble Letter Values ──────────────────────────────────────────────
  const LETTER_VALUES = {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
    K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
    U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10
  };

  // ─── Utility: compute Scrabble score ─────────────────────────────────────
  function computeScore(word) {
    let score = 0;
    for (let i = 0; i < word.length; i++) {
      score += LETTER_VALUES[word[i]] || 0;
    }
    return score;
  }

  // ─── Utility: anagram key (sorted letters) ──────────────────────────────
  function anagramKey(word) {
    return [...word].sort().join('');
  }

  // ─── Utility: count letter frequencies ──────────────────────────────────
  function letterFreq(word) {
    const freq = {};
    for (const ch of word) {
      freq[ch] = (freq[ch] || 0) + 1;
    }
    return freq;
  }

  // ─── Utility: check if rack can make word ────────────────────────────────
  function canForm(word, rackFreq, wildcards) {
    let wildsLeft = wildcards;
    const needed = letterFreq(word);
    for (const [ch, count] of Object.entries(needed)) {
      const have = rackFreq[ch] || 0;
      if (have >= count) continue;
      const shortfall = count - have;
      if (shortfall > wildsLeft) return false;
      wildsLeft -= shortfall;
    }
    return true;
  }

  // ─── Utility: generate subsets of given size ─────────────────────────────
  function* subsets(arr, k) {
    if (k === 0) { yield []; return; }
    if (k > arr.length) return;
    for (let i = 0; i <= arr.length - k; i++) {
      const rest = arr.slice(i + 1);
      for (const sub of subsets(rest, k - 1)) {
        yield [arr[i], ...sub];
      }
    }
  }

  // ─── Utility: combinations of letters of a given length ──────────────────
  function* letterCombinations(letters, len) {
    const arr = [...letters];
    yield* subsets(arr, len);
  }

  // ─── Utility: deduplicate array ──────────────────────────────────────────
  function unique(arr) {
    return [...new Set(arr)];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WordEngine Class
  // ═══════════════════════════════════════════════════════════════════════════

  class WordEngine {
    /**
     * @param {Object} wordlistData - The window.WORDLIST data object
     */
    constructor(wordlistData) {
      this._status = 'loading';
      this._words = {};       // word → score
      this._anagrams = {};    // sorted_key → [words]
      this._wordleAnswers = [];
      this._wordleGuesses = [];
      this._allWordsArray = [];
      this._wordsByLength = {}; // length → Set<word>

      try {
        if (!wordlistData) throw new Error('No wordlist data provided');

        this._words = wordlistData.words || {};
        this._anagrams = wordlistData.anagrams || {};
        this._wordleAnswers = (wordlistData.wordle && wordlistData.wordle.answers) || [];
        this._wordleGuesses = (wordlistData.wordle && wordlistData.wordle.guesses) || [];

        // Pre-compute helper structures
        this._allWordsArray = Object.keys(this._words);
        for (const word of this._allWordsArray) {
          const len = word.length;
          if (!this._wordsByLength[len]) {
            this._wordsByLength[len] = [];
          }
          this._wordsByLength[len].push(word);
        }

        this._status = 'ready';
      } catch (err) {
        this._status = 'error';
        console.error('WordEngine initialization error:', err);
      }
    }

    // ─── Loading Status ───────────────────────────────────────────────────

    /**
     * Returns the loading status: 'loading', 'ready', or 'error'
     */
    getLoadingStatus() {
      return this._status;
    }

    // ─── Word Validation & Scoring ────────────────────────────────────────

    /**
     * Check if a word exists in the dictionary.
     * @param {string} word
     * @returns {boolean}
     */
    isWordValid(word) {
      return Object.prototype.hasOwnProperty.call(this._words, word.toUpperCase());
    }

    /**
     * Get the Scrabble score for a word.
     * If the word is in the dictionary, returns the pre-computed score.
     * Otherwise, computes the score from letter values (useful for
     * single letters or words not in the dictionary).
     * @param {string} word
     * @returns {number}
     */
    getWordScore(word) {
      const w = word.toUpperCase();
      if (Object.prototype.hasOwnProperty.call(this._words, w)) {
        return this._words[w];
      }
      // Fallback: compute score from letter values
      return computeScore(w);
    }

    /**
     * Get word length.
     * @param {string} word
     * @returns {number}
     */
    getWordLength(word) {
      return word.length;
    }

    // ─── Pattern Search (Crossword Solver) ───────────────────────────────

    /**
     * Search words matching a pattern.
     * ? = single unknown letter
     * * = zero or more unknown letters
     *
     * @param {string} pattern - e.g. "C??SS?O?D" or "CROSS*"
     * @returns {Array<{word: string, score: number, length: number}>}
     */
    patternSearch(pattern) {
      const p = pattern.toUpperCase();

      // Handle the * (zero-or-more) wildcard
      // Split on *, each segment must appear in order
      // Build a regex from the pattern
      const regexStr = p
        .split('')  // don't split on * first; process char by char
        .map(ch => {
          if (ch === '?') return '.';
          if (ch === '*') return '.*';
          return ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('');

      const regex = new RegExp(`^${regexStr}$`);

      // Determine candidate lengths
      // If no *, the length is fixed: pattern.length
      // If * is present, we need to check words of all lengths
      let candidates;
      if (!p.includes('*')) {
        const len = p.length;
        candidates = this._wordsByLength[len] || [];
      } else {
        candidates = this._allWordsArray;
      }

      const results = [];
      for (const word of candidates) {
        if (regex.test(word)) {
          results.push({
            word,
            score: this._words[word],
            length: word.length
          });
        }
      }

      // Sort by score descending, then alphabetically
      results.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));

      return results;
    }

    // ─── Anagram Search ──────────────────────────────────────────────────

    /**
     * Find all words that can be formed from the given letters.
     *
     * @param {string} letters - Available letters
     * @param {Object} [options]
     * @param {number} [options.minLength] - Minimum word length (default: 2)
     * @param {number} [options.maxLength] - Maximum word length (default: letters.length)
     * @param {string} [options.mustInclude] - Letters that must be in result
     * @param {boolean} [options.exactOnly] - Only exact-length anagrams (default: false)
     * @returns {Array<{length: number, words: Array<{word: string, score: number}>}>}
     */
    anagramSearch(letters, options = {}) {
      const input = letters.toUpperCase();
      const minLen = options.minLength || 2;
      const maxLen = options.maxLength || input.length;
      const mustInclude = (options.mustInclude || '').toUpperCase();
      const exactOnly = options.exactOnly || false;

      const inputKey = anagramKey(input);
      const inputFreq = letterFreq(input);
      const results = {};

      // Determine which lengths to check
      const startLen = exactOnly ? input.length : minLen;
      const endLen = exactOnly ? input.length : maxLen;

      for (let len = startLen; len <= endLen; len++) {
        results[len] = [];
      }

      // For each possible sub-length, generate sorted keys from combinations
      // and look them up in the anagram index.
      // Optimisation: only check keys that exist in the anagram index.

      // Strategy: iterate all anagram keys, check if they can be formed from input letters
      for (const [key, words] of Object.entries(this._anagrams)) {
        const keyLen = key.length;
        if (keyLen < startLen || keyLen > endLen) continue;

        // Check if this key's letters can be formed from input
        const keyFreq = letterFreq(key);
        let canFormFromInput = true;
        for (const [ch, count] of Object.entries(keyFreq)) {
          if ((inputFreq[ch] || 0) < count) {
            canFormFromInput = false;
            break;
          }
        }
        if (!canFormFromInput) continue;

        // Check must-include filter
        if (mustInclude) {
          const mustFreq = letterFreq(mustInclude);
          let hasAll = true;
          for (const [ch, count] of Object.entries(mustFreq)) {
            if ((keyFreq[ch] || 0) < count) {
              hasAll = false;
              break;
            }
          }
          if (!hasAll) continue;
        }

        // Add all words in this anagram group
        for (const word of words) {
          results[keyLen].push({
            word,
            score: this._words[word]
          });
        }
      }

      // Sort within each group by score descending
      const output = [];
      for (let len = startLen; len <= endLen; len++) {
        if (results[len] && results[len].length > 0) {
          results[len].sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
          output.push({
            length: len,
            words: results[len]
          });
        }
      }

      return output;
    }

    // ─── Wordle Filter ───────────────────────────────────────────────────

    /**
     * Filter Wordle answers based on guess feedback.
     *
     * @param {Array<{word: string, feedback: string[]}>} guesses
     *   Each feedback is an array of 'green', 'yellow', 'grey' per letter
     * @returns {{remaining: string[], remainingCount: number, suggestions: string[]}}
     */
    wordleFilter(guesses) {
      let candidates = [...this._wordleAnswers];

      for (const { word, feedback } of guesses) {
        const guess = word.toUpperCase();

        candidates = candidates.filter(answer => {
          return this._wordleMatchesGuess(answer, guess, feedback);
        });
      }

      // Generate suggestions based on letter frequency
      const suggestions = this._wordleSuggestions(candidates);

      return {
        remaining: candidates,
        remainingCount: candidates.length,
        suggestions
      };
    }

    /**
     * Check if an answer is consistent with a guess + feedback.
     * @private
     */
    _wordleMatchesGuess(answer, guess, feedback) {
      const answerArr = [...answer];
      const guessArr = [...guess];

      // First pass: handle greens (exact matches)
      for (let i = 0; i < 5; i++) {
        if (feedback[i] === 'green') {
          if (answerArr[i] !== guessArr[i]) return false;
          // Mark this position as resolved
          answerArr[i] = null;
          guessArr[i] = null;
        }
      }

      // Count remaining letters in answer (excluding greens)
      const answerRemaining = {};
      for (const ch of answerArr) {
        if (ch !== null) {
          answerRemaining[ch] = (answerRemaining[ch] || 0) + 1;
        }
      }

      // Second pass: handle yellows and greys
      for (let i = 0; i < 5; i++) {
        if (feedback[i] === 'green') continue; // already handled
        const g = guessArr[i];

        if (feedback[i] === 'yellow') {
          // Letter must be in answer but NOT in this position
          if (answerArr[i] === g) return false; // would be green
          if (!answerRemaining[g] || answerRemaining[g] <= 0) return false;
          answerRemaining[g]--;
        } else if (feedback[i] === 'grey') {
          // Letter is not in answer at all (unless it was green/yellow elsewhere)
          if (answerRemaining[g] && answerRemaining[g] > 0) return false;
        }
      }

      return true;
    }

    /**
     * Generate Wordle suggestions based on letter frequency.
     * @private
     */
    _wordleSuggestions(candidates) {
      if (candidates.length <= 10) return candidates;

      // Calculate letter frequency across remaining candidates
      const freq = {};
      for (const word of candidates) {
        const seen = new Set();
        for (const ch of word) {
          if (!seen.has(ch)) {
            freq[ch] = (freq[ch] || 0) + 1;
            seen.add(ch);
          }
        }
      }

      // Score each candidate by information gain (sum of letter frequencies)
      const scored = candidates.map(word => {
        let score = 0;
        const seen = new Set();
        for (const ch of word) {
          if (!seen.has(ch)) {
            score += freq[ch] || 0;
            seen.add(ch);
          }
        }
        return { word, score };
      });

      scored.sort((a, b) => b.score - a.score);

      return scored.slice(0, 10).map(s => s.word);
    }

    // ─── Scrabble Search ─────────────────────────────────────────────────

    /**
     * Find all valid Scrabble words from a rack and optional board letters.
     *
     * @param {string} rack - Rack letters (use ? for blank tiles)
     * @param {string} [boardLetters] - Letters already on the board that must be used
     * @returns {Array<{word: string, score: number, usesBlank: boolean, isBingo: boolean}>}
     */
    scrabbleSearch(rack, boardLetters = '') {
      const rackUpper = rack.toUpperCase();
      const boardUpper = boardLetters.toUpperCase();

      // Count wildcards in rack
      let wildcards = 0;
      const rackFreq = {};
      for (const ch of rackUpper) {
        if (ch === '?') {
          wildcards++;
        } else {
          rackFreq[ch] = (rackFreq[ch] || 0) + 1;
        }
      }

      // Add board letters to available pool (these are not wildcards)
      const boardFreq = letterFreq(boardUpper);
      const totalFreq = { ...rackFreq };
      for (const [ch, count] of Object.entries(boardFreq)) {
        totalFreq[ch] = (totalFreq[ch] || 0) + count;
      }

      const totalWildcards = wildcards;
      const results = [];

      // Search all words, check if they can be formed from the rack + board
      for (const word of this._allWordsArray) {
        const wordFreq = letterFreq(word);

        // Check if the word can be formed from total pool
        let wildsLeft = totalWildcards;
        let canForm = true;
        let blanksUsed = 0;

        for (const [ch, count] of Object.entries(wordFreq)) {
          const have = totalFreq[ch] || 0;
          if (have >= count) continue;
          const shortfall = count - have;
          if (shortfall > wildsLeft) {
            canForm = false;
            break;
          }
          wildsLeft -= shortfall;
          blanksUsed += shortfall;
        }

        if (!canForm) continue;

        // If board letters are specified, the word must contain at least one board letter
        if (boardUpper.length > 0) {
          let hasBoardLetter = false;
          for (const ch of boardUpper) {
            if (wordFreq[ch]) {
              hasBoardLetter = true;
              break;
            }
          }
          if (!hasBoardLetter) continue;
        }

        // Calculate Scrabble score (blanks score 0)
        let score = 0;
        const tempFreq = { ...totalFreq };
        let blanksForThisWord = blanksUsed;

        for (const ch of word) {
          if (tempFreq[ch] && tempFreq[ch] > 0) {
            score += LETTER_VALUES[ch] || 0;
            tempFreq[ch]--;
          } else {
            // This letter was supplied by a blank
            // Blanks score 0
          }
        }

        // Bingo bonus: 50 points for using all 7 rack tiles
        const isBingo = word.length >= 7 &&
          (word.length - (boardUpper.length > 0 ? 1 : 0)) >= 7;

        if (isBingo) score += 50;

        results.push({
          word,
          score,
          usesBlank: blanksUsed > 0,
          isBingo
        });
      }

      // Sort by score descending
      results.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));

      return results;
    }

    // ─── Utility: get all words of a given length ──────────────────────────

    /**
     * Get all words of a specific length.
     * @param {number} length
     * @returns {string[]}
     */
    getWordsByLength(length) {
      return this._wordsByLength[length] || [];
    }

    // ─── Utility: get total word count ────────────────────────────────────

    /**
     * Get total number of words in the dictionary.
     * @returns {number}
     */
    getWordCount() {
      return this._allWordsArray.length;
    }

    // ─── Utility: get Wordle answer count ─────────────────────────────────

    /**
     * Get number of Wordle answers.
     * @returns {number}
     */
    getWordleAnswerCount() {
      return this._wordleAnswers.length;
    }

    /**
     * Get all Wordle answers.
     * @returns {string[]}
     */
    getWordleAnswers() {
      return [...this._wordleAnswers];
    }
  }

  return WordEngine;
});