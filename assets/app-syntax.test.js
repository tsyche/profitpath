import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Validates JavaScript syntax by checking brace matching
 * and detecting common syntax errors
 */
function validateJSSyntax(content) {
  const errors = [];
  let braceStack = [];
  let parenStack = [];
  let bracketStack = [];
  let inString = false;
  let stringChar = '';
  let inComment = false;
  let inLineComment = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    const nextChar = i < content.length - 1 ? content[i + 1] : '';

    // Handle line comments
    if (!inString && char === '/' && nextChar === '/') {
      inLineComment = true;
      i++; // skip next /
      continue;
    }
    if (inLineComment && char === '\n') {
      inLineComment = false;
      continue;
    }
    if (inLineComment) continue;

    // Handle block comments
    if (!inString && char === '/' && nextChar === '*') {
      inComment = true;
      i++; // skip next *
      continue;
    }
    if (inComment && char === '*' && nextChar === '/') {
      inComment = false;
      i++; // skip next /
      continue;
    }
    if (inComment) continue;

    // Handle strings
    if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (inString) continue;

    // Track bracket matching
    if (char === '{') {
      braceStack.push({ char: '{', line: content.substring(0, i).split('\n').length });
    } else if (char === '}') {
      if (braceStack.length === 0) {
        const line = content.substring(0, i).split('\n').length;
        errors.push(`Unexpected closing brace } at line ${line}`);
      } else {
        braceStack.pop();
      }
    } else if (char === '(') {
      parenStack.push({ char: '(', line: content.substring(0, i).split('\n').length });
    } else if (char === ')') {
      if (parenStack.length === 0) {
        const line = content.substring(0, i).split('\n').length;
        errors.push(`Unexpected closing parenthesis ) at line ${line}`);
      } else {
        parenStack.pop();
      }
    } else if (char === '[') {
      bracketStack.push({ char: '[', line: content.substring(0, i).split('\n').length });
    } else if (char === ']') {
      if (bracketStack.length === 0) {
        const line = content.substring(0, i).split('\n').length;
        errors.push(`Unexpected closing bracket ] at line ${line}`);
      } else {
        bracketStack.pop();
      }
    }
  }

  // Check for unclosed brackets
  if (braceStack.length > 0) {
    braceStack.forEach(b => {
      errors.push(`Unclosed brace { at line ${b.line}`);
    });
  }
  if (parenStack.length > 0) {
    parenStack.forEach(p => {
      errors.push(`Unclosed parenthesis ( at line ${p.line}`);
    });
  }
  if (bracketStack.length > 0) {
    bracketStack.forEach(b => {
      errors.push(`Unclosed bracket [ at line ${b.line}`);
    });
  }

  return errors;
}

describe('App Syntax Test', () => {
  it('should parse app.jsx without syntax errors', () => {
    const filePath = resolve(__dirname, '../assets/app.jsx');
    const fileContent = readFileSync(filePath, 'utf8');

    // Validate using our custom syntax checker
    const errors = validateJSSyntax(fileContent);

    if (errors.length > 0) {
      throw new Error(`Syntax errors found in app.jsx:\n${errors.join('\n')}`);
    }

    expect(errors).toHaveLength(0);
  });

  it('should not have unmatched braces, parentheses, or brackets', () => {
    const filePath = resolve(__dirname, '../assets/app.jsx');
    const fileContent = readFileSync(filePath, 'utf8');
    const errors = validateJSSyntax(fileContent);

    expect(errors).toHaveLength(0);
  });

});
