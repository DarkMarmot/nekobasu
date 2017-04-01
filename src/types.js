
const ACTION   = 'action';
const MIRROR   = 'mirror';
const STATE    = 'state';
const COMPUTED = 'computed';
const NONE     = 'none';
const ANY      = 'any';

const VALID_TYPES = [ACTION, MIRROR, STATE, COMPUTED, NONE];
const VALID_CHECK    = new Map();

for(const type of VALID_TYPES){
    VALID_CHECK.set(type, true);
}

function isValid(type){
    return VALID_CHECK.has(type);
}

export {isValid, ANY, NONE, MIRROR, STATE, ACTION, COMPUTED, VALID_TYPES};

