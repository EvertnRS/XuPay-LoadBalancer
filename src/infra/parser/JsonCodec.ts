import type { JsonValue } from "@/@types/contracts/MessagePayload";

export type JsonObject = { [key: string]: JsonValue };

export class JsonCodec {
  public static parseObject(raw: string): JsonObject {
    const parser = new JsonParser(raw);
    const value = parser.parse();

    if (!this.isJsonObject(value)) {
      throw new Error("Body JSON deve ser um objeto");
    }

    return value;
  }

  public static stringify(value: JsonValue): string {
    if (value === null) {
      return "null";
    }

    if (typeof value === "string") {
      return this.stringifyString(value);
    }

    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new Error("JSON não suporta número infinito ou NaN");
      }

      return String(value);
    }

    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stringify(item)).join(",")}]`;
    }

    return `{${Object.entries(value)
      .map(([key, item]) => `${this.stringifyString(key)}:${this.stringify(item)}`)
      .join(",")}}`;
  }

  public static stableStringify(value: JsonValue): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(",")}]`;
    }

    if (value !== null && typeof value === "object") {
      return `{${Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(
          ([key, item]) =>
            `${this.stringifyString(key)}:${this.stableStringify(item)}`
        )
        .join(",")}}`;
    }

    return this.stringify(value);
  }

  public static isJsonObject(value: JsonValue): value is JsonObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private static stringifyString(value: string): string {
    let escaped = "";

    for (const character of value) {
      switch (character) {
        case "\"":
          escaped += "\\\"";
          break;
        case "\\":
          escaped += "\\\\";
          break;
        case "\b":
          escaped += "\\b";
          break;
        case "\f":
          escaped += "\\f";
          break;
        case "\n":
          escaped += "\\n";
          break;
        case "\r":
          escaped += "\\r";
          break;
        case "\t":
          escaped += "\\t";
          break;
        default:
          escaped += this.escapeControlCharacter(character);
      }
    }

    return `"${escaped}"`;
  }

  private static escapeControlCharacter(character: string): string {
    const codePoint = character.codePointAt(0);

    if (codePoint !== undefined && codePoint < 0x20) {
      return `\\u${codePoint.toString(16).padStart(4, "0")}`;
    }

    return character;
  }
}

class JsonParser {
  private index = 0;

  constructor(private readonly raw: string) {}

  public parse(): JsonValue {
    this.skipWhitespace();
    const value = this.parseValue();
    this.skipWhitespace();

    if (!this.isAtEnd()) {
      throw new Error("JSON inválido: conteúdo extra após o fim do body");
    }

    return value;
  }

  private parseValue(): JsonValue {
    this.skipWhitespace();
    const character = this.peek();

    if (character === "\"") {
      return this.parseString();
    }

    if (character === "{") {
      return this.parseObject();
    }

    if (character === "[") {
      return this.parseArray();
    }

    if (character === "t") {
      return this.parseLiteral("true", true);
    }

    if (character === "f") {
      return this.parseLiteral("false", false);
    }

    if (character === "n") {
      return this.parseLiteral("null", null);
    }

    if (character === "-" || this.isDigit(character)) {
      return this.parseNumber();
    }

    throw new Error(`JSON inválido próximo de '${character}'`);
  }

  private parseObject(): JsonObject {
    const object: JsonObject = {};
    this.consume("{");
    this.skipWhitespace();

    if (this.peek() === "}") {
      this.consume("}");
      return object;
    }

    while (true) {
      this.skipWhitespace();

      if (this.peek() !== "\"") {
        throw new Error("JSON inválido: chave de objeto deve ser string");
      }

      const key = this.parseString();
      this.skipWhitespace();
      this.consume(":");
      object[key] = this.parseValue();
      this.skipWhitespace();

      if (this.peek() === "}") {
        this.consume("}");
        return object;
      }

      this.consume(",");
    }
  }

  private parseArray(): JsonValue[] {
    const array: JsonValue[] = [];
    this.consume("[");
    this.skipWhitespace();

    if (this.peek() === "]") {
      this.consume("]");
      return array;
    }

    while (true) {
      array.push(this.parseValue());
      this.skipWhitespace();

      if (this.peek() === "]") {
        this.consume("]");
        return array;
      }

      this.consume(",");
    }
  }

  private parseString(): string {
    let result = "";
    this.consume("\"");

    while (!this.isAtEnd()) {
      const character = this.advance();

      if (character === "\"") {
        return result;
      }

      if (character === "\\") {
        result += this.parseEscapedCharacter();
        continue;
      }

      result += character;
    }

    throw new Error("JSON inválido: string sem fechamento");
  }

  private parseEscapedCharacter(): string {
    const escaped = this.advance();

    switch (escaped) {
      case "\"":
      case "\\":
      case "/":
        return escaped;
      case "b":
        return "\b";
      case "f":
        return "\f";
      case "n":
        return "\n";
      case "r":
        return "\r";
      case "t":
        return "\t";
      case "u":
        return this.parseUnicodeEscape();
      default:
        throw new Error(`JSON inválido: escape \\${escaped}`);
    }
  }

  private parseUnicodeEscape(): string {
    const hex = this.raw.slice(this.index, this.index + 4);

    if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
      throw new Error("JSON inválido: escape unicode inválido");
    }

    this.index += 4;
    return String.fromCharCode(Number.parseInt(hex, 16));
  }

  private parseNumber(): number {
    const start = this.index;

    if (this.peek() === "-") {
      this.advance();
    }

    if (this.peek() === "0") {
      this.advance();
    } else {
      this.consumeDigits();
    }

    if (this.peek() === ".") {
      this.advance();
      this.consumeDigits();
    }

    if (this.peek() === "e" || this.peek() === "E") {
      this.advance();

      if (this.peek() === "+" || this.peek() === "-") {
        this.advance();
      }

      this.consumeDigits();
    }

    const parsed = Number(this.raw.slice(start, this.index));

    if (!Number.isFinite(parsed)) {
      throw new Error("JSON inválido: número inválido");
    }

    return parsed;
  }

  private parseLiteral<T extends JsonValue>(literal: string, value: T): T {
    if (this.raw.slice(this.index, this.index + literal.length) !== literal) {
      throw new Error(`JSON inválido: literal ${literal} esperado`);
    }

    this.index += literal.length;
    return value;
  }

  private consumeDigits(): void {
    const start = this.index;

    while (this.isDigit(this.peek())) {
      this.advance();
    }

    if (this.index === start) {
      throw new Error("JSON inválido: dígito esperado");
    }
  }

  private consume(expected: string): void {
    const actual = this.advance();

    if (actual !== expected) {
      throw new Error(`JSON inválido: esperado '${expected}', recebido '${actual}'`);
    }
  }

  private skipWhitespace(): void {
    while (/\s/.test(this.peek())) {
      this.advance();
    }
  }

  private advance(): string {
    if (this.isAtEnd()) {
      throw new Error("JSON inválido: fim inesperado");
    }

    return this.raw[this.index++];
  }

  private peek(): string {
    return this.raw[this.index] || "";
  }

  private isAtEnd(): boolean {
    return this.index >= this.raw.length;
  }

  private isDigit(character: string): boolean {
    return character >= "0" && character <= "9";
  }
}
