

const Nyan = {};

const operationDefs = [

    {name: 'ACT',   sym: '^'},
    {name: 'NEED',  sym: '!'},
    {name: 'EVENT', sym: '@'},
    {name: 'RUN',   sym: '*'},
    {name: 'READ',  sym: '~'},
    {name: 'ATTR',  sym: '#'},
    {name: 'ADD',   sym: '+'},
    {name: 'STYLE', sym: '$'},
    {name: 'BEGIN', sym: '('},
    {name: 'END',   sym: ')'},
    {name: 'WRITE', sym: '='},
    {name: 'PIPE',  sym: '|'},
    {name: 'WATCH', sym: '-'}

];

const operationsBySymbol = {};
const symbolsByOperation = {};

for(let i = 0; i < operationDefs.length; i++){
    const op = operationDefs[i];
    const name = op.name;
    const sym = op.sym;
    operationsBySymbol[sym] = name;
    symbolsByOperation[name] = sym;
}


class NyanWord {
    constructor(name, operation, optional){
        this.name = name;
        this.operation = operation;
        this.optional = optional;
    }

    toString(){
        return 'meow';
    };
}

function throwError(text){
    throw new Error(text);
}

function parse(str) {

    const result = [];
    const chunks = str.split(/([()])/); // split on parentheses

    for(let i = 0; i < chunks.length; i++){
        const chunk = chunks[i].trim();

        if(!chunk)
            continue;

        const sentence = (chunk === ')' || chunk === '(') ? chunk : parseSentence(chunk);

        if(typeof sentence === 'string' || sentence.length > 0)
            result.push(sentence);

    }

    return result;

}


function parseSentence(str) {

    const result = [];
    const chunks = str.split('|');

    for(let i = 0; i < chunks.length; i++){
        const chunk = chunks[i].trim();

        if(!chunk)
            continue;

        const phrase = parsePhrase(chunk);
        result.push(phrase);

    }

    return result;

}

function parsePhrase(str) {

    const words = [];
    const rawWords = str.split(',');
    let usingAct = false;

    const len = rawWords.length;

    for (let i = 0; i < len; i++) {

        const rawWord = rawWords[i].trim();
        const charCount = rawWord.length;

        if (!charCount)
            continue;

        const lastIndex = charCount - 1;
        const firstChar = rawWord[0];
        const lastChar = rawWord[lastIndex];

        const operation = operationsBySymbol[firstChar];
        const optional = lastChar === '?';

        const start = operation ? 1 : 0;
        const end = optional ? -1 : charCount;
        const name = rawWord.slice(start, end);

        if (!name.length)
            throw new Error('Word missing name!');

        if (operation === 'ACT')
            usingAct = true;

        const nw = new NyanWord(name, operation, optional);
        words.push(nw);

    }

    const wordCount = words.length;
    for (let i = 0; i < wordCount; i++) {
        const nw = words[i];
        if(!nw.operation){
            nw.operation = usingAct ? 'READ' : 'WATCH';
        }
    }

    return words;

}

Nyan.parse = parse;


export default Nyan;

