

const Nyan = {};

// then = applies to all words in a phrase
// watch: ^ = action, need, event, watch | read, must
// then:  run, read, attr, and, style, write, blast, filter

const operationDefs = [

    // rm: =, ^
    // change: : = alias, # = hash, () = args for cmd, & = cmd
    // = = transaction,

    // &filter(true) &throttle(200)


    // config is a dash
    // . is a prop
    {name: 'ACTION', sym: '^',  react: true, subscribe: true, need: true, solo: true},
    {name: 'WIRE',   sym: '~',  react: true, follow: true}, // INTERCEPT
    {name: 'WATCH',  sym: null, react: true, follow: true},
    {name: 'EVENT',  sym: '@',  react: true, event: true},
    {name: 'ALIAS',  sym: '(',  then: true, solo: true},
    {name: 'METHOD', sym: '`',  then: true, solo: true},
    {name: 'READ',   sym: null, then: true, read: true},
    {name: 'ATTR',   sym: '#',  then: true, solo: true, output: true},
    {name: 'AND',    sym: '&',  then: true },
    {name: 'WRITE',  sym: '=',  then: true,  solo: true },
    {name: 'SPRAY',  sym: '<',  then: true },
    {name: 'RUN',    sym: '*',  then: true, output: true },
    {name: 'FILTER', sym: '>',  then: true }

];



// cat, dog | & meow, kitten {*log} | =puppy


// todo make ! a trailing thingie, must goes away
// trailing defs -- ! = needs message in data to continue, ? = data must exist or throw error
// {name: 'BEGIN',  sym: '{'}, -- fork
// {name: 'END',    sym: '}'}, -- back
// {name: 'PIPE',   sym: '|'}, -- phrase delimiter
// read = SPACE
// - is data maybe (data point might not be present)
// ? is object maybe (object might not be there)
// () is rename

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
    }

}



class NyanWord {

    constructor(name, operation, maybe, need, alias, monitor, extracts){

        this.name = name;
        this.operation = operation;
        this.maybe = maybe || false;
        this.need = need || false;
        this.alias = alias || null;
        this.monitor = monitor || false;
        this.extracts = extracts && extracts.length ? extracts : null; // possible list of message property pulls
        // this.useCapture =

    }

}

let tickStack = [];

function toTickStackString(str){


    tickStack = [];
    const chunks = str.split(/([`])/);
    const strStack = [];

    let ticking = false;
    while(chunks.length){
        const c = chunks.shift();
        if(c === '`'){
            ticking = !ticking;
            strStack.push(c);
        } else {
            if(ticking) {
                tickStack.push(c);
            } else {
                strStack.push(c);
            }
        }
    }

    const result = strStack.join('');
    //console.log('stack res', result, tickStack);
    return result;
}

function parse(str, isProcess) {


    str = toTickStackString(str);

    const sentences = [];

    // split on curlies and remove empty chunks (todo optimize for parsing speed, batch loop operations?)
    let chunks = str.split(/([{}]|-})/).map(d => d.trim()).filter(d => d);

    for(let i = 0; i < chunks.length; i++){

        const chunk = chunks[i];
        const sentence = (chunk === '}' || chunk === '{' || chunk === '-}') ? chunk : parseSentence(chunk);

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
                    cmdList.push({name: 'REACT', phrase: phrase});
                }
                else {
                    validateProcessPhrase(phrase);
                    cmdList.push({name: 'PROCESS', phrase: phrase});
                }
            }

        } else if (s === '{') {
            cmdList.push({name: 'FORK'});
        } else if (s === '}') {
            cmdList.push({name: 'BACK'});
        } else if (s === '-}') {
            cmdList.push({name: 'JOIN'});
        }
    }

    return cmdList;
}


function validateReactPhrase(phrase){

    let hasReaction = false;
    for(let i = 0; i < phrase.length; i++){

        const nw = phrase[i];
        const operation = nw.operation = nw.operation || 'WATCH';
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

           // console.log('mult', nw.operation, firstOperation);
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
        //console.log('word=', rawWord);
        const rawChunks = rawWord.split(/([(?!:.`)])/);
        const chunks = [];
        let inMethod = false;

        // white space is only allowed between e.g. `throttle 200`, `string meow in the hat`

        while(rawChunks.length){
            const next = rawChunks.shift();
            if(next === '`'){
                inMethod = !inMethod;
                chunks.push(next);
            } else {
                if(!inMethod){
                    const trimmed = next.trim();
                    if(trimmed)
                        chunks.push(trimmed);
                } else {
                    chunks.push(next);
                }
            }
        }

        //console.log('to:', chunks);
        const nameAndOperation = chunks.shift();
        const firstChar = rawWord[0];
        const operation = namesBySymbol[firstChar];
        const start = operation ? 1 : 0;
        const name = nameAndOperation.slice(start).trim();
        const extracts = [];

        // todo hack (rename)

        let maybe = false;
        let monitor = false;
        let alias = null;
        let need = false;

        if(operation === 'ALIAS'){
            alias = chunks.shift();
            chunks.shift(); // todo verify ')'
        } else if (operation === 'METHOD'){
                chunks.shift();
                // const next = chunks.shift();
                const next = tickStack.shift();
                const i = next.indexOf(' ');
                if(i === -1) {
                    extracts.push(next);
                } else {
                    extracts.push(next.slice(0, i));
                    if(next.length > i){
                        extracts.push(next.slice(i + 1));
                    }
                }

            while(chunks.length){ chunks.shift(); }
        }

        while(chunks.length){

            const c = chunks.shift();

            switch(c){

                case '.':

                    const prop = chunks.length && chunks[0]; // todo assert not operation
                    const silentFail = chunks.length > 1 && (chunks[1] === '?');

                    if(prop) {
                        extracts.push({name: prop, silentFail: silentFail});
                        chunks.shift(); // remove word from queue
                        if(silentFail)
                            chunks.shift(); // remove ? from queue
                    }

                    break;

                case '?':

                    maybe = true;
                    break;

                case '!':

                    need = true;
                    break;

                case '(':

                    if(chunks.length){
                        alias = chunks.shift(); // todo assert not operation
                    }

                    break;



            }

        }

        alias = alias || name;
        const nw = new NyanWord(name, operation, maybe, need, alias, monitor, extracts);
        words.push(nw);

    }

    return words;

}

Nyan.parse = parse;


export default Nyan;

