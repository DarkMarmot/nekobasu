

const Nyan = {};

// across = applies to all words in a phrase
//
const operationDefs = [

    {name: 'ACTION', sym: '^', react: true, subscribe: true},
    {name: 'NEED',   sym: '!', react: true, follow: true, need: true},
    {name: 'EVENT',  sym: '@', react: true, event: true},
    {name: 'RUN',    sym: '*', across: true},
    {name: 'READ',   sym: '~', with_react: true, read: true},
    {name: 'ATTR',   sym: '#'},
    {name: 'AND',    sym: '&', across: true},
    {name: 'STYLE',  sym: '$'},
    {name: 'WRITE',  sym: '='},
    {name: 'MUST',   sym: '_', with_react: true, read: true, need: true}, // must have data on read
    {name: 'FILTER', sym: '-', across: true},
    {name: 'WATCH',  sym: '%', react: true, follow: true} // default

];

// {name: 'BEGIN',  sym: '{'},
// {name: 'END',    sym: '}'},
// {name: 'PIPE',   sym: '|'},

const operationsBySymbol = {};
const operationsByName = {};
const symbolsByName = {};
const namesBySymbol = {};
const reactionsByName = {};
const withReactionsByName = {};
const acrossByName = {};

for(let i = 0; i < operationDefs.length; i++){

    const op = operationDefs[i];
    const name = op.name;
    const sym = op.sym;
    operationsBySymbol[sym] = op;
    operationsByName[name] = op;
    symbolsByName[name] = sym;
    namesBySymbol[sym] = name;

    if(op.across){
        acrossByName[name] = true;
    } else if(op.react) {
        reactionsByName[name] = true;
        withReactionsByName[name] = true;
    }
    else if(op.with_react) {
        withReactionsByName[name] = true;
    }

}



class NyanWord {

    constructor(name, operation, maybe, topic, alias, monitor){

        this.name = name;
        this.operation = operation;
        this.maybe = maybe || false;
        this.topic = topic || null;
        this.alias = alias || null;
        this.monitor = monitor || false;

    }

}


function parse(str) {

    const result = [];

    // split on parentheses and remove empty chunks (todo optimize for speed)
    let chunks = str.split(/([{}])/).map(d => d.trim()).filter(d => d);

    for(let i = 0; i < chunks.length; i++){

        const chunk = chunks[i];
        const sentence = (chunk === ')' || chunk === '(') ? chunk : parseSentence(chunk);

        if(typeof sentence === 'string' || sentence.length > 0)
            result.push(sentence);

    }

    validate(result);
    
    return result;

}

function validate(sentences){

    let firstPhrase = true;
    
    for(let i = 0; i < sentences.length; i++){
        const s = sentences[i];
        if(typeof s !== 'string') {
            for (let j = 0; j < s.length; j++) {
                const phrase = s[j];
                if(firstPhrase) {
                    validateReactivePhrase(phrase);
                    firstPhrase = false;
                }
                else {
                    validateStandardPhrase(phrase);
                }
            }
        }
    }
}


function validateReactivePhrase(phrase){
    
    let usingAction = false;
    for(let i = 0; i < phrase.length; i++){
        const nw = phrase[i];
        if(nw.operation === 'ACTION') {
            usingAction = true;
            break;
        }
    }

    let hasReaction = false;
    for(let i = 0; i < phrase.length; i++){

        const nw = phrase[i];
        const blankMeaning = (usingAction ? 'READ' : 'WATCH');
        const operation = nw.operation = nw.operation || blankMeaning;
        hasReaction = hasReaction || reactionsByName[operation];
        if(!withReactionsByName[operation])
            throw new Error('This Nyan command cannot be in a reaction!');

    }

    if(!hasReaction)
        throw new Error('Nyan commands must begin with a reaction!');

}


function validateStandardPhrase(phrase){

    const firstOperation = phrase[0].operation;
    const defaultOperation = acrossByName[firstOperation] && firstOperation;

    for(let i = 0; i < phrase.length; i++){
        const nw = phrase[i];
        nw.operation = nw.operation || defaultOperation || 'READ';

        if(defaultOperation && nw.operation !== defaultOperation){
            throw new Error('Incompatible Nyan commands in phrase!');
        }

        if (!defaultOperation && acrossByName[nw.operation]){
            throw new Error('Later incompatible in phrase!');
        }

        if (!defaultOperation && reactionsByName[nw.operation]){
            throw new Error('Reactions in later phrase!');
        }
    }

}



function parseSentence(str) {

    const result = [];
    const chunks = str.split('|').map(d => d.trim()).filter(d => d);

    for(let i = 0; i < chunks.length; i++){

        const chunk = chunks[i];
        const phrase = parsePhrase(chunk);
        result.push(phrase);

    }

    return result;

}

function parsePhrase(str) {

    const words = [];
    const rawWords = str.split(',').map(d => d.trim()).filter(d => d);

    const len = rawWords.length;

    for (let i = 0; i < len; i++) {

        const rawWord = rawWords[i];
        const chunks = rawWord.split(/([(?:)])/).map(d => d.trim()).filter(d => d);
        const nameAndOperation = chunks.shift();
        const firstChar = rawWord[0];
        const operation = namesBySymbol[firstChar];
        const start = operation ? 1 : 0;
        const name = nameAndOperation.slice(start);
        let maybe = false;
        let monitor = false;
        let topic = null;
        let alias = null;

        while(chunks.length){
            const c = chunks.shift();

            if(c === '?'){
                maybe = true;
                continue;
            }

            if(c === ':'){
                if(chunks.length){
                    const next = chunks[0];
                    if(next === '('){
                        monitor = true;
                    } else {
                        topic = next;
                    }
                } else {
                    monitor = true;
                }
                continue;
            }

            if(c === '(' && chunks.length){
                alias = chunks[0];
            }

        }

        const nw = new NyanWord(name, operation, maybe, topic, alias, monitor);
        words.push(nw);

    }

    return words;

}

Nyan.parse = parse;


export default Nyan;

