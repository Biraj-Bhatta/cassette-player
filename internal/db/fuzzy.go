// db/fuzzy.go
package db

import (
	"strings"
	"unicode"

	"github.com/sahilm/fuzzy"
)

// FuzzyScore returns a 0-100 score for how well query matches text.
// 0 means no match. Every word in the query must match the text, in any order.
// Each word is matched by sahilm/fuzzy, which requires its letters to appear in order.
func FuzzyScore(query, text string) int {
	q := normalize(query)
	t := normalize(text)
	if q == "" || t == "" {
		return 0
	}

	tokens := strings.Fields(q)
	total := 0
	for _, tok := range tokens {
		s := tokenScore(tok, t)
		if s == 0 {
			return 0 // one word matched nothing, so the whole query fails
		}
		total += s
	}
	return total / len(tokens)
}

// tokenScore scores one query word against the text, scaled to 0-100.
func tokenScore(tok, text string) int {
	matches := fuzzy.Find(tok, []string{text})
	if len(matches) == 0 {
		return 0
	}

	// The best score this word can get is matching it against itself.
	// Dividing by that makes an exact word score 100.
	self := fuzzy.Find(tok, []string{tok})
	if len(self) == 0 || self[0].Score <= 0 {
		return 0
	}

	score := matches[0].Score * 100 / self[0].Score
	if score > 100 {
		score = 100
	}
	return score
}

// normalize lowercases the text, turns punctuation into spaces, and collapses runs of spaces.
// "Tyler, The Creator" becomes "tyler the creator".
func normalize(s string) string {
	var b strings.Builder
	space := true
	for _, r := range strings.ToLower(s) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
			space = false
		} else if !space {
			b.WriteByte(' ')
			space = true
		}
	}
	return strings.TrimSpace(b.String())
}
