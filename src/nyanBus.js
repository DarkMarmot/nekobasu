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


function getFollowStream(scope, word) {

    const data = scope.find(word.name, !word.maybe);
    return Stream.fromFollow(data, word.topic, word.alias);

}

function getSubscribeStream(scope, word) {

    const data = scope.find(word.name, !word.maybe);
    if(word.monitor){
        return Stream.fromMonitor(data, word.alias);
    } else {
        return Stream.fromSubscribe(data, word.topic, word.alias);
    }

}

function getEventStream(scope, word, node){

    return Stream.fromEvent(node, word.topic, word.useCapture, word.alias);

}

function getNeedsArray(phrase){
    return phrase.filter(word => word.operation.need).map(word => word.alias);
}


function applyReaction(scope, bus, phrase, context, node) {

    const need = [];
    const streams = [];


    if(phrase.length === 1 && phrase[0].operation.name === 'ACTION'){
        bus.addFrame(getSubscribeStream(scope, phrase[0]));
        return;
    }

    for(let i = 0; i < phrase.length; i++){

        const word = phrase[i];
        const operation = word.operation.name;

        if(operation === 'WATCH')
            streams.push(getFollowStream(scope, word));
        else if(operation === 'EVENT')
            streams.push(getEventStream(scope, word));

        if(word.need)
            need.push(word);

    }


    bus.addFrame(streams);

    if(streams.length > 1) {

        bus.merge().group().batch();

        if(need.length)
            bus.whenKeys(need.map(d => d.name)); // todo is alias here?

    }


}

function applyProcess(scope, bus, phrase, context, node) {

    const operation = phrase[0].operation.name; // same for all words in a process phrase

    if(operation === 'READ') {
        bus.msg(getDoRead(scope, phrase));
        bus.whenKeys(getNeedsArray(phrase));
    } else if (operation === 'AND') {
        bus.msg(getDoAnd(scope, phrase));
        bus.whenKeys(getNeedsArray(phrase));
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