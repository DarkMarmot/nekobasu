

const MeowParser = {};

const phraseCmds = {

    '&': {name: 'AND_READ', react: false, process: true, output: false, can_maybe: true, can_alias: true, can_prop: true},
    '>': {name: 'WRITE', react: false, process: true, output: true, can_maybe: true, can_alias: true, can_prop: true},
    '|': {name: 'THEN_READ', react: false, process: true, output: false, can_maybe: true, can_alias: true, can_prop: true},
    '@': {name: 'EVENT', react: true, process: false, output: false, can_maybe: true, can_alias: true, can_prop: true},
    '}': {name: 'WATCH_TOGETHER', react: true, process: false, output: false, can_maybe: true, can_alias: true, can_prop: true},
    '#': {name: 'HOOK', react: false, process: true, output: true, can_maybe: false, can_alias: false, can_prop: false},
    '*': {name: 'METHOD', react: false, process: true, output: true, can_maybe: false, can_alias: false, can_prop: false},
    '%': {name: 'FILTER', react: false, process: true, output: false, can_maybe: false, can_alias: false, can_prop: false},
    '{': {name: 'WATCH_EACH', react: true, process: false, output: false, can_maybe: true, can_alias: true, can_prop: true},
    '~': {name: 'WATCH_SOME', react: true, process: false, output: false, can_maybe: true, can_alias: true, can_prop: true}

};

const wordModifiers = {

    ':': 'ALIAS',
    '?': 'MAYBE',
    '.': 'PROP'

};

function Phrase(cmd, content){

    this.content = content;
    this.cmd = cmd;
    this.words = [];

    if(cmd.name === 'HOOK')
        parseHook(this);
    else
        parseWords(this);

}

function Word(content){

    this.content = content;
    this.name = '';
    this.alias = '';
    this.maybe = false;
    this.args = [];

    parseSyllables(this);

}

function parseHook(phrase){

    const chunks = splitHookDelimiters(phrase.content);

    while(chunks.length) {

        const content = chunks.shift();
        phrase.words.push(content);

    }

}


function parseWords(phrase){

    const chunks = splitWordDelimiters(phrase.content);
    while(chunks.length) {

        const content = chunks.shift();
        const word = new Word(content);
        phrase.words.push(word);

    }

}

function parseSyllables(word){

    const chunks = splitSyllableDelimiters(word.content);

    let arg = null;

    if(chunks[0] === '.'){ // default as props, todo clean this while parse thing up :)
        arg = {name: 'props', maybe: false};
    }

    while(chunks.length) {

        const syllable = chunks.shift();
        const modifier = wordModifiers[syllable];

        if(!modifier && !arg){
            arg = {name: syllable, maybe: false};
        } else if(modifier === 'ALIAS' && chunks.length) {
            word.alias = chunks.shift();
            break;
        } else if(modifier === 'PROP' && chunks.length){
            if(arg)
                word.args.push(arg);
            arg = null;
        } else if(modifier === 'MAYBE' && arg){
            arg.maybe = true;
            word.args.push(arg);
            arg = null;
        }

    }

    if(arg)
        word.args.push(arg);

    // word name is first arg collected
    if(word.args.length){
        const firstArg = word.args.shift();
        word.name = firstArg.name;
        word.maybe = firstArg.maybe;
    }

    // default to last extracted property as alias if not specified
    if(word.args.length && !word.alias){
        const lastArg = word.args[word.args.length - 1];
        word.alias = lastArg.name;
    }

    word.alias = word.alias || word.name;


}

function parse(text){


    const phrases = [];
    const chunks = splitPhraseDelimiters(text);

    while(chunks.length){

        let chunk = chunks.shift();
        let cmd = phraseCmds[chunk];
        let content;

        if(!cmd && !phrases.length) { // default first cmd is WATCH_TOGETHER
            cmd = phraseCmds['}'];
            content = !phraseCmds[chunk] && chunk;
        } else if(cmd && chunks.length) {
            content = chunks.shift();
            content = !phraseCmds[content] && content;
        } else {
            // error, null content
        }

        const phrase = new Phrase(cmd, content);
        phrases.push(phrase);


    }

    return phrases;

}




function filterEmptyStrings(arr){

    let result = [];

    for(let i = 0; i < arr.length; i++){
        const c = arr[i].trim();
        if(c)
            result.push(c);
    }

    return result;

}


function splitPhraseDelimiters(text){

    let chunks = text.split(/([&>|@~*%#{}])/);
    return filterEmptyStrings(chunks);

}

function splitWordDelimiters(text){

    let chunks = text.split(',');
    return filterEmptyStrings(chunks);

}

function splitHookDelimiters(text){

    let chunks = text.split(' ');
    return filterEmptyStrings(chunks);

}

function splitSyllableDelimiters(text){

    let chunks = text.split(/([:?.])/);
    return filterEmptyStrings(chunks);

}



MeowParser.parse = parse;


export default MeowParser;

