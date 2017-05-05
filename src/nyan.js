

const Nyan = {};

// then = applies to all words in a phrase
// watch: ^ = action, need, event, watch | read, must
// then:  run, read, attr, and, style, write, blast, filter

const operationDefs = [

    {name: 'ACTION', sym: '^',  react: true, subscribe: true},
    {name: 'WATCH',  sym: null, react: true, follow: true},
    {name: 'NEED',   sym: '!',  react: true, follow: true, need: true},
    {name: 'EVENT',  sym: '@',  react: true, event: true},
    {name: 'READ',   sym: null, then: true, with_react: true, read: true},
    {name: 'MUST',   sym: '_',  then: true, with_react: true, read: true, need: true}, // must have data on read
    {name: 'ATTR',   sym: '#',  then: true},
    {name: 'AND',    sym: '&',  then: true},
    {name: 'STYLE',  sym: '$',  then: true},
    {name: 'WRITE',  sym: '=',  then: true},
    {name: 'RUN',    sym: '*',  then: true},
    {name: 'FILTER', sym: '%',  then: true}

];

// {name: 'BEGIN',  sym: '{'}, -- fork
// {name: 'END',    sym: '}'}, -- join
// {name: 'PIPE',   sym: '|'}, -- phrase delimiter
// read = SPACE

const operationsBySymbol = {};
const operationsByName = {};
const symbolsByName = {};
const namesBySymbol = {};
const reactionsByName = {};
const withReactionsByName = {};
const thenByName = {};

for(let i = 0; i < operationDefs.length; i++){

    const op = operationDefs[i];
    const name = op.name;
    const sym = op.sym;

    if(sym) {
        operationsBySymbol[sym] = op;
        namesBySymbol[sym] = name;
    }

    operationsByName[name] = op;
    symbolsByName[name] = sym;

    if(op.then){
        thenByName[name] = true;
    }

    if(op.react) {
        reactionsByName[name] = true;
        withReactionsByName[name] = true;
    } else if(op.with_react) {
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


function parse(str, isProcess) {

    const sentences = [];

    // split on parentheses and remove empty chunks (todo optimize for speed)
    let chunks = str.split(/([{}])/).map(d => d.trim()).filter(d => d);

    for(let i = 0; i < chunks.length; i++){

        const chunk = chunks[i];
        const sentence = (chunk === '}' || chunk === '{') ? chunk : parseSentence(chunk);

        if(typeof sentence === 'string' || sentence.length > 0)
            sentences.push(sentence);

    }

    return validate(sentences, isProcess);


}

function validate(sentences, isProcess){

    const cmdList = [];
    let firstPhrase = true;
    
    for(let i = 0; i < sentences.length; i++){
        const s = sentences[i];
        if(typeof s !== 'string') {
            for (let j = 0; j < s.length; j++) {
                const phrase = s[j];
                if(firstPhrase && !isProcess) {
                    validateReactPhrase(phrase);
                    firstPhrase = false;
                    cmdList.push({name: 'REACT', phrase: phrase})
                }
                else {
                    validateProcessPhrase(phrase);
                    cmdList.push({name: 'PROCESS', phrase: phrase})
                }
            }
        } else if (s === '{') {
            cmdList.push({name: 'FORK'});
        } else if (s === '}') {
            cmdList.push({name: 'JOIN'});
        }
    }

    return cmdList;
}


function validateReactPhrase(phrase){

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
        throw new Error('Nyan commands must begin with an observation!');

}



function validateProcessPhrase(phrase){

    const firstPhrase = phrase[0];
    const firstOperation = firstPhrase.operation || 'READ';

    if(!thenByName[firstOperation])
        throw new Error('Illegal operation in phrase!'); // unknown or reactive

    for(let i = 0; i < phrase.length; i++){

        const nw = phrase[i];
        nw.operation = nw.operation || firstOperation;
        if(nw.operation !== firstOperation){
            console.log('mult', nw.operation, firstOperation);
            throw new Error('Multiple operation types in phrase (only one allowed)!');
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

