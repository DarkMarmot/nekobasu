

const DATA_TYPES = {

    ACTION:   'action',
    MIRROR:   'mirror',
    STATE:    'state',
    COMPUTED: 'computed',
    NONE:     'none',
    ANY:      'any'

};

const reverseLookup = {};

for(const p in DATA_TYPES){
    const v = DATA_TYPES[p];
    reverseLookup[v] = p;
}

function isValid(type){
    return reverseLookup.hasOwnProperty(type);
}


export { DATA_TYPES, isValid};

