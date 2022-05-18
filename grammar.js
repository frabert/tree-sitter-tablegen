module.exports = grammar({
    name: 'tablegen',
    extras: $ => [
        /\s|\\\r?\n/,
        $.singleline_comment,
        $.multiline_comment,
    ],

    externals: $ => [
        $.multiline_comment
    ],

    word: $ => $.tok_identifier,

    rules: {
        source_file: $ => repeat($._toplevel),
        _toplevel: $ => choice(
            $._statement,
            $.include_directive,
            $._preprocessor_directive
        ),
        singleline_comment: $ => seq('//', /(\\(.|\r?\n)|[^\\\n])*/),

        // https://llvm.org/docs/TableGen/ProgRef.html#literals
        decimal_integer: $ => /[\+\-]?[0-9]+/,
        hex_integer: $ => /0x[0-9a-fA-F]+/,
        bin_integer: $ => /0b[01]+/,
        tok_integer: $ => choice($.decimal_integer, $.hex_integer, $.bin_integer),
        tok_string: $ => seq(
          '"',
          repeat(choice(
            token.immediate(prec(1, /[^\\"\n]+/)),
            $.escape_sequence
          )),
          '"'),
        tok_code: $ => /\[\{([^}]\]|\}[^\]]|[^}\]])*\}+\]/,
        escape_sequence: $ => token(prec(1, seq(
          '\\',
          choice('\\', '\'', '"', 't', 'n')))),
        
        // https://llvm.org/docs/TableGen/ProgRef.html#identifiers
        tok_identifier: $ => /[0-9]*[a-zA-Z_][0-9a-zA-Z_]*/,
        tok_var_name: $ => /\$[a-zA-Z_][0-9a-zA-Z_]*/,

        // https://llvm.org/docs/TableGen/ProgRef.html#bang-operators
        bang_operator: $ => choice('!add', '!and', '!cast', '!con', '!dag', '!empty', '!eq',
                                   '!filter', '!find', '!foldl', '!foreach', '!ge', '!getdagop',
                                   '!gt', '!head', '!if', '!interleave', '!isa', '!le',
                                   '!listconcat', '!listsplat', '!lt', '!mul', '!ne', '!not',
                                   '!or', '!setdagop', '!shl', '!size', '!sra', '!srl',
                                   '!strconcat', '!sub', '!subst', '!substr', '!tail', '!xor',
                                   '!getop', '!setop'),
        cond_operator: $ => '!cond',

        // https://llvm.org/docs/TableGen/ProgRef.html#include-files
        include_directive: $ => seq('include', field('file', $.tok_string)),
        _preprocessor_directive: $ => choice($.preproc_define, $.preproc_ifdef),
        macro_name: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,
        preproc_define: $ => seq(/#define[ \t]+/, field('name', $.macro_name), /[ \t]*\r?\n/),
        preproc_ifdef: $ => seq(
            field('type', choice(/#ifdef[ \t]+/, /#ifndef[ \t]+/)),
            field('cond', $.macro_name),
            /[ \t]*\r?\n/,
            field('then', repeat($._toplevel)),
            field('else', optional($.preproc_else)),
            $._preproc_endif),
        preproc_else: $ => seq(/#else[ \t]*\r?\n/, repeat($._toplevel)),
        _preproc_endif: $ => /#endif[ \t]*\r?\n?/,

        // https://llvm.org/docs/TableGen/ProgRef.html#types
        bit_type: $ => 'bit',
        int_type: $ => 'int',
        string_type: $ => 'string',
        dag_type: $ => 'dag',
        bits_type: $ => seq('bits', '<', field('size', $.tok_integer), '>'),
        list_type: $ => seq('list', '<', $.type, '>'),
        type: $ => choice(
            $.tok_identifier, $.bit_type, $.int_type, $.string_type, $.dag_type,
            $.bits_type, $.list_type),

        // https://llvm.org/docs/TableGen/ProgRef.html#values-and-expressions
        value: $ => prec.left(sepBy1('#', $._value_partial)),
        _value_partial: $ => prec.left(seq($._simple_value, repeat($.value_suffix))),
        value_suffix: $ => choice(
            seq('{', field('bits', $.range_list), '}'),
            seq('[', field('slices', $.range_list), ']'),
            seq('.', field('field', $.tok_identifier))),
        range_list: $ => sepBy1(',', $.range_piece),
        range_piece: $ => choice(
            $.tok_integer,
            seq($.tok_integer, '...', $.tok_integer),
            seq($.tok_integer, '-', $.tok_integer),
            seq($.tok_integer, $.tok_integer)),

        // https://llvm.org/docs/TableGen/ProgRef.html#simple-values
        value_list: $ => sepBy1(',', $.value),
        dag_arg_list: $ => sepBy1(',', $.dag_arg),
        dag_arg: $ => choice(
            seq($.value, optional(seq(':', $.tok_var_name))),
            $.tok_var_name),
        cond_clause: $ => seq($.value, ':', $.value),
        true: $ => 'true',
        false: $ => 'false',
        unknown: $ => '?',
        _simple_value: $ => prec.left(1, choice(
            $.tok_integer,
            repeat1($.tok_string),
            $.tok_code,
            $.true,
            $.false,
            $.unknown,
            field('bits', seq('{', optional($.value_list), '}')),
            field('list', seq('[', optional($.value_list), ']', optional(seq('<', $.type, '>')))),
            field('dag', seq('(', field('name', $.dag_arg), field('args', optional($.dag_arg_list)), ')')),
            field('name', $.tok_identifier),
            seq(field('name', $.tok_identifier), '<', field('type_args', $.value_list), '>'),
            seq(field('op', $.bang_operator), optional(seq('<', $.type, '>')), '(', field('args', $.value_list), ')'),
            seq($.cond_operator, '(', field('cond_clauses', sepBy1(',', $.cond_clause)), ')'))),

        // https://llvm.org/docs/TableGen/ProgRef.html#statements
        _statement: $ => choice(
            $.assert,
            $.class,
            $.def,
            $.defm,
            $.defset,
            $.defvar,
            $.foreach,
            $.if,
            $.let,
            $.multiclass),

        // https://llvm.org/docs/TableGen/ProgRef.html#class-define-an-abstract-record-class
        class: $ => seq('class',
            field('name', $.tok_identifier),
            field('template_args', optional($.template_arg_list)),
            $.record_body),
        template_arg_list: $ => seq('<', sepBy1(',', $.template_arg_decl), '>'),
        template_arg_decl: $ => seq($.type, field('name', $.tok_identifier), optional(seq('=', $.value))),

        // https://llvm.org/docs/TableGen/ProgRef.html#record-bodies
        record_body: $ => seq(optional($.parent_class_list), $._body),
        parent_class_list: $ => seq(':', sepBy1(',', $.class_ref)),
        class_ref: $ => seq($.tok_identifier, optional(seq('<', optional($.value_list), '>'))),
        _body: $ => choice(';', seq('{', repeat($._body_item), '}')),
        body_let: $ => seq('let',
            field('name', $.tok_identifier),
            optional(seq('{', field('body', field('bits', $.range_list)), '}')),
            '=', $.value, ';'),
        body_member: $ => seq(
            optional('field'),
            field('type', choice($.type, 'code')),
            field('name', $.tok_identifier),
            optional(seq('=', $.value)), ';'),
        body_defvar: $ => seq(
            'defvar',
            field('name', $.tok_identifier),
            '=', $.value, ';'),
        _body_item: $ => choice(
            $.body_let,
            $.body_member,
            $.body_defvar,
            $.assert,
            $._preprocessor_directive),

        // https://llvm.org/docs/TableGen/ProgRef.html#def-define-a-concrete-record
        def: $ => seq('def', optional($.value), $.record_body),

        // https://llvm.org/docs/TableGen/ProgRef.html#let-override-fields-in-classes-or-records
        let: $ => seq('let', $._let_list, 'in', choice(
            seq('{', repeat($._let_statement), '}'),
            $._statement)),
        _let_statement: $ => choice($._statement, $._preprocessor_directive),
        _let_list: $ => sepBy1(',', $.let_item),
        let_item: $ => seq(
            field('name', $.tok_identifier),
            optional(seq('<', field('template_args', $.range_list), '>')), '=', $.value),

        // https://llvm.org/docs/TableGen/ProgRef.html#multiclass-define-multiple-records
        multiclass: $ => seq(
            'multiclass',
            field('name', $.tok_identifier),
            optional($.template_arg_list),
            optional($.parent_class_list),
            choice(
                seq('{', field('body', repeat1($._multiclass_statement)), '}'),
                ';')),
        _multiclass_statement: $ => choice(
            $.assert,
            $.def,
            $.defm,
            $.defvar,
            $.foreach,
            $.if,
            $.let,
            $._preprocessor_directive),

        // https://llvm.org/docs/TableGen/ProgRef.html#defm-invoke-multiclasses-to-define-multiple-records
        defm: $ => seq('defm', optional($.value), optional($.parent_class_list), ';'),

        // https://llvm.org/docs/TableGen/ProgRef.html#defset-create-a-definition-set
        defset: $ => seq(
            'defset',
            $.type,
            field('name', $.tok_identifier),
            '=', '{', repeat($._defset_statement), '}'),
        _defset_statement: $ => choice(
            $._statement,
            $._preprocessor_directive),

        // https://llvm.org/docs/TableGen/ProgRef.html#defvar-define-a-variable
        defvar: $ => seq('defvar', field('name', $.tok_identifier), '=', $.value, ';'),

        // https://llvm.org/docs/TableGen/ProgRef.html#foreach-iterate-over-a-sequence-of-statements
        foreach: $ => seq('foreach', $.foreach_iterator, 'in', field('body', choice(
            seq('{', repeat($._foreach_statement), '}'),
            $._statement))),
        _foreach_statement: $ => choice(
            $._statement,
            $._preprocessor_directive),
        foreach_iterator: $ => seq($.tok_identifier, '=', choice(
            seq('{', $.range_list, '}'),
            $.range_piece,
            $.value)),

        // https://llvm.org/docs/TableGen/ProgRef.html#if-select-statements-based-on-a-test
        if: $ => prec.right(
            seq('if', field('cond', $.value), 'then', $.if_body, optional(seq('else', field('else', $.if_body))))),
        _if_body_statement: $ => choice(
            $._statement,
            $._preprocessor_directive),
        if_body: $ => choice(
            seq('{', repeat($._if_body_statement), '}'),
            $._statement),

        // https://llvm.org/docs/TableGen/ProgRef.html#assert-check-that-a-condition-is-true
        assert: $ => seq('assert', field('cond', $.value), ',', field('message', $.value),';')
    }
});

function sepBy (sep, rule) {
    return optional(commaSep1(sep, rule))
}

function sepBy1 (sep, rule, allowTrailing = true) {
    if(allowTrailing) {
        return seq(rule, repeat(seq(sep, rule)), optional(sep))
    } else {
        return seq(rule, repeat(seq(sep, rule)))
    }
}