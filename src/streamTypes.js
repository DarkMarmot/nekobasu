
const STREAM_TYPES = {

    PASS:      'pass',
    GROUP:     'group',
    HOLD:      'hold',
    TRANSFORM: 'transform',
    MSG:       'msg',
    SOURCE:    'source',
    TOPIC:     'topic',
    DELAY:     'delay',
    FILTER:    'filter',
    RUN:       'run'

};

function isValid(type){
    return STREAM_TYPES.hasOwnProperty(type);
}


export {STREAM_TYPES as default, isValid};

