#include "tree_sitter/parser.h"
#include <cstring>
#include <iostream>
#include <type_traits>

namespace {
enum TokenType { MULTILINE_COMMENT };

class Lexer {
  TSLexer *l;

public:
  int32_t &lookahead;

  TSSymbol &result_symbol;

  void advance(bool skip = false) { l->advance(l, skip); }

  void mark_end() { l->mark_end(l); }

  uint32_t get_column() { return l->get_column(l); }

  bool is_at_included_range_start() const {
    return l->is_at_included_range_start(l);
  }

  bool eof() { return l->eof(l); }

  Lexer(TSLexer *lexer)
      : l(lexer), lookahead(lexer->lookahead),
        result_symbol(lexer->result_symbol) {}
};

static bool is_whitespace(int c) {
  switch (c) {
  case ' ':
  case '\t':
  case '\r':
  case '\n':
    return true;
  default:
    return false;
  }
}

struct Scanner {
  unsigned serialize(char *buffer) { return 0; }

  void deserialize(const char *buffer, unsigned length) {}

  bool scan(TSLexer *lexer, const bool *valid_symbols) {
    Lexer l(lexer);
    l.mark_end();

    while (is_whitespace(l.lookahead)) {
      l.advance(true);
    }

    if (l.lookahead != '/') {
      return false;
    }
    l.advance();
    if (l.lookahead != '*') {
      return false;
    }
    l.advance();

    unsigned depth = 1;
    for (; l.lookahead; l.advance()) {
      if (l.lookahead == '/') {
        l.advance();
        if (l.lookahead != '*') {
          continue;
        }
        depth++;
      } else if (l.lookahead == '*') {
        l.advance();
        if (l.lookahead != '/') {
          continue;
        }
        l.advance();
        depth--;

        if (!depth) {
          l.mark_end();
          l.result_symbol = MULTILINE_COMMENT;
          return true;
        }
      }
    }

    return false;
  }
};
} // namespace

extern "C" {
void *tree_sitter_tablegen_external_scanner_create() { return new Scanner(); }

void tree_sitter_tablegen_external_scanner_destroy(void *payload) {
  delete static_cast<Scanner *>(payload);
}

unsigned tree_sitter_tablegen_external_scanner_serialize(void *payload,
                                                         char *buffer) {
  return static_cast<Scanner *>(payload)->serialize(buffer);
}

void tree_sitter_tablegen_external_scanner_deserialize(void *payload,
                                                       const char *buffer,
                                                       unsigned length) {
  static_cast<Scanner *>(payload)->deserialize(buffer, length);
}

bool tree_sitter_tablegen_external_scanner_scan(void *payload, TSLexer *lexer,
                                                const bool *valid_symbols) {
  return static_cast<Scanner *>(payload)->scan(lexer, valid_symbols);
}
}
