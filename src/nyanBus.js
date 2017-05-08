import Stream from './stream.js';
import Nyan from './nyan.js';


function getPacketFromDataWord(scope, word){

    const data = scope.find(word.name, !word.maybe);
    return data && data.peek(word.topic);

}

function getSurveyFromDataWord(scope, word){

    const data = scope.find(word.name, !word.maybe);
    return data && data.survey();

}


function getDoRead(scope, phrase){

    const len = phrase.length;
    const firstWord = phrase[0];

    if(len > 1 || firstWord.monitor) { // if only reading word is a wildcard subscription then hash as well
        return getDoReadMultiple(scope, phrase);
    } else {
        return getDoReadSingle(scope, firstWord);
    }

}

function getDoAnd(scope, phrase) {

    return getDoReadMultiple(scope, phrase, true);

}


function getDoReadSingle(scope, word) {

    return function doReadSingle() {

        const packet = getPacketFromDataWord(scope, word);
        return packet && packet.msg;

    };

}


function getDoReadMultiple(scope, phrase, isAndOperation){


        const len = phrase.length;

        return function doReadMultiple(msg) {

            msg = (isAndOperation && msg) || {};

            for (let i = 0; i < len; i++) {
                const word = phrase[i];

                if(word.monitor){

                    const survey = getSurveyFromDataWord(scope, word);
                    for(const [key, value] of survey){
                        msg[key] = value;
                    }

                } else {

                    const packet = getPacketFromDataWord(scope, word);
                    const prop = word.monitor ? (word.alias || word.topic) : (word.alias || word.name);
                    if (packet)
                        msg[prop] = packet.msg;

                }

            }

            return msg;

        };

}




function applyReaction(scope, bus, phrase, context, node) {

    const subscribe = [];
    const follow = [];
    const read = [];
    const need = [];
    const must = [];

    for(let i = 0; i < phrase.length; i++){

        const word = phrase[i];
        const operation = word.operation;

        if(operation.subscribe)
            subscribe.push(word);
        if(operation.read)
            read.push(word);
        if(operation.follow)
            follow.push(word);
        if(operation.name === 'NEED')
            need.push(word);
        if(operation.name === 'MUST')
            must.push(word);

    }

    // convert nyan words to streams

    for(let i = 0; i < subscribe.length; i++){
        const word = subscribe[i];
        const data = scope.find(word.name, !word.maybe);
        if(word.monitor){
            subscribe[i] = Stream.fromMonitor(data, word.alias);
        } else {
            subscribe[i] = Stream.fromSubscribe(data, word.topic, word.alias);
        }
    }

    for(let i = 0; i < follow.length; i++){

        // todo, follow/monitor, blast all topics?
        const word = follow[i];
        const data = scope.find(word.name, !word.maybe);
        follow[i] = Stream.fromFollow(data);

    }

    const reactions = subscribe.concat(follow);

    bus.addFrame(reactions);

    if(reactions.length)
        bus.merge().group();

    if(need.length)
        bus.whenKeys(need.map(d => d.name));

    if(reactions.length)
        bus.batch();

    if(read.length)
        bus.msg(getMsg(scope, read)); // and mix

    if(must.length)
        bus.whenKeys(must.map(d => d.name));


}

function applyProcess(scope, bus, phrase, context, node) {

    const operation = phrase[0].operation.name; // same for all words in a process phrase

    if(operation === 'READ') {
        // todo get ! needs, whenKeys
        bus.msg(getDoRead(scope, phrase));
    } else if (operation === 'AND') {
        // todo get ! needs, whenKeys
        bus.msg(getDoAnd(scope, phrase));
    } else if (operation === 'FILTER') {
        applyFilterProcess(bus, phrase, context);
    } else if (operation === 'RUN') {
        applyRunProcess(scope, phrase, context);
    } else if (operation === 'WRITE') {

    } else if (operation === 'SPRAY') {
        // alias to target data points of different names, i.e. < cat(dog), meow(bunny)
    }

}


function applyRunProcess(bus, phrase, context){

    const len = phrase.length;

    for(let i = 0; i < len; i++) {

        const word = phrase[i];
        const name = word.name;
        const method = context[name];

        const f = function (msg, source, topic) {
            return method.call(context, msg, source, topic);
        };

        bus.run(f);

    }

}


function applyFilterProcess(bus, phrase, context){

    const len = phrase.length;

    for(let i = 0; i < len; i++) {

        const word = phrase[i];
        const name = word.name;
        const method = context[name];

        const f = function (msg, source, topic) {
            return method.call(context, msg, source, topic);
        };

        bus.filter(f);

    }

}


function applyNyan(scope, bus, str, context, node){

    const nyan = Nyan.parse(str);
    const len = nyan.length;

    for(let i = 0; i < len; i++){

        const cmd = nyan[i];
        const name = cmd.name;
        const phrase = cmd.phrase;

        if(name === 'FORK'){
            bus = bus.fork();
        } else if (name === 'BACK'){
            bus = bus.back();
        } else {

            if(name === 'PROCESS')
                applyProcess(scope, bus, phrase, context, node);
            else // name === 'REACT'
                applyReaction(scope, bus, phrase, context, node);

        }
    }

    return bus;

}