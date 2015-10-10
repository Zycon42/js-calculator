var calculator = (function() {
    'use strict';

    const T_OPERATOR = 'T_OPERATOR';
    const T_OPERAND = 'T_OPERAND';
    const T_LPAR = 'T_LPAR';
    const T_RPAR = 'T_RPAR';

    function* lexer(input) {
        function isDigit(c) {
            return c >= '0' && c <= '9';
        }

        function isOperator(c) {
            return ['+', '-', '*', '/', '^'].indexOf(c) > -1;
        }

        let iter = input[Symbol.iterator]();
        let next = iter.next();

        function processDigit(digit) {
            while (!(next = iter.next()).done) {
                const val = next.value;
                if (isDigit(val))
                    digit += val;
                else
                    break;
            }

            return {type: T_OPERAND, value: parseInt(digit)};
        }

        while (!next.done) {
            const c = next.value;
            if (c === ' ' || c === '\t' || c === '\n') {
                next = iter.next();
                continue;
            }

            if (isOperator(c)) {
                yield {type: T_OPERATOR, value: c};
                next = iter.next();
            }
            else if (c === '(' || c === ')') {
                yield {type: c === '(' ? T_LPAR : T_RPAR};
                next = iter.next();
            }
            else if (isDigit(c)) {
                yield processDigit(c);
            } else
                throw Error(`Input Error! Unknown input value '${c}'`);
        }
    }

    function createOperator(precedence, isLeftAssociative, numOperands, func) {
        return {
            precedence: precedence,
            isLeftAssociative: isLeftAssociative,
            numOperands: numOperands,
            evaluate: func
        };
    }

    function parser(input) {
        const opTable = {
            '+': createOperator(1, true, 2, (a, b) => a + b),
            '-': createOperator(1, true, 2, (a, b) => a - b),
            '*': createOperator(2, true, 2, (a, b) => a * b),
            '/': createOperator(2, true, 2, (a, b) => a / b),
            '^': createOperator(3, false, 2, (a, b) => Math.pow(a, b))
        };
        const unaryMinusOp = createOperator(4, false, 1, x => -x);

        let expectOperator = false;
        const output = [];
        const stack = [];
        for (const token of lexer(input)) {
            if (token.type === T_OPERAND) {
                if (expectOperator)
                    throw Error('Syntax Error! unexpected operand');

                output.push(token);

                expectOperator = true;
            }
            else if (token.type === T_OPERATOR) {
                if (!expectOperator) {
                    // handle unary minus
                    if (token.value === '-')
                        token.value = unaryMinusOp;
                    else
                        throw Error('Syntax Error! unexpected operator');
                } else
                    token.value = opTable[token.value];

                if (stack.length > 0) {
                    const last = stack[stack.length - 1];
                    if (last.type === T_OPERATOR &&
                            (token.value.isLeftAssociative ?
                                token.value.precedence <= last.value.precedence : // left associativity
                                token.value.precedence < last.value.precedence))  // right associativity

                        output.push(stack.pop());
                }

                stack.push(token);

                expectOperator = false;
            }
            else if (token.type === T_LPAR) {
                if (expectOperator)
                    throw Error('Syntax Error! encountered left parenthesis but expected operator');

                stack.push(token);

                expectOperator = false;
            }
            else if (token.type === T_RPAR) {
                while (stack.length > 0 && stack[stack.length - 1].type !== T_LPAR)
                    output.push(stack.pop());

                if (stack.length === 0)
                    throw Error('Syntax Error! Parenthesis mismatch');

                stack.pop();    // top of the stack is left par and we pop it

                expectOperator = true;
            } else
                throw Error(`Syntax Error! Unknown token type '${token.type}'`);
        }

        // check that we have no parenthesis on stack
        if (!stack.every(t => t.type !== T_LPAR && t.type !== T_RPAR))
            throw Error('Syntax Error! Parenthesis mismatch');

        // empty operator stack to output
        Array.prototype.push.apply(output, stack);

        return output;
    }


    return {
        calculate: function(input) {
            if (input === '')
                return '';

            try {
                const expr = parser(input);

                const stack = [];
                expr.forEach(t => {
                    if (t.type === T_OPERAND)
                        stack.push(t.value);
                    else {
                        const op = t.value;
                        // retrieve last n operands from stack and evaluate operator with them
                        const computed = op.evaluate.apply(op, stack.splice(-op.numOperands));

                        stack.push(computed);
                    }
                });

                if (stack.length !== 1)
                    throw Error('Evaluation Error! Input has too many values');

                return stack.pop();
            } catch (e) {
                return e.message;
            }
        }
    };
})();
