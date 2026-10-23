// db/fuzzy_test.go
package db

import "testing"

func TestFuzzyScore(t *testing.T) {
	cases := []struct {
		query, text string
		wantMatch   bool
	}{
		{"ekdev limbu", "Ekdev Limbu", true},  // exact, case-insensitive
		{"ekdv", "Ekdev Limbu", true},         // missing letter
		{"limbu ekdev", "Ekdev Limbu", true},  // words in another order
		{"tlrcr", "Tyler, The Creator", true}, // skipped letters
		{"xyz", "Ekdev Limbu", false},         // no match
	}
	for _, c := range cases {
		got := FuzzyScore(c.query, c.text) > 0
		if got != c.wantMatch {
			t.Errorf("FuzzyScore(%q, %q) match = %v, want %v (score %d)",
				c.query, c.text, got, c.wantMatch, FuzzyScore(c.query, c.text))
		}
	}
}
