
function isPrivate(name){
    return name[0] === '_';
}

function isAction(name){
    return name[0] === '$' || (isPrivate(name) && name[1] === '$');
}

export { isAction, isPrivate};

